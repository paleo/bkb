/// <reference path='definitions.ts' />
'use strict';

module woc {

	// ##
	// ## Ajax
	// ##

	export class CoreAjax implements Ajax {

		// --
		// -- Initialisation
		// --

		constructor() {
		}

		// --
		// -- Public
		// --

		/**
		 * * method: 'GET|POST|PUT|DELETE|HEAD'
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public ajax(method: string, opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			var sData = opt.sData || null;
			if (sData && opt.sAsJson) {
				var orig = sData;
				sData = {};
				sData[opt.sAsJson] = JSON.stringify(orig);
			}
			return CoreAjax.doXHR(method, opt.url, sData, opt.rDataType || 'json');
		}

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public get(opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			return this.ajax('GET', opt);
		}

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public head(opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			return this.ajax('HEAD', opt);
		}

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public post(opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			return this.ajax('POST', opt);
		}

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public put(opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			return this.ajax('PUT', opt);
		}

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		public delete(opt: {
					url: string;
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any> {
			return this.ajax('DELETE', opt);
		}

		// --
		// -- Private - Handle AJAX events - Loadings
		// --

		private static doXHR(method, url, sData, rDataType): Promise<any> {
			return new Promise<any>((resolve, reject) => {
				var req = new XMLHttpRequest();
				req.open(method, url, true);
				// - Handlers
				req.onload = () => {
					if (req.status < 200 || req.status >= 400) {
						reject(Error('Error from server "' + url + '", error ' + req.status + ' (' + req.statusText + ')'));
						return;
					}
					var resp = req.responseText;
					switch (rDataType) {
						case 'script':
							globalEval(resp);
							resolve(resp);
							break;
						case 'json':
							try {
								resolve(JSON.parse(resp));
							} catch (e) {
								reject('Invalid JSON, loaded from: ' + url);
								return;
							}
							break;
						default:
							resolve(resp);
					}
				};
				req.onerror = () => {
					reject('Network error when loading "' + url + '", error ' + req.status + ' (' + req.statusText + ')');
				};
				// - Make the query
				var sDataStr;
				if (sData) {
					var sDataList = [];
					for (var k in sData) {
						if (sData.hasOwnProperty(k))
							sDataList.push(encodeURIComponent(k) + '=' + encodeURIComponent(sData[k]));
					}
					sDataStr = sDataList.length === 0 ? null : sDataList.join('&');
				} else
					sDataStr = null;
				// - Send
				req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
				req.send(sDataStr);
			});
		}
	}

//	// ##
//	// ## AjaxBundle
//	// ##
//
//	class AjaxBundle {
//
//		// --
//		// -- Fields
//		// --
//
//		private static S_NONE = 1;
//		private static S_LOADING = 2;
//		private static S_DONE = 3;
//		private static S_FAIL = 4;
//
//		private propMap = {};
//		private rDataMap;
//		private waitedLoads: number;
//		private hasError = false;
//
//		// --
//		// -- Initialisation
//		// --
//
//		/**
//		 * <pre><code>bundleOpt = {
//		 * 	'urls': [opt],
//		 * 	'done'?: Function,
//		 * 	'fail'?: Function
//		 * }</code></pre>
//		 */
//		constructor(private cn: Ajax, private bundleOpt) {
//			var arr = bundleOpt['urls'], getOpt;
//			this.waitedLoads = arr.length;
//			for (var i = 0; i < this.waitedLoads; ++i) {
//				getOpt = arr[i];
//				this.propMap[getOpt['url']] = {'opt': getOpt, 'status': AjaxBundle.S_NONE};
//			}
//		}
//
//		// --
//		// -- Public
//		// --
//
//		public start() {
//			var doneCallbackMaker = (url, prop) => {
//				return (rData) => {
//					this.endItem(url, prop, true, rData);
//				};
//			};
//			var failCallbackMaker = (url, prop) => {
//				return () => {
//					this.endItem(url, prop, false, null);
//				};
//			};
//			this.rDataMap = {};
//			var prop, origOpt, opt;
//			for (var url in this.propMap) {
//				if (!this.propMap.hasOwnProperty(url))
//					continue;
//				prop = this.propMap[url];
//				// - Make opt
//				origOpt = prop['opt'];
//				opt = {
//					'url': url,
//					'done': doneCallbackMaker(url, prop),
//					'fail': failCallbackMaker(url, prop)
//				};
//				if (origOpt['sData'] !== undefined)
//					opt['sData'] = origOpt['sData'];
//				if (origOpt['rDataType'] !== undefined)
//					opt['rDataType'] = origOpt['rDataType'];
//				if (origOpt['attempts'] !== undefined)
//					opt['attempts'] = origOpt['attempts'];
//
//				prop['status'] = AjaxBundle.S_LOADING;
//				// - HTTP get
//				this.cn.get(opt);
//			}
//		}
//
//		private endItem(url, prop, done: boolean, rData) {
//			if (this.hasError)
//				return;
//			if (done) {
//				prop['status'] = AjaxBundle.S_DONE;
//				this.rDataMap[url] = rData;
//				--this.waitedLoads;
//				if (this.waitedLoads === 0 && this.bundleOpt['done'])
//					this.bundleOpt['done'](this.rDataMap);
//			} else {
//				prop['status'] = AjaxBundle.S_FAIL;
//				this.hasError = true;
//				if (this.bundleOpt['fail'])
//					this.bundleOpt['fail']('Fail to load url "' + url + '"');
//			}
//		}
//	}
}
