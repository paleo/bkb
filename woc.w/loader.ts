/// <reference path="definitions.ts" />
/// <reference path="contexts.ts" />
/// <reference path="loader-w.ts" />
'use strict';

module woc {
	export function globalEval(script: string): void {
		// - Check 'use strict'
		var needle = ' use strict', len = needle.length;
		var strict = script.length > len;
		if (strict) {
			for (var i = 1; i < len; ++i) {
				if (script[i] !== needle[i]) {
					strict = false;
					break;
				}
			}
		}
		// - Eval
		if (strict) {
			var tag = document.createElement('script');
			tag.text = script;
			document.head.appendChild(tag);
			document.head.removeChild(tag);
		} else {
			// Thanks to https://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
			var glo = window || this;
			if (glo.execScript) {
				glo.execScript(script); // IE
				return;
			}
			var fn = function () {
				glo['eval']['call'](glo, script);
			};
			fn();
		}
	}

	export class Loader {

		private static W_SUFFIX = '.w';
		private appUrl: string;
		private ajax: woc.Ajax;
		private bundlePromMap: {[index:string]: Promise<void>} = {};

		constructor(private ac: ImplApplicationContext, private libraries: Libraries, private services: Services,
				private components: Components, private bundles: Bundles) {
			this.appUrl = ac.properties['appUrl'];
			this.ajax = this.services.get('woc.Ajax');
		}

		public loadBundle(bundlePath: string, startOnElem, version: string, autoLoadCss: boolean, wMode: boolean): Promise<void> {
			var retProm = (p: Promise<void>): Promise<void> => {
				if (!startOnElem)
					return p;
				return p.then(() => {
					this.bundles.start(bundlePath, startOnElem);
				});
			};
			// - Known bundle
			var p = this.bundlePromMap[bundlePath];
			if (p !== undefined)
				return retProm(p);
			// - First call
			var bundleUrl = this.appUrl + '/' + bundlePath;
			if (wMode)
				bundleUrl += Loader.W_SUFFIX;
			else if (version)
				bundleUrl += '-' + version;
			if (wMode) {
				var wLoader = new WLoader(this.libraries, this.services, this.components, this.bundles, this, bundlePath, bundleUrl, version);
				p = wLoader.loadWBundle();
			} else
				p = this.loadNormalBundle(bundlePath, bundleUrl, autoLoadCss);
			this.bundlePromMap[bundlePath] = p;
			return retProm(p);
		}

		// --
		// -- Internal
		// --

		static addCssLinkToDOM(url: string): Promise<void> {
			var elem = document.createElement('link');
			elem.rel = 'stylesheet';
			elem.type = 'text/css';
			elem.href = url;
			document.head.appendChild(elem);
			return Promise.resolve<void>();
		}

		// --
		// -- Private
		// --

		private loadNormalBundle(bundlePath, bundleUrl, autoLoadCss: boolean): Promise<void> {
			var bundleName = Loader.getLastDirName(bundlePath);
			var mainProm = this.ajax.get(bundleUrl + '/' + bundleName + '.json').then((bundleData) => {
				var p;
				if (bundleData['preload']) {
					p = Promise.all(bundleData['preload'].map((bp) => {
						return this.loadBundle(bp, null, null, false, false);
					})).then(() => {
						return this.registerNormalBundle(bundlePath, bundleUrl, bundleData);
					});
				} else
					p = this.registerNormalBundle(bundlePath, bundleUrl, bundleData);
				if (!autoLoadCss && bundleData['css'])
					return Promise.all([p, Loader.addCssLinkToDOM(bundleUrl + '/' + bundleName + '.css')]);
				return p;
			});
			return autoLoadCss ? <any>Promise.all([mainProm, Loader.addCssLinkToDOM(bundleUrl + '/' + bundleName + '.css')]) : mainProm;
		}

		private registerNormalBundle(bundlePath: string, bundleUrl, bundleData: {}): Promise<void> {
			var name, data, promList = [];
			// - Register libraries
			var servMap = bundleData['libraries'];
			if (servMap) {
				for (name in servMap) {
					if (!servMap.hasOwnProperty(name))
						continue;
					data = servMap[name];
					this.libraries.register(name, data['requireLib'], data['script']);
					if (data['css'])
						promList.push(Loader.addCssLinks(data['css'], bundleUrl));
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
						promList.push(Loader.addCssLinks(data['css'], bundleUrl));
				}
			}
			this.bundles.register(bundlePath, bundleUrl, bundleData['requireLib'], bundleData['script'], bundleData['main']);
			return <any>Promise.all(promList);
		}

		private static addCssLinks(list: string[], bundleUrl: string): Promise<void> {
			return <any>Promise.all(list.map((fileName) => {
				return Loader.addCssLinkToDOM(bundleUrl + '/' + fileName);
			}));
		}

		private static getLastDirName(path: string): string {
			var i = path.lastIndexOf('/');
			return i === -1 ? path : path.slice(i + 1);
		}
	}
}
