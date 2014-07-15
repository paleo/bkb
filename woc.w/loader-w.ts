/// <reference path="loader.ts" />
'use strict';

module woc {

	// ##
	// ## WLoader
	// ##

	export class WLoader {
		private ajax: woc.Ajax;
		private thingDoneCallback: Function;
		private failCallback: Function;
		private thingLoadCount = 0;
		private waitedPreloads = 0;
		private waitedBundleConf = 0;
		private embedBundleList = [];

		constructor(private libraries: Libraries, private services: Services, private components: Components,
				private bundles: Bundles, private loader: Loader, private bundlePath: string, private bundleUrl: string,
				version: string, doneCallback: Function, failCallback: Function) {
			this.ajax = this.services.get('woc.Ajax');
			var doneReported = false;
			this.thingDoneCallback = (decCount = true) => {
				if (decCount)
					--this.thingLoadCount;
				if (this.thingLoadCount > 0)
					return;
				if (doneReported)
					throw new Error('Bug when loading bundle ("w" mode) "' + this.bundlePath + '": done already reported');
				doneReported = true;
				if (this.embedBundleList.length === 0)
					throw new Error('Empty bundle');
				var bundleConf = this.embedBundleList[0]['conf'];
				if (bundleConf['version'] && version && bundleConf['version'] !== version)
					throw new Error('Conflict in bundle version, attempted "' + version + '" doesn\'nt match with current "' + bundleConf['version'] + '"');
				this.bundles.register(this.bundlePath, this.bundleUrl, null, null, bundleConf['main']);
				if (doneCallback)
					doneCallback();
			};
			var failReported = false;
			this.failCallback = () => {
				if (failReported)
					return;
				failReported = true;
				if (failCallback)
					failCallback();
			};
		}

		// --
		// -- Public
		// --

		public loadWBundle() {
			this.doLoadWBundle(this.bundlePath, this.bundleUrl);
		}

		// --
		// -- Internal
		// --

		static addScriptElement(url, cb, services: Services) {
			var ready = () => {
				if (cb) {
					try {
						cb();
					} catch (err) {
						services.get('woc.Log').unexpectedErr(err);
					}
					cb = null;
				}
			};
			var head = document.head || document.getElementsByTagName('head')[0];
			var script = document.createElement('script');
			script.onreadystatechange = function () {
				if (this.readyState === 'complete')
					ready();
			};
			script.onload = ready;
			script.src = url;
			head.appendChild(script);
		}

		// --
		// -- Private - Embed bundles
		// --

		private doLoadWBundle(bundlePath, bundleUrl) {
			var preloadDone = () => {
				--this.waitedPreloads;
				this.loadAllEmbedBundles();
			};
			++this.waitedBundleConf;
			this.ajax.get({
				'url': bundleUrl + '/bundle.json',
				'done': (bundleConf) => {
					this.embedBundleList.push({
						'path': bundlePath,
						'url': bundleUrl,
						'conf': bundleConf
					});
					--this.waitedBundleConf;
					this.loadEmbedBundlesConf(bundlePath, bundleUrl, bundleConf);
					if (bundleConf['preload']) {
						++this.waitedPreloads;
						this.loader.loadBundles(bundleConf['preload'], preloadDone, this.failCallback, false);
					} else
						this.loadAllEmbedBundles();
				},
				'fail': this.failCallback
			});
		}

		private loadEmbedBundlesConf(bundlePath, bundleUrl, bundleConf) {
			var embed = bundleConf['embed'];
			if (embed === undefined)
				return;
			var dir;
			for (var i = 0, len = embed.length; i < len; ++i) {
				dir = embed[i];
				if (WLoader.getType(dir) === 'BW')
					this.doLoadWBundle(bundlePath + '/' + dir, bundleUrl + '/' + dir);
			}
		}

		private loadAllEmbedBundles() {
			if (this.waitedPreloads > 0 || this.waitedBundleConf > 0)
				return;
			this.loadAllWConf();
		}

		// --
		// -- Private - Libraries, Services, Components
		// --

