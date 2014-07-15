/// <reference path='definitions.ts' />
'use strict';

module woc {

	// ##
	// ## Ajax
	// ##

	export class CoreAjax implements Ajax {

		// --
		// -- Fields
		// --

		private log: woc.Log;
		private listeners = [];
		private runningCount = 0;
//		private uploadCount = 0;
//		private uploadingMap = {};

		// --
		// -- Initialisation
		// --

		constructor(sc: woc.ServiceContext) {
			this.log = <woc.Log>sc.getService('woc.Log');
		}

		public addListener(cb: Function): void {
			this.listeners.push(cb);
		}

		/**
		 * <pre><code>opt = {
		 * 	'get'?: {
		 * 		'baseUrl'?: string,
		 * 		'rDataType'?: 'json|script|css|text|detect',
		 * 		'attempts'?: integer // on XHR fail or malformed received JSON
		 * 	},
		 * 	'post'?: {
		 * 		'url'?: string,
		 * 		'rDataType'?: 'json|script|css|text|detect',
		 * 		'sAsJson'?: string, // contains the parameter name
		 * 		'attempts'?: integer // on XHR fail or HTTP 400 or malformed received JSON
		 * 	}
		 * }</code></pre>
		 */
		public createCustom(opt): CustomAjax {
			return new CoreCustomAjax(this, opt);
		}

		// --
		// -- Public
		// --

		/**
		 * <pre><code>opt = {
		 * 	'method': 'GET|POST|PUT|DELETE',
		 * 	'url': string,
		 * 	'sData'?: {},
		 * 	'done'?: Function,
		 * 	'fail'?: Function,
		 * 	'rDataType'?: 'json|script|css|text|detect', [default: 'json']
		 * 	'sAsJson'?: string, // contains the parameter name
		 * 	'attempts'?: integer [default: 1] // on XHR fail or malformed received JSON // TODO
		 * }</code></pre>
		 */
		public ajax(opt): void {
			this.doAjax(opt['method'], opt);
		}

		/**
		 * <pre><code>opt = {
		 * 	'url': string,
		 * 	'sData'?: {},
		 * 	'done'?: Function,
		 * 	'fail'?: Function,
		 * 	'rDataType'?: 'json|script|css|text|detect', [default: 'json']
		 * 	'attempts'?: integer [default: 1] // on XHR fail or malformed received JSON
		 * }</code></pre>
		 */
		public get(opt): void {
			this.doAjax('GET', opt);
		}

		/**
		 * <pre><code>bundleOpt = {
		 * 	'urls': [opt],
		 * 	'done'?: Function,
		 * 	'fail'?: Function
		 * }</code></pre>
		 */
		public bundleAjax(bundleOpt): void {
			var bundle = new AjaxBundle(this, bundleOpt);
			bundle.start();
		}

		/**
		 * <pre><code>opt = {
		 * 	'url': string,
		 * 	'sData'?: {},
		 * 	'done'?: Function,
		 * 	'fail'?: Function,
		 * 	'rDataType'?: 'json|script|css|text|detect', [default: 'json']
		 * 	'sAsJson'?: string, // contains the parameter name
		 * 	'attempts'?: integer [default: 1] // on XHR fail or HTTP 400 or malformed received JSON
		 * }</code></pre>
		 */
		public post(opt): void {
			this.doAjax('POST', opt);
		}

