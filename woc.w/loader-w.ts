/// <reference path="loader.ts" />
'use strict';

module woc {

	// ##
	// ## WLoader
	// ##

	interface WBundleProp {
		path: string;
		url: string;
		conf: {};
	}
	enum EmbedType {
		Component, Library, Service, Bundle
	}

	export class WLoader {

		// --
		// -- Initialisation
		// --

		private ajax: woc.Ajax;
		private embedBundleList: WBundleProp[] = [];
		private preloads: Promise<void>[] = [];

		constructor(private libraries: Libraries, private services: Services, private components: Components, private bundles: Bundles,
								private loader: Loader, private bundlePath: string, private bundleUrl: string, private version: string) {
			this.ajax = this.services.get('woc.Ajax');
		}

		// --
		// -- Public
		// --

		public loadWBundle(): Promise<void> {
			return this.loadBundleConfRecursive(this.bundlePath, this.bundleUrl).then(() => {
				return Promise.all(this.preloads);
			}).then(() => {
				var lsc = new WLoaderLSC(this.embedBundleList);
				return lsc.loadAll();
			}).then((prop: WBundleProp) => {
				var conf = prop['conf'];
				if (conf['version'] && this.version && conf['version'] !== this.version)
					throw Error('Conflict in bundle version, attempted "' + this.version + '" doesn\'nt match with current "' + conf['version'] + '"');
				this.bundles.register(this.bundlePath, this.bundleUrl, null, null, conf['main']);
			});
		}

		// --
		// -- Private - Embed bundles
		// --

		private loadBundleConfRecursive(bundlePath, bundleUrl): Promise<void> {
			return this.ajax.get(bundleUrl + '/bundle.json').then((bundleConf) => {
				if (bundleConf['preload']) {
					Array.prototype.push.apply(this.preloads, bundleConf['preload'].map((bp) => {
						return this.loader.loadBundle(bp, null, null, false, false);
					}));
				}
				this.embedBundleList.push({
					path: bundlePath,
					url: bundleUrl,
					conf: bundleConf
				});
				if (bundleConf['embed'] !== undefined) {
					return Promise.all(bundleConf['embed'].map((dir) => {
						if (WLoaderLSC.getType(dir) === EmbedType.Bundle)
							return this.loadBundleConfRecursive(bundlePath + '/' + dir, bundleUrl + '/' + dir);
						return null;
					}));
				}
			});
		}
	}
	
	// ##
	// ## WLoaderLibServComp
	// ##

	class WLoaderLSC {
		
		private scriptLoader: WScriptLoader;
		private cssLoader: WCssLoader;
		private tplLoader: WTplLoader;
		private mergedBundleProp: {};
		private thingList: {}[];

		constructor(libraries: Libraries, services: Services, components: Components, private ajax: woc.Ajax,
								private bundlePath: string, private embedBundleList: WBundleProp[] = []) {
			this.scriptLoader = new WScriptLoader(libraries);
			this.cssLoader = new WCssLoader();
			this.tplLoader = new WTplLoader(ajax);
			this.initMergedBundleProp();
			this.initThingList();
		}

		public loadAll(): Promise<void> {
			return Promise.all(this.thingList.map((prop) => {
				return this.ajax.get(prop['confUrl']);
			})).then((confList) => {
				this.fillThingLoaders(confList);
				this.loadAllWDataPart1();
			});
		}

		private fillThingLoaders(confList: {}[]): Promise<void> {
			// - Fill loaders
			var prop, conf;
			for (var i = 0, len = this.thingList.length; i < len; ++i) {
				prop = this.thingList[i];
				conf = confList[i];
				switch(prop['type']) {
					case EmbedType.Library:
						this.libLoader.add(prop, conf);
						break;
					case EmbedType.Service:
						this.servLoader.add(prop, conf);
						break;
					case EmbedType.Component:
						this.compLoader.add(prop, conf);
						break;
					default:
						throw Error('Bad embed type "' + prop['type'] + '"');
				}
			}
			// - Check required libraries
			for (var i = 0, len = confList.length; i < len; ++i) {
				conf = confList[i];
				if (conf['requireLib'])
					this.libLoader.requireAllLib(conf['requireLib']);
			}
			this.libLoader.requireAllLib(this.mergedBundleProp['requireLib']);
		}

		
		
