/// <reference path="definitions.ts" />
/// <reference path="utils.ts" />
/// <reference path="contexts.ts" />
/// <reference path="loader-w.ts" />
'use strict';

module Woc {
	export class Loader {

		private static W_SUFFIX = '.w';
		private wocUrl: string;
		private ajax: Woc.Ajax;
		private bundlePromMap: {[index:string]: Promise<void>} = {};

		constructor(private ac: ApplicationContext, private libraries: Libraries, private services: Services,
				private components: Components) {
			this.wocUrl = ac.appConfig.wocUrl;
			this.ajax = this.services.get('Woc.Ajax');
		}

		public loadBundle(opt: BundleLoadingOptions): Promise<void> {
			// - Known bundle
			var p = this.bundlePromMap[opt.bundlePath];
			if (p !== undefined)
				return p;
			// - First call
			var bundleUrl = this.wocUrl + '/' + opt.bundlePath;
			if (opt.w)
				bundleUrl += Loader.W_SUFFIX;
			else if (opt.version)
				bundleUrl += '-' + opt.version;
			if (opt.w) {
				var wLoader = new WLoader(this.libraries, this.services, this.components, this, opt.bundlePath, bundleUrl, opt.version);
				p = wLoader.loadWBundle();
			} else
				p = this.loadNormalBundle(opt.bundlePath, bundleUrl, opt.autoLoadCss);
			this.bundlePromMap[opt.bundlePath] = p;
			return p;
		}

		// --
		// -- Public tools
		// --

		public static addCssLinkToDOM(url: string): Promise<void> {
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
						return this.loadBundle({
							bundlePath: bp,
							autoLoadCss: false,
							version: null,
							w: false
						});
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
			var libMap = bundleData['libraries'];
			if (libMap) {
				for (name in libMap) {
					if (!libMap.hasOwnProperty(name))
						continue;
					data = libMap[name];
					this.libraries.register(name, data['useLibrary'], data['script']);
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
					this.services.register(name, bundleUrl, data['alias'], data['useApplication'], data['useLibrary'], data['useService'],
						data['useComponent'], data['script']);
				}
			}
			// - Register components
			var compMap = bundleData['components'];
			if (compMap) {
				for (name in compMap) {
					if (!compMap.hasOwnProperty(name))
						continue;
					data = compMap[name];
					this.components.register(name, bundleUrl, data['useApplication'], data['useLibrary'], data['useService'],
						data['useComponent'], data['script'], data['templates'], data['templateEngine']);
					if (data['css'])
						promList.push(Loader.addCssLinks(data['css'], bundleUrl));
				}
			}
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