		/**
		 * <pre><code>opt = {
		 * 	'url': string,
		 * 	'sData'?: {},
		 * 	'sFiles': {}[],
		 * 	'done'?: Function,
		 * 	'fail'?: Function,
		 * 	'rDataType'?: 'json|script|css|text|detect', [default: 'json']
		 * 	'sAsJson'?: string, // contains the parameter name
		 * 	'attempts'?: integer [default: 1] // on XHR fail or HTTP 400 or malformed received JSON
		 * }</code></pre>
		 */
		public upload(opt): void {
			// TODO
		}
//		public upload(opt) {
//			// sect, cmd, files, data, doneCallback = null, failCallback = null, progressCallback = null
//			var that = this;
//			var uploadId = ++this.uploadCount;
//			var internalDoneCallback = function (rData, textStatus, jqXHR) {
//				that.safelyUpdateStatus(false);
//				that.safelyDone(
//					rData, textStatus, jqXHR, that.backendUrl, 'json', true,
//					function (inData) {
//						that.handleDoneUploading(uploadId, inData);
//					}, function () {
//						that.handleFailUploading(uploadId);
//					}
//				);
//			};
//			// - Make the form data
//			var fd = new FormData();
//
//			var wagon = {
//				'sect': sect,
//				'cmd': cmd
//			};
//			if (data !== null)
//				wagon['data'] = data;
//			var w = JSON.stringify(wagon);
//			fd.append('w', w);
//
//			var i, len = files.length, file;
//			for (i = 0; i < len; ++i) {
//				file = files[i];
//				fd.append(file['name'], file);
//			}
//			// - Send to the server
//			this.safelyUpdateStatus(true);
//			var jqXhr = $.ajax(this.backendUrl, {
//				'type': 'post',
//				'xhr': function () {
//					var newJqXhr = $.ajaxSettings.xhr();
//					if (newJqXhr.upload)
//						newJqXhr.upload.addEventListener('progress', function (e) { that.handleUploadProgress(uploadId, e); }, false);
//					return newJqXhr;
//				},
//				'success': internalDoneCallback,
//				'error': function () { // jqXHR: JQueryXHR, textStatus: string, errorThrow: string
//					that.safelyUpdateStatus(false);
//					that.handleFailUploading(uploadId);
//				},
//				'data': fd,
//				'dataType': 'text',
//				'cache': false,
//				'contentType': false, //'multipart/form-data',
////				'async': false,
//				'processData': false
//			});
//			this.uploadingMap[uploadId] = {
//				'jqXhr': jqXhr,
//				'doneCallback': doneCallback,
//				'failCallback': failCallback,
//				'progressCallback': progressCallback
//			};
//			return uploadId;
//		}

		// --
		// -- Private - Handle AJAX events - Loadings
		// --

		private doAjax(method, opt) {
			var url = opt['url'];
			var sData: Object = opt['sData'] === undefined ? null : opt['sData'];
			if (sData !== null) {
				var sAsJson: string = opt['sAsJson'];
				if (sAsJson !== undefined) {
					var orig = sData;
					sData = {};
					sData[sAsJson] = CoreAjax.jsonStringify(orig);
				}
			}
			var rDataType: string = opt['rDataType'] === undefined ? 'json' : opt['rDataType'];
			var that = this;
			var doneCallback = function (rData, statusCode) {
				that.safelyUpdateStatus(false);
				that.safelyDone(rData, statusCode, rDataType, opt);
			};
			var failCallback = function (statusCode, statusText) {
				that.safelyUpdateStatus(false);
				that.safelyFail(statusCode, statusText, opt);
			};
			this.safelyUpdateStatus(true);
			//CoreAjax.doXHRJQuery(method, url, sData, rDataType, doneCallback, failCallback);
			CoreAjax.doXHR(method, url, sData, rDataType, doneCallback, failCallback);
		}

		private safelyDone(rData, statusCode, rDataType, opt) {
			try {
				if (rDataType !== 'json') {
					if (opt['done'])
						opt['done'](rData, statusCode);
					return;
				}
				if (rData === '') {
					this.log.error('Missing JSON returned by: "' + opt['url'] + '"');
					if (opt['fail'])
						opt['fail']();
					return;
				}
				var jsonObj;
				try {
					jsonObj = CoreAjax.jsonParse(rData);
				} catch (e) {
					this.log.error('Invalid JSON returned by: "' + opt['url'] + '": ' + rData);
					if (opt['fail'])
						opt['fail']();
					return;
				}
				if (opt['done'])
					opt['done'](jsonObj, statusCode);
			} catch (e) {
				this.log.unexpectedErr(e);
			}
		}