		private loadAllWConf() {
			// - Make thingPropList
			var thingPropList = [], bundleReqLibSet = {}, bundleScripts = [], bundleCss = [], encoding = undefined;
			var i, len, j, lenJ, embed, reqLib, dir, type, bundleProp;
			for (i = 0, len = this.embedBundleList.length; i < len; ++i) {
				bundleProp = this.embedBundleList[i];
				embed = bundleProp['conf']['embed'];
				if (embed !== undefined) {
					for (j = 0, lenJ = embed.length; j < lenJ; ++j) {
						dir = embed[j];
						type = WLoader.getType(dir);
						if (type !== 'BW') {
							thingPropList.push({
								'type': type,
								'path': dir,
								'confUrl': bundleProp['url'] + '/' + dir + '/' + WLoader.getConfFileName(type),
								'bundleUrl': bundleProp['url'],
								'bundlePath': bundleProp['path'],
								'bundleConf': bundleProp['conf'],
								'conf': null
							});
						}
					}
				}
				if (encoding === undefined)
					encoding = bundleProp['conf']['encoding'];
				else if (bundleProp['conf']['encoding'] !== undefined && encoding !== bundleProp['conf']['encoding'])
					throw new Error('Encoding conflict with embed bundles: "' + encoding + '" doesn\'t match with "' + bundleProp['conf']['encoding'] + '"');
				reqLib = bundleProp['conf']['requireLib'];
				if (reqLib !== undefined) {
					for (j = 0, lenJ = reqLib.length; j < lenJ; ++j)
						bundleReqLibSet[reqLib[j]] = true;
				}
				if (bundleProp['conf']['script'] !== undefined)
					bundleScripts.push([bundleProp['url'], WLoader.toFileList(bundleProp['conf']['script'])]);
				if (bundleProp['conf']['css'] !== undefined)
					bundleCss.push([bundleProp['url'], bundleProp['conf']['css']]);
			}
			// - Make mergedBundleProp
			var bundleReqLibList = [];
			for (var libName in bundleReqLibSet) {
				if (bundleReqLibSet.hasOwnProperty(libName))
					bundleReqLibList.push(libName);
			}
			var mergedBundleProp = {
				'encoding': encoding,
				'requireLib': bundleReqLibList,
				'scriptsArr': bundleScripts,
				'cssArr': bundleCss
			};
			// - Case of empty bundle
			if (thingPropList.length === 0) {
				this.includeLibs(thingPropList, mergedBundleProp);
				this.thingDoneCallback(false);
				return;
			}
			// - Make ajax optList
			var optList = [];
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				optList.push({
					'method': 'GET',
					'url': thingPropList[i]['confUrl']
				});
			}
			// - Load all
			++this.thingLoadCount;
			this.ajax.bundleAjax({
				'urls': optList,
				'done': (rDataMap) => {
					this.populateThingPropConf(thingPropList, rDataMap);
					var libScriptsLoader = this.includeLibs(thingPropList, mergedBundleProp);
					this.loadAllWDataPart1(thingPropList, mergedBundleProp, libScriptsLoader);
					this.thingDoneCallback();
				},
				'fail': this.failCallback
			});
		}

		private populateThingPropConf(thingPropList, rDataMap) {
			var conf;
			for (var i = 0, len = thingPropList.length; i < len; ++i) {
				conf = rDataMap[thingPropList[i]['confUrl']];
				if (conf === undefined)
					throw new Error('Missing conf for "' + thingPropList[i]['path'] + '"');
				thingPropList[i]['conf'] = conf;
			}
		}