		private initMergedBundleProp() {
			var j, lenJ, reqLib, bundleProp, reqLibSet = {}, bundleScripts = [], cssList = [], encoding = null;
			for (var i = 0, len = this.embedBundleList.length; i < len; ++i) {
				bundleProp = this.embedBundleList[i];
				if (!encoding)
					encoding = bundleProp.conf['encoding'];
				else if (bundleProp.conf['encoding'] && encoding !== bundleProp.conf['encoding'])
					throw Error('Encoding conflict with embed bundles: "' + encoding + '" doesn\'t match with "' + bundleProp.conf['encoding'] + '"');
				reqLib = bundleProp.conf['requireLib'];
				if (reqLib !== undefined) {
					for (j = 0, lenJ = reqLib.length; j < lenJ; ++j)
						reqLibSet[reqLib[j]] = true;
				}
				if (bundleProp.conf['script'] !== undefined)
					bundleScripts.push([bundleProp.url, WLoaderLSC.toFileList(bundleProp.conf['script'])]);
				if (bundleProp.conf['css'] !== undefined)
					cssList.push([bundleProp.url, bundleProp.conf['css']]);
			}
			var reqLibList = [];
			for (var libName in reqLibSet) {
				if (reqLibSet.hasOwnProperty(libName))
					reqLibList.push(libName);
			}
			this.mergedBundleProp = {
				'encoding': encoding,
				'requireLib': reqLibList,
				'scriptsArr': bundleScripts,
				'cssArr': cssList
			};
		}

		private initThingList() {
			this.thingList = [];
			var j, lenJ, embed, dir, url, type, bundleProp;
			for (var i = 0, len = this.embedBundleList.length; i < len; ++i) {
				bundleProp = this.embedBundleList[i];
				embed = bundleProp.conf['embed'];
				if (embed === undefined)
					continue;
				for (j = 0, lenJ = embed.length; j < lenJ; ++j) {
					dir = embed[j];
					type = WLoaderLSC.getType(dir);
					if (type === EmbedType.Bundle)
						continue;
					url = bundleProp.url + '/' + dir;
					this.thingList.push({
						'type': type,
						'path': dir,
						'url': url,
						'confUrl': url + '/' + WLoaderLSC.getConfFileName(type),
						'bundleUrl': bundleProp.url,
						'bundlePath': bundleProp.path,
						'bundleConf': bundleProp.conf,
						'conf': null
					});
				}
			}
		}