		private safelyFail(statusCode, statusText, opt) {
			try {
				this.log.error('Fail to load the URL: ' + opt['url']);
				if (opt['fail'])
					opt['fail'](statusCode, statusText);
			} catch (e) {
				this.log.unexpectedErr(e);
			}
		}

		private safelyUpdateStatus(running: boolean) {
			try {
				if (running) {
					++this.runningCount;
					if (this.runningCount > 1)
						return; // already running
				} else {
					--this.runningCount;
					if (this.runningCount > 0)
						return; // still running
					if (this.runningCount < 0) {
						this.runningCount = 0;
						this.log.error('Inconsistent running count (negative)');
					}
				}
				// - Fire event
				var i, len = this.listeners.length, listener;
				for (i = 0; i < len; ++i) {
					listener = this.listeners[i];
					listener(running);
				}
			} catch (e) {
				this.log.unexpectedErr(e);
			}
		}

//		// --
//		// -- Private - Handle AJAX events - Uploadings
//		// --
//
//		private handleDoneUploading(uploadId, data) {
//			if (this.uploadingMap[uploadId] === undefined)
//				return;
//			try {
//				var prop = this.uploadingMap[uploadId];
//				delete this.uploadingMap[uploadId];
//				if (prop['done'])
//					prop['done'](data);
//			} catch (e) {
//				this.log.unexpectedErr(e);
//			}
//		}
//
//		private handleFailUploading(uploadId) {
//			if (this.uploadingMap[uploadId] === undefined)
//				return;
//			try {
//				var prop = this.uploadingMap[uploadId];
//				delete this.uploadingMap[uploadId];
//				if (prop['fail'])
//					prop['fail']();
//			} catch (e) {
//				this.log.unexpectedErr(e);
//			}
//		}
//
//		private handleUploadProgress(uploadId, e) {
//			if (this.uploadingMap[uploadId] === undefined)
//				return;
//			try {
//				if (e['lengthComputable']) {
//					var prop = this.uploadingMap[uploadId];
//					if (prop['progress'] !== null)
//						prop['progress'](e['loaded'], e['total']);
//				}
//			} catch (e) {
//				this.log.unexpectedErr(e);
//			}
//		}

		// --
		// -- Private - XMLHttpRequest
		// --

//		private static doXHRJQuery(method, url, sData, rDataType, doneCallback, failCallback) {
//			var settings = {
//				'type': method,
//				'success': function (data, textStatus, jqXHR) {
//					doneCallback(data, jqXHR.status);
//				},
//				'error': function (jqXHR, textStatus, errorThrown) {
//					failCallback(jqXHR.status, textStatus + '; ' + errorThrown);
//				},
//				'data': sData,
//				'dataType': rDataType === 'detect' ? null : (rDataType === 'json' ? 'text' : rDataType)
//			};
////				'contentType': false, //'multipart/form-data',
////				'processData': false,
////				'xhr': function () {
////					var newJqXhr = $.ajaxSettings.xhr();
////					if (newJqXhr.upload)
////						newJqXhr.upload.addEventListener('progress', function (e) { that.handleUploadProgress(uploadId, e); }, false);
////					return newJqXhr;
////				},
////				beforeSend: function(jqXHR, settings){
////    	    settings.xhr()
////    		}
//			$.ajax(url, settings);
//		}