		private includeLibs(thingPropList, mergedBundleProp): WLibScriptsLoader {
			var libScriptsLoader = new WLibScriptsLoader(this.libraries, this.services);
			// - Add into the lib loader
			var includedLibNames = {}, prop, conf, url;
			for (var i = 0, len = thingPropList.length; i < len; ++i) {
				prop = thingPropList[i];
				conf = prop['conf'];
				if (prop['type'] === 'L') {
					url = prop['bundleUrl'] + '/' + prop['path'];
					libScriptsLoader.add(conf['name'], url, WLoader.toFileList(conf['script']), conf['requireLib']);
					includedLibNames[conf['name']] = true;
				}
			}
			// - Include lib from other bundles
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				if (conf['requireLib'])
					this.requireAllLib(conf['requireLib'], includedLibNames);
			}
			this.requireAllLib(mergedBundleProp['requireLib'], includedLibNames);
			return libScriptsLoader;
		}

		private requireAllLib(arr: string[], includedLibNames: {}) {
			for (var i = 0, len = arr.length; i < len; ++i) {
				if (!includedLibNames[arr[i]] && !this.libraries.load(arr[i], false))
					throw new Error('In bundle "' + this.bundlePath + '", unknown library "' + arr[i] + '"');
			}
		}

		private loadAllWDataPart1(thingPropList, mergedBundleProp, libScriptsLoader: WLibScriptsLoader) {
			var i: number, len, scriptsToLoad = [], arr;
			// - Merged bundle - scripts
			arr = mergedBundleProp['scriptsArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					scriptsToLoad.push(arr[i]);
			}
			// - Merged bundle - css
			arr = mergedBundleProp['cssArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					WLoader.addCssLinkElements(arr[i][0], arr[i][1]);
			}
			// - Embed things
			var listsByTypes = {'S': [], 'C': [], 'L': []};
			var confUrl, path, embedUrl, conf, type, encoding = mergedBundleProp['encoding'];
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				path = thingPropList[i]['path'];
				confUrl = thingPropList[i]['confUrl'];
				type = thingPropList[i]['type'];
				conf = thingPropList[i]['conf'];
				if (conf['encoding'] !== undefined && encoding !== undefined && conf['encoding'] !== encoding)
					throw new Error('Encoding conflict in bundle "' + this.bundlePath + '" (' + encoding + '): embed "' + path + '" has ' + conf['encoding']);
				embedUrl = thingPropList[i]['bundleUrl'] + '/' + path;
				switch(type) {
					case 'L':
						if (conf['css'] !== undefined)
							WLoader.addCssLinkElements(embedUrl, WLoader.toFileList(conf['css']));
						listsByTypes[type].push({
							'name': conf['name']
						});
						break;
					case 'S':
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoader.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'alias': conf['alias']
						});
						break;
					case 'C':
						if (conf['css'] !== undefined)
							WLoader.addCssLinkElements(embedUrl, WLoader.toFileList(conf['css']));
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoader.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'tpl': WLoader.toFileList(conf['tpl'])
						});
						break;
					default:
						throw new Error('Bad embed type "' + type + '"');
				}
			}
			// - End
			this.loadAllWDataPart2(scriptsToLoad, listsByTypes, libScriptsLoader);
		}

		private loadAllWDataPart2(scriptsToLoad, listsByTypes, libScriptsLoader: WLibScriptsLoader) {
			var i: number, len: number, j: number, jLen: number, fileNames;
			// - Try to end function
			var oScriptsLoaded = false, lScriptsLoaded = false, ajaxEnded = false, tplRDataMap = null, endDone = false;
			var tryToEnd = (decCount: boolean) => {
				if (endDone) {
				}
				if (lScriptsLoaded && oScriptsLoaded && ajaxEnded) {
					this.registerAllWLibraries(listsByTypes['L']);
					this.registerAllWServices(listsByTypes['S']);
					this.registerAllWComponents(listsByTypes['C'], tplRDataMap);
					endDone = true;
				}
				this.thingDoneCallback(decCount);
			};
			// - Load lib scripts
			++this.thingLoadCount;
			libScriptsLoader.loadAll(() => {
				lScriptsLoaded = true;
				tryToEnd(true);
			});
			// - Load other scripts
			if (scriptsToLoad.length === 0)
				oScriptsLoaded = true;
			else {
				var scriptUrlList = [], group, baseUrl;
				for (i = 0, len = scriptsToLoad.length; i < len; ++i) {
					group = scriptsToLoad[i];
					baseUrl = group[0];
					fileNames = group[1];
					for (j = 0, jLen = fileNames.length; j < jLen; ++j)
						scriptUrlList.push(baseUrl + '/' + fileNames[j]);
				}
				++this.thingLoadCount;
				this.addScriptElements(scriptUrlList, () => {
					oScriptsLoaded = true;
					tryToEnd(true);
				});
			}
			// - Make optList for templates
			var optList = [], prop;
			for (i = 0, len = listsByTypes['C'].length; i < len; ++i) {
				prop = listsByTypes['C'][i];
				fileNames = prop['tpl'];
				if (fileNames) {
					for (j = 0, jLen = fileNames.length; j < jLen; ++j) {
						optList.push({
							'method': 'GET',
							'url': prop['baseUrl'] + '/' + fileNames[j],
							'rDataType': 'text'
						});
					}
				}
			}
			// - Load all templates
			if (optList.length === 0)
				ajaxEnded = true;
			else {
				++this.thingLoadCount;
				this.ajax.bundleAjax({
					'urls': optList,
					'done': (rDataMap) => {
						ajaxEnded = true;
						tplRDataMap = rDataMap;
						tryToEnd(true);
					},
					'fail': this.failCallback
				});
			}
			tryToEnd(false);
		}

		private registerAllWLibraries(lList) {
			var prop;
			for (var i = 0, len = lList.length; i < len; ++i) {
				prop = lList[i];
				this.libraries.register(prop['name'], null, null);
			}
		}

		private registerAllWServices(sList) {
			var prop;
			for (var i = 0, len = sList.length; i < len; ++i) {
				prop = sList[i];
				this.services.register(prop['name'], prop['baseUrl'], prop['alias'], null, null);
			}
		}

		private registerAllWComponents(cList, rDataMap) {
			var prop;
			for (var i = 0, len = cList.length; i < len; ++i) {
				prop = cList[i];
				this.registerWComponent(prop, rDataMap);
			}
		}

		private registerWComponent(prop, rDataMap) {
			var baseUrl = prop['baseUrl'], fileNames = prop['tpl'], html;
			if (fileNames === undefined)
				html = null;
			else {
				html = '';
				if (!rDataMap)
					rDataMap = {};
				var fUrl;
				for (var i = 0, len = fileNames.length; i < len; ++i) {
					fUrl = baseUrl + '/' + fileNames[i];
					if (rDataMap[fUrl] === undefined)
						throw new Error('Missing content for template "' + fUrl + '"');
					html += rDataMap[fUrl];
				}
				if (html === '')
					html = null;
			}
			this.components.register(prop['name'], baseUrl, null, null, html);
		}

		// --
		// -- Private - Tools
		// --

		private static getType(dir: string) {
			var last = dir.length - 1;
			if (last <= 2 || dir[last - 1] !== '.')
				throw new Error('Invalid embed "' + dir + '"');
			switch(dir[last]) {
				case 's':
					return 'S';
				case 'c':
					return 'C';
				case 'l':
					return 'L';
				case 'w':
					return 'BW';
				default:
					throw new Error('Invalid embed "' + dir + '"');
			}
		}

		private static getConfFileName(type: string) {
			switch(type) {
				case 'S':
					return 'serv.json';
				case 'C':
					return 'comp.json';
				case 'L':
					return 'lib.json';
				default:
					throw new Error('Invalid conf file type "' + type + '"');
			}
		}

		private addScriptElements(urlList, cb) {
			var waitedLoads = urlList.length;
			if (waitedLoads === 0) {
				cb();
				return;
			}
			for (var i = 0, len = urlList.length; i < len; ++i) {
				WLoader.addScriptElement(urlList[i], () => {
					--waitedLoads;
					if (waitedLoads === 0)
						cb();
				}, this.services);
			}
		}

		private static addCssLinkElements(baseUrl, fileNames) {
			for (var i = 0, len = fileNames.length; i < len; ++i)
				Loader.addCssLinkElement(baseUrl, fileNames[i]);
		}

		private static toFileList(script: any): string[] {
			return script ? (typeof script === 'string' ? [script] : script) : [];
		}
	}

	// ##
	// ## WLibScriptsLoader
	// ##

	export class WLibScriptsLoader {

		private lib = {};
		private cb: Function;
		private scripts: {};
		private done: {};
		private loadingCount = 0;

		constructor(private libraries: Libraries, private services: Services) {
		}

		public add(libName: string, baseUrl: string, fileNameList: any, requireLib: string[]) {
			this.lib[libName] = {
				'baseUrl': baseUrl,
				'fileNameList': fileNameList,
				'requireLib': requireLib,
				'lastScript': fileNameList.length === 0 ? null : baseUrl + '/' + fileNameList[fileNameList.length - 1]
			};
		}

		public loadAll(cb: Function) {
			this.cb = cb;
			this.initScripts();
			this.loadReadyScripts();
		}

		private loadReadyScripts() {
			var notLoaded = [];
			for (var url in this.scripts) {
				if (!this.scripts.hasOwnProperty(url) || this.done[url] !== undefined)
					continue;
				notLoaded.push(url);
				if (this.areAllDone(this.scripts[url]))
					this.addScriptElement(url);
			}
			if (this.loadingCount === 0) {
				if (notLoaded.length > 0)
					throw new Error('Cannot load libraries (missing dependencies or loop?): ' + notLoaded.join(', '));
				if (!this.cb)
					throw new Error('WLibScriptsLoader has already ended');
				this.cb();
				this.cb = null;
			}
		}

		private addScriptElement(url) {
			++this.loadingCount;
			this.done[url] = false;
			WLoader.addScriptElement(url, () => {
				--this.loadingCount;
				this.done[url] = true;
				this.loadReadyScripts();
			}, this.services);
		}

		private areAllDone(requireScripts: string[]): boolean {
			for (var i = 0, len = requireScripts.length; i < len; ++i) {
				if (!this.done[requireScripts[i]])
					return false;
			}
			return true;
		}

		private initScripts() {
			this.scripts = {};
			this.done = {};
			var fileNameList, baseUrl, requireScripts, url, i, len;
			for (var libName in this.lib) {
				if (!this.lib.hasOwnProperty(libName))
					continue;
				fileNameList = this.lib[libName]['fileNameList'];
				baseUrl = this.lib[libName]['baseUrl'];
				requireScripts = this.toRequireScripts(this.lib[libName]['requireLib']);
				for (i = 0, len = fileNameList.length; i < len; ++i) {
					url = baseUrl + '/' + fileNameList[i];
					this.scripts[url] = requireScripts;
					requireScripts = [url];
				}
			}
		}

		private toRequireScripts(requireLib: string[]): string[] {
			if (!requireLib)
				return [];
			var lib, scripts = [];
			for (var i = 0, len = requireLib.length; i < len; ++i) {
				if (this.libraries.load(requireLib[i], false))
					continue;
				lib = this.lib[requireLib[i]];
				if (lib === undefined)
					throw new Error('The required library "' + requireLib[i] + '" is not found');
				if (lib['lastScript'])
					scripts.push(lib['lastScript']);
			}
			return scripts;
		}
	}
}