		private loadAllWDataPart1() {
			var i: number, len, scriptsToLoad = [], arr;
			// - Merged bundle - scripts
			arr = this.mergedBundleProp['scriptsArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					scriptsToLoad.push(arr[i]);
			}
			// - Merged bundle - css
			arr = this.mergedBundleProp['cssArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					WLoaderLSC.addCssLinkElements(arr[i][0], arr[i][1]);
			}
			// - Embed things
			var listsByTypes = {'S': [], 'C': [], 'L': []};
			var confUrl, path, embedUrl, conf, type, encoding = this.mergedBundleProp['encoding'];
			for (i = 0, len = this.thingList.length; i < len; ++i) {
				path = this.thingList[i]['path'];
				confUrl = this.thingList[i]['confUrl'];
				type = this.thingList[i]['type'];
				conf = this.thingList[i]['conf'];
				if (conf['encoding'] !== undefined && encoding !== undefined && conf['encoding'] !== encoding)
					throw Error('Encoding conflict in bundle "' + this.bundlePath + '" (' + encoding + '): embed "' + path + '" has ' + conf['encoding']);
				embedUrl = this.thingList[i]['bundleUrl'] + '/' + path;
				switch(type) {
					case EmbedType.Library:
						if (conf['css'] !== undefined)
							WLoaderLSC.addCssLinkElements(embedUrl, WLoaderLSC.toFileList(conf['css']));
						listsByTypes[type].push({
							'name': conf['name']
						});
						break;
					case EmbedType.Service:
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoaderLSC.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'alias': conf['alias']
						});
						break;
					case EmbedType.Component:
						if (conf['css'] !== undefined)
							WLoaderLSC.addCssLinkElements(embedUrl, WLoaderLSC.toFileList(conf['css']));
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoaderLSC.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'tpl': WLoaderLSC.toFileList(conf['tpl'])
						});
						break;
					default:
						throw Error('Bad embed type "' + type + '"');
				}
			}
			// - End
			this.loadAllWDataPart2(scriptsToLoad, listsByTypes, libLoader);
		}

		private loadAllWDataPart2(scriptsToLoad, listsByTypes, libLoader: WLibLoader) {
			var i: number, len: number, j: number, jLen: number, fileNames;
			// - Try to end function
			var oScriptsLoaded = false, lScriptsLoaded = false, ajaxEnded = false, tplRDataMap = null, endDone = false;
			var tryToEnd = (decCount: boolean) => {
				if (endDone) {
				}
				if (lScriptsLoaded && oScriptsLoaded && ajaxEnded) {
					this.registerAllWLibraries(listsByTypes[EmbedType.Library]);
					this.registerAllWServices(listsByTypes[EmbedType.Service]);
					this.registerAllWComponents(listsByTypes[EmbedType.Component], tplRDataMap);
					endDone = true;
				}
				this.thingDoneCallback(decCount);
			};
			// - Load lib scripts
			++this.thingLoadCount;
			libLoader.loadAll(() => {
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
			for (i = 0, len = listsByTypes[EmbedType.Component].length; i < len; ++i) {
				prop = listsByTypes[EmbedType.Component][i];
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

		// --
		// -- Private - Tools
		// --

		static getType(dir: string) {
			var last = dir.length - 1;
			if (last <= 2 || dir[last - 1] !== '.')
				throw Error('Invalid embed "' + dir + '"');
			switch(dir[last]) {
				case 's':
					return EmbedType.Service;
				case 'c':
					return EmbedType.Component;
				case 'l':
					return EmbedType.Library;
				case 'w':
					return EmbedType.Bundle;
				default:
					throw Error('Invalid embed "' + dir + '"');
			}
		}

		private static getConfFileName(type: string) {
			switch(type) {
				case EmbedType.Service:
					return 'serv.json';
				case EmbedType.Component:
					return 'comp.json';
				case EmbedType.Library:
					return 'lib.json';
				default:
					throw Error('Invalid conf file type "' + type + '"');
			}
		}

		private addScriptElements(urlList, cb) {
			var waitedLoads = urlList.length;
			if (waitedLoads === 0) {
				cb();
				return;
			}
			for (var i = 0, len = urlList.length; i < len; ++i) {
				WLoaderLSC.addScriptElement(urlList[i], () => {
					--waitedLoads;
					if (waitedLoads === 0)
						cb();
				}, this.services);
			}
		}

		private static addCssLinkElements(baseUrl, fileNames): Promise<void> {
			for (var i = 0, len = fileNames.length; i < len; ++i)
				Loader.addCssLinkToDOM(baseUrl, fileNames[i]);
		}

		public static toFileList(script: any): string[] {
			return script ? (typeof script === 'string' ? [script] : script) : [];
		}
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// ##
	// ## WLibLoader
	// ##

	class WLibLoader {

		private libMap = {};
		private cb: Function;
		private scripts: {};
		private done: {};
		private loadingCount = 0;

		constructor(private libraries: Libraries, private services: Services) {
		}

		public add(prop, conf) {
			this.libMap[conf['name']] = {
				'baseUrl': prop['url'],
				'fileNameList': WLoaderLSC.toFileList(conf['script']),
				'requireLib': conf['requireLib']
			};
		}
		
		public requireAllLib(libNames: string[]): void {
			var l;
			for (var i = 0, len = libNames.length; i < len; ++i) {
				l = libNames[i];
				if (this.libMap[l] === undefined && this.libraries.load(l, false))
					throw Error('Cannot find the required library "' + l + '"');
			}
		}

		public loadAll(): Promise<void> {
			this.cb = cb;
			this.initScripts();
			this.loadReadyScripts();
		}

		public registerAll() {
			var prop;
			for (var i = 0, len = lList.length; i < len; ++i) {
				prop = lList[i];
				this.libraries.register(prop['name'], null, null);
			}
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
					throw Error('Cannot load libraries (missing dependencies or loop?): ' + notLoaded.join(', '));
				if (!this.cb)
					throw Error('WLibScriptsLoader has already ended');
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
			for (var libName in this.libMap) {
				if (!this.libMap.hasOwnProperty(libName))
					continue;
				fileNameList = this.libMap[libName]['fileNameList'];
				baseUrl = this.libMap[libName]['baseUrl'];
				requireScripts = this.toRequireScripts(this.libMap[libName]['requireLib']);
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
				lib = this.libMap[requireLib[i]];
				if (lib === undefined)
					throw Error('The required library "' + requireLib[i] + '" is not found');
				if (lib['lastScript'])
					scripts.push(lib['lastScript']);
			}
			return scripts;
		}
	}

	// ##
	// ## WServLoader
	// ##

	class WServLoader {
		private servMap = {};

		constructor(private services: Services) {
		}

		public add(prop, conf) {
			this.servMap[servName] = {
				'baseUrl': baseUrl,
				'fileNameList': fileNameList,
				'lastScript': fileNameList.length === 0 ? null : baseUrl + '/' + fileNameList[fileNameList.length - 1]
			};
		}

		public loadAll(): Promise<void> {
		}

		public registerAll() {
			var prop;
			for (var i = 0, len = sList.length; i < len; ++i) {
				prop = sList[i];
				this.services.register(prop['name'], prop['baseUrl'], prop['alias'], null, null);
			}
		}
	}

	// ##
	// ## WCompLoader
	// ##

	class WCompLoader {
		private compMap = {};

		constructor(private components: Components) {
		}

		public add(prop, conf) {
			this.compMap[compName] = {
				'baseUrl': baseUrl,
				'fileNameList': fileNameList,
				'lastScript': fileNameList.length === 0 ? null : baseUrl + '/' + fileNameList[fileNameList.length - 1]
			};
		}

		public loadAll(): Promise<void> {
		}

		public registerAll() {
			var prop;
			for (var i = 0, len = cList.length; i < len; ++i) {
				prop = cList[i];
				this.registerWComponent(prop, rDataMap);
			}
		}

		private registerWComponent(prop, tplDataMap) {
			var baseUrl = prop['baseUrl'], fileNames = prop['tpl'], html;
			if (fileNames === undefined)
				html = null;
			else {
				html = '';
				if (!tplDataMap)
					tplDataMap = {};
				var fUrl;
				for (var i = 0, len = fileNames.length; i < len; ++i) {
					fUrl = baseUrl + '/' + fileNames[i];
					if (tplDataMap[fUrl] === undefined)
						throw Error('Missing content for template "' + fUrl + '"');
					html += tplDataMap[fUrl];
				}
				if (html === '')
					html = null;
			}
			this.components.register(prop['name'], baseUrl, null, null, html);
		}
	}

	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// ##
	// ## WScriptLoader
	// ##

	class WScriptLoader {
		private libMap = {};
		private urlSet = {};
		private waitList = [];
		private promises = [];
		private mustLoadAll = false;
		private runCount = 0;

		constructor(private libraries: Libraries) {
		}

		public add(thingName: string, urls: string[], requireLib: string[] = []) {
			this.doAdd(thingName, urls, requireLib, null);
		}

		public addLib(libName: string, urls: string[], requireLib: string[] = []) {
			if (this.libMap[libName] === true || (this.libMap[libName] === undefined && this.libraries.load(name, false)))
				throw Error('Library "' + libName + '" is already defined');
			this.libMap[libName] = false;
			this.doAdd(libName, urls, requireLib, libName);
		}

		public getPromise(): Promise<void> {
			if (this.promises.length === 0 && this.waitList.length > 0)
				return Promise.reject(Error('Fail to load scripts for: ' + this.toDebugStringWait()));
			this.mustLoadAll = true;
			return <any>Promise.all(this.promises);
		}

		private doAdd(thingName: string, urls: string[], requireLib: string[], libName: string) {
			// - Validation
			var url;
			for (var i = 0, len = urls.length; i < len; ++i) {
				url = urls[i];
				if (this.urlSet[url])
					throw Error('Script "' + url + '" cannot be included twice');
				this.urlSet[url] = true;
			}
			// - Add
			this.fillLibMap(requireLib);
			this.waitList.push({
				'thingName': thingName,
				'libName': libName,
				'urls': urls,
				'requireLib': requireLib
			});
			this.runWaited();
		}

		private loadUrls(urls: string[]) {
			urls.forEach((url) => {
				++this.runCount;
				this.promises.push(WScriptLoader.addScriptToDOM(url).then(() => {
					--this.runCount;
					this.runWaited();
				}));
			});
		}

		private runWaited() {
			var prop, withStarted = false, hasWaited = false;
			for (var k in this.waitList) {
				if (!this.waitList.hasOwnProperty(k))
					continue;
				prop = this.waitList[k];
				if (this.areLibReady(prop['requireLib'])) {
					withStarted = true;
					this.loadUrls(prop['urls']);
					if (prop['libName'])
						this.libMap[prop['libName']] = true;
					delete this.waitList[k];
				} else
					hasWaited = true;
			}
			if (this.mustLoadAll && !withStarted && hasWaited && this.runCount === 0)
				throw Error('Fail to load scripts for: ' + this.toDebugStringWait());
		}

		private areLibReady(requireLib: string[]) {
			for (var i = 0, len = requireLib.length; i < len; ++i) {
				if (!this.libMap[requireLib[i]])
					return false;
			}
			return true;
		}

		private fillLibMap(requireLib: string[]) {
			var name: string;
			for (var i = 0, len = requireLib.length; i < len; ++i) {
				name = requireLib[i];
				if (this.libMap[name] === undefined)
					this.libMap[name] = this.libraries.load(name, false);
			}
		}

		private toDebugStringWait() {
			var list = [];
			for (var k in this.waitList) {
				if (!this.waitList.hasOwnProperty(k))
					continue;
				list.push(this.waitList[k]['thingName']);
			}
			return list.join(', ');
		}

		private static addScriptToDOM(url): Promise<void> {
			return new Promise(function (resolve, reject) {
				var script = document.createElement('script');
				if (script.onreadystatechange) { // IE8
					script.onreadystatechange = function () {
						if (script.readyState === 'complete')
							resolve();
						else
							reject();
					};
				} else {
					script.onload = resolve;
					script.onerror = reject;
				}
				script.src = url;
				var head: HTMLHeadElement = document.head || document.getElementsByTagName('head')[0];
				head.appendChild(script);
			});
		}
	}

	// ##
	// ## WCssLoader
	// ##

	class WCssLoader {
		private promises = [];

		constructor() {
		}

		public add(thingName: string, urls: string[]) {
			this.promises.push(Promise.all(urls.map((url) => {
				return Loader.addCssLinkToDOM(url);
			})).catch((e: Error) => {
				throw Error('Fail to load CSS of "' + thingName + '": ' + e.message);
			}));
		}

		public getPromise(): Promise<void> {
			return <any>Promise.all(this.promises);
		}
	}

	// ##
	// ## WTplLoader
	// ##

	class WTplLoader {
		private compNames = [];
		private promises = [];

		constructor(private ajax: woc.Ajax) {
		}

		public add(compName: string, urls: string[]) {
			this.compNames.push(compName);
			this.promises.push(Promise.all(urls.map((url) => {
				return this.ajax.get(url, {'rDataType': 'text'});
			})).then((arr: string[]) => {
				return arr.join('\n');
			}, (e: Error) => {
				throw Error('Fail to load templates in "' + compName + '": ' + e.message);
			}));
		}

		public getPromise(): Promise<{[index: string]: string}> {
			return Promise.all(this.promises).then((arr: string[]) => {
				var map;
				for (var i = 0, len = arr.length; i < len; ++i)
					map[this.compNames[i]] = arr[i];
				return map;
			});
		}
	}
}