		private static doXHR(method, url, sData, rDataType, doneCallback, failCallback) {
			var req = new XMLHttpRequest();
			req.open(method, url, true);
			req['onload'] = function () {
				if (req.status >= 200 && req.status < 400) { // 'json|script|text|detect'
					var resp = req.responseText;
//					if (rDataType === 'detect') {
//						var ct = this.getResponseHeader('Content-Type');
//						switch (ct) {
//							case 'application/json':
//								rDataType = 'json';
//								break;
//							case 'application/javascript':
//								rDataType = 'script';
//								break;
//							default:
//								rDataType = 'text';
//						}
//					}
					if (rDataType === 'script')
						eval(resp);
					doneCallback(resp, req.status);
				} else {
					failCallback(req.status, req.statusText);
				}
			};
			req['onerror'] = function () {
				failCallback(req.status, req.statusText);
			};
			// - sDataStr
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
		}

		private static jsonParse(s) {
			if (typeof JSON !== 'undefined')
				return JSON.parse(s);
			return eval(s); // before EcmaScript 5
		}

		private static jsonStringify(o) {
			if (typeof JSON !== 'undefined')
				return JSON.stringify(o);
			// - Before EcmaScript 5
			var t = typeof (o);
			if (t != 'object' || o === null) {
				if (t == 'string')
					o = "'" + o + "'";
				return String(o);
			}
			var n, v, json = [], arr = CoreAjax.isArray(o);
			for (n in o) {
				if (!o.hasOwnProperty(n))
					continue;
				v = o[n];
				t = typeof(v);
				if (t == 'string')
					v = "'" + v + "'";
				else if (t == 'object' && v !== null)
					v = CoreAjax.jsonStringify(v);
				json.push((arr ? '' : "'" + n + "':") + String(v));
			}
			return (arr ? '[' : '{') + String(json) + (arr ? ']' : '}');
		}

		private static isArray(data) {
			if (Array.isArray)
				return Array.isArray(data);
			return Object.prototype.toString.call(data) === '[object Array]'; // before EcmaScript 5.1
		}
	}

	// ##
	// ## CustomAjax
	// ##

	export class CoreCustomAjax implements CustomAjax {

		// --
		// -- Fields & Initialisation
		// --

		private defaultGet: Object;
		private defaultPost: Object;

		/**
		 * <pre><code>defaultOpt = {
		 * 	'get'?: {
		 * 		'baseUrl'?: string,
		 * 		'rDataType'?: 'json|script|text|detect',
		 * 		'attempts'?: integer // on XHR fail or malformed received JSON
		 * 	},
		 * 	'post'?: {
		 * 		'url'?: string,
		 * 		'rDataType'?: 'json|script|text|detect',
		 * 		'sAsJson'?: string, // contains the parameter name
		 * 		'attempts'?: integer // on XHR fail or HTTP 400 or malformed received JSON
		 * 	}
		 * }</code></pre>
		 */
		constructor(private ajaxSrv: Ajax, defaultOpt) {
			this.defaultGet = defaultOpt['get'] || {};
			this.defaultPost = defaultOpt['post'] || {};
		}

		// --
		// -- Public
		// --

		public ajax(opt) {
			this.ajaxSrv.ajax(this.makeAjaxOpt(opt));
		}

		public get(opt) {
			this.ajaxSrv.get(this.makeGetOpt(opt, false));
		}

		/**
		 * <pre><code>bundleOpt = {
		 * 	'urls': [opt],
		 * 	'done'?: Function,
		 * 	'fail'?: Function
		 * }</code></pre>
		 */
		public bundleAjax(bundleOpt) {
			var list = bundleOpt['urls'], newList = [];
			for (var i = 0; i < list.length; ++i)
				newList.push(this.makeAjaxOpt(list[i]));
			this.ajaxSrv.bundleAjax({
				'urls': newList,
				'done': bundleOpt['done'],
				'fail': bundleOpt['fail']
			});
		}

		public post(opt) {
			this.ajaxSrv.post(this.makePostOpt(opt, false));
		}

		public upload(opt) { // TODO
			this.ajaxSrv.upload(this.makePostOpt(opt, false));
		}

		// --
		// -- Private
		// --

		private makeAjaxOpt(opt) {
			if (opt['method'] === 'GET')
				return this.makeGetOpt(opt, true);
			else
				return this.makePostOpt(opt, true);
		}

