/// <reference path="definitions.ts" />
/// <reference path="contexts.ts" />
/// <reference path="loader-w.ts" />
'use strict';

module woc {
	export class Loader {

		private static WORK_IN_PROGRESS = '.w';
		private static S_LOADING = 1;
		private static S_READY = 2;
		private static S_ERROR = 3;

		private appUrl: string;
		private ajax: woc.Ajax;
		private bundlePropMap = {};

		constructor(private ac: ImplApplicationContext, private libraries: Libraries, private services: Services,
				private components: Components, private bundles: Bundles) {
			this.appUrl = ac.properties['appUrl'];
			this.ajax = this.services.get('woc.Ajax');
		}

		public loadBundle(bundlePath: string, doneCallback: Function, failCallback: Function, startOnElem, version: string,
				autoLoadCss: boolean, wMode: boolean) {
			// - Known bundle
			var prop = this.bundlePropMap[bundlePath];
			if (prop !== undefined) {
				switch (prop['status']) {
					case Loader.S_READY:
						if (doneCallback)
							doneCallback();
						if (startOnElem)
							this.bundles.start(bundlePath, startOnElem);
						return;
					case Loader.S_LOADING:
						if (doneCallback)
							prop['onReady'].push(doneCallback);
						if (failCallback)
							prop['onError'].push(failCallback);
						if (startOnElem)
							prop['start'].push(startOnElem);
						return;
					default:
						if (failCallback)
							failCallback();
						return;
				}
			}
			// - First call
			prop = {
				'status': Loader.S_LOADING,
				'onReady': doneCallback ? [doneCallback] : [],
				'onError': failCallback ? [failCallback] : [],
				'start': startOnElem ? [startOnElem] : []
			};
			this.bundlePropMap[bundlePath] = prop;
			// - Load
			var bundleUrl = this.appUrl + '/' + bundlePath;
			if (wMode)
				bundleUrl += Loader.WORK_IN_PROGRESS;
			else if (version)
				bundleUrl += '-' + version;
			var loadDone = () => {
				prop['status'] = Loader.S_READY;
				var cbList = prop['onReady'], i, len;
				for (i = 0, len = cbList.length; i < len; ++i)
					cbList[i]();
				var startList = prop['start'];
				for (i = 0, len = startList.length; i < len; ++i)
					this.bundles.start(bundlePath, startList[i]);
				delete prop['onReady'];
				delete prop['onError'];
				delete prop['start'];
			};
			var loadFail = () => {
				prop['status'] = Loader.S_ERROR;
				var cbList = prop['onError'];
				for (var i = 0, len = cbList.length; i < len; ++i)
					cbList[i]();
				delete prop['onReady'];
				delete prop['onError'];
			};
			if (wMode) {
				var wLoader = new WLoader(this.libraries, this.services, this.components, this.bundles, this, bundlePath, bundleUrl,
					version, loadDone, loadFail);
				wLoader.loadWBundle();
			} else
				this.loadNormalBundle(bundlePath, bundleUrl, loadDone, loadFail, autoLoadCss);
		}

		// --
		// -- Internal
		// --

		loadBundles(bundlePaths, doneCallback: Function, failCallback: Function, wMode: boolean) {
			var waitedLoads = bundlePaths.length, hasError = false;
			if (waitedLoads === 0) {
				if (doneCallback)
					doneCallback();
				return;
			}
			var done = () => {
				if (hasError)
					return;
				--waitedLoads;
				if (waitedLoads === 0 && doneCallback)
					doneCallback();
			};
			var fail = () => {
				if (hasError)
					return;
				hasError = true;
				if (failCallback)
					failCallback();
			};
			for (var i = 0, len = bundlePaths.length; i < len; ++i)
				this.loadBundle(bundlePaths[i], done, fail, null, null, false, wMode);
		}

		static addCssLinkElement(baseUrl: string, fileName: string) {
			var elem = document.createElement('link');
			elem.rel = 'stylesheet';
			elem.type = 'text/css';
			//elem.media = 'all';
			elem.href = baseUrl + '/' + fileName;
			document.head.appendChild(elem);
		}

		// --
		// -- Private
		// --

		private loadNormalBundle(bundlePath, bundleUrl, doneCallback, failCallback, autoLoadCss: boolean) {
			var bundleName = Loader.getLastDirName(bundlePath);
			this.ajax.get({
				'url': bundleUrl + '/' + bundleName + '.json',
				'done': (bundleData) => {
					this.onLoadedNormalBundle(bundlePath, bundleUrl, bundleName, doneCallback, failCallback, bundleData, autoLoadCss);
				}
			});
			if (autoLoadCss)
				Loader.addCssLinkElement(bundleUrl, bundleName + '.css');
		}

		private onLoadedNormalBundle(bundlePath: string, bundleUrl, bundleName, doneCallback: Function, failCallback: Function,
				bundleData: {}, autoLoadedCss: boolean) {
			var preload = bundleData['preload'];
			if (preload) {
				this.loadBundles(preload, () => {
					this.registerNormalBundle(bundlePath, bundleUrl, bundleData);
					if (doneCallback)
						doneCallback();
				}, failCallback, false);
			} else {
				this.registerNormalBundle(bundlePath, bundleUrl, bundleData);
				if (doneCallback)
					doneCallback();
			}
			if (!autoLoadedCss && bundleData['css'])
				Loader.addCssLinkElement(bundleUrl, bundleName + '.css');
		}

		private registerNormalBundle(bundlePath: string, bundleUrl, bundleData: {}) {
			var name, data;
			// - Register libraries
			var servMap = bundleData['libraries'];
			if (servMap) {
				for (name in servMap) {
					if (!servMap.hasOwnProperty(name))
						continue;
					data = servMap[name];
					this.libraries.register(name, data['requireLib'], data['script']);
					if (data['css'])
						Loader.addCssLinks(data['css'], bundleUrl);
				}
			}
			// - Register services
			var servMap = bundleData['services'];
			if (servMap) {
				for (name in servMap) {
					if (!servMap.hasOwnProperty(name))
						continue;
					data = servMap[name];
					this.services.register(name, bundleUrl, data['alias'], data['requireLib'], data['script']);
				}
			}
			// - Register components
			var compMap = bundleData['components'];
			if (compMap) {
				for (name in compMap) {
					if (!compMap.hasOwnProperty(name))
						continue;
					data = compMap[name];
					this.components.register(name, bundleUrl, data['requireLib'], data['script'], data['tpl']);
					if (data['css'])
						Loader.addCssLinks(data['css'], bundleUrl);
				}
			}
			this.bundles.register(bundlePath, bundleUrl, bundleData['requireLib'], bundleData['script'], bundleData['main']);
		}

		private static addCssLinks(list: string[], bundleUrl: string) {
			for (var i = 0, len = list.length; i < len; ++i)
				Loader.addCssLinkElement(bundleUrl, list[i]);
		}

		private static getLastDirName(path: string): string {
			var i = path.lastIndexOf('/');
			return i === -1 ? path : path.slice(i + 1);
		}
	}
}