		private makeGetOpt(opt, withMethod) {
			var url = opt['url'];
			if (this.defaultGet['baseUrl'] !== undefined)
				url = this.defaultGet['baseUrl'] + url;
			var newOpt = {
				'url': url,
				'sData': opt['sData'],
				'done': opt['done'],
				'fail': opt['fail'],
				'rDataType': opt['rDataType'] || this.defaultGet['rDataType'],
				'attempts': opt['attempts'] || this.defaultGet['attempts']
			};
			if (withMethod)
				newOpt['method'] = 'GET';
			return newOpt;
		}

		private makePostOpt(opt, withMethod) {
			var newOpt = {
				'url': opt['url'] || this.defaultPost['url'],
				'sData': opt['sData'],
				'done': opt['done'],
				'fail': opt['fail'],
				'rDataType': opt['rDataType'] || this.defaultPost['rDataType'],
				'sAsJson': opt['sAsJson'] || this.defaultPost['sAsJson'],
				'attempts': opt['attempts'] || this.defaultPost['attempts']
			};
			if (withMethod)
				newOpt['method'] = 'POST';
			return newOpt;
		}
	}

	// ##
	// ## AjaxBundle
	// ##

	class AjaxBundle {

		// --
		// -- Fields
		// --

		private static S_NONE = 1;
		private static S_LOADING = 2;
		private static S_DONE = 3;
		private static S_FAIL = 4;

		private propMap = {};
		private rDataMap;
		private waitedLoads: number;
		private hasError = false;

		// --
		// -- Initialisation
		// --

		/**
		 * <pre><code>bundleOpt = {
		 * 	'urls': [opt],
		 * 	'done'?: Function,
		 * 	'fail'?: Function
		 * }</code></pre>
		 */
		constructor(private cn: Ajax, private bundleOpt) {
			var arr = bundleOpt['urls'], getOpt;
			this.waitedLoads = arr.length;
			for (var i = 0; i < this.waitedLoads; ++i) {
				getOpt = arr[i];
				this.propMap[getOpt['url']] = {'opt': getOpt, 'status': AjaxBundle.S_NONE};
			}
		}

		// --
		// -- Public
		// --

		public start() {
			var that = this;
			var doneCallbackMaker = function (url, prop) {
				return function (rData) {
					that.endItem(url, prop, true, rData);
				};
			};
			var failCallbackMaker = function (url, prop) {
				return function () {
					that.endItem(url, prop, false, null);
				};
			};
			this.rDataMap = {};
			var prop, origOpt, opt;
			for (var url in this.propMap) {
				if (!this.propMap.hasOwnProperty(url))
					continue;
				prop = this.propMap[url];
				// - Make opt
				origOpt = prop['opt'];
				opt = {
					'url': url,
					'done': doneCallbackMaker(url, prop),
					'fail': failCallbackMaker(url, prop)
				};
				if (origOpt['sData'] !== undefined)
					opt['sData'] = origOpt['sData'];
				if (origOpt['rDataType'] !== undefined)
					opt['rDataType'] = origOpt['rDataType'];
				if (origOpt['attempts'] !== undefined)
					opt['attempts'] = origOpt['attempts'];

				prop['status'] = AjaxBundle.S_LOADING;
				// - HTTP get
				this.cn.get(opt);
			}
		}

		private endItem(url, prop, done: boolean, rData) {
			if (this.hasError)
				return;
			if (done) {
				prop['status'] = AjaxBundle.S_DONE;
				this.rDataMap[url] = rData;
				--this.waitedLoads;
				if (this.waitedLoads === 0 && this.bundleOpt['done'])
					this.bundleOpt['done'](this.rDataMap);
			} else {
				prop['status'] = AjaxBundle.S_FAIL;
				this.hasError = true;
				if (this.bundleOpt['fail'])
					this.bundleOpt['fail']('Fail to load url "' + url + '"');
			}
		}
	}
}
