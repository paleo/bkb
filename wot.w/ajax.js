/// <reference path='loader.ts' />
/// <reference path='log.ts' />
var wot;
(function (wot) {
    'use strict';

    // ##
    // ## Ajax
    // ##
    var Ajax = (function () {
        //		private uploadCount = 0;
        //		private uploadingMap = {};
        // --
        // -- Initialisation
        // --
        function Ajax(sc) {
            this.listeners = [];
            this.runningCount = 0;
            this.log = sc.getService('wot.Log');
        }
        Ajax.prototype.addListener = function (cb) {
            this.listeners.push(cb);
        };

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
        Ajax.prototype.createCustom = function (opt) {
            return new CustomAjax(this, opt);
        };

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
        Ajax.prototype.ajax = function (opt) {
            this.doAjax(opt['method'], opt);
        };

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
        Ajax.prototype.get = function (opt) {
            this.doAjax('GET', opt);
        };

        /**
        * <pre><code>bundleOpt = {
        * 	'urls': [opt],
        * 	'done'?: Function,
        * 	'fail'?: Function
        * }</code></pre>
        */
        Ajax.prototype.bundleAjax = function (bundleOpt) {
            var bundle = new AjaxBundle(this, bundleOpt);
            bundle.start();
        };

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
        Ajax.prototype.post = function (opt) {
            this.doAjax('POST', opt);
        };

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
        Ajax.prototype.upload = function (opt) {
            // TODO
        };

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
        Ajax.prototype.doAjax = function (method, opt) {
            var url = opt['url'];
            var sData = opt['sData'] === undefined ? null : opt['sData'];
            if (sData !== null) {
                var sAsJson = opt['sAsJson'];
                if (sAsJson !== undefined)
                    sData = { sAsJson: Ajax.jsonStringify(sData) };
            }
            var rDataType = opt['rDataType'] === undefined ? 'json' : opt['rDataType'];
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

            //Ajax.doXHRJQuery(method, url, sData, rDataType, doneCallback, failCallback);
            Ajax.doXHR(method, url, sData, rDataType, doneCallback, failCallback);
        };

        Ajax.prototype.safelyDone = function (rData, statusCode, rDataType, opt) {
            try  {
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
                try  {
                    jsonObj = Ajax.jsonParse(rData);
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
        };

        Ajax.prototype.safelyFail = function (statusCode, statusText, opt) {
            try  {
                this.log.error('Fail to load the URL: ' + opt['url']);
                if (opt['fail'])
                    opt['fail'](statusCode, statusText);
            } catch (e) {
                this.log.unexpectedErr(e);
            }
        };

        Ajax.prototype.safelyUpdateStatus = function (running) {
            try  {
                if (running) {
                    ++this.runningCount;
                    if (this.runningCount > 1)
                        return;
                } else {
                    --this.runningCount;
                    if (this.runningCount > 0)
                        return;
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
        };

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
        Ajax.doXHR = function (method, url, sData, rDataType, doneCallback, failCallback) {
            var req = new XMLHttpRequest();
            req.open(method, url, true);
            req['onload'] = function () {
                if (req.status >= 200 && req.status < 400) {
                    var resp = req.responseText;
                    if (rDataType === 'detect') {
                        var ct = this.getResponseHeader('Content-Type');
                        switch (ct) {
                            case 'application/json':
                                rDataType = 'json';
                                break;
                            case 'application/javascript':
                                rDataType = 'script';
                                break;
                            default:
                                rDataType = 'text';
                        }
                    }
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
                        sDataList.push(decodeURIComponent(k) + '=' + decodeURIComponent(sData[k]));
                }
                sDataStr = sDataList.length === 0 ? null : sDataList.join('&');
            } else
                sDataStr = null;

            // - Send
            req.send(sDataStr);
        };

        //		/**
        //		 * This function is under MIT license: http://neil.mit-license.org/
        //		 */
        //		private twixAjax(options) { // TODO use twix
        //			options = options || {url:""};
        //			options.type = options.type || 'GET';
        //			options.headers = options.headers || {};
        //			options.timeout = parseInt(options.timeout, 10) || 0;
        //			options.success = options.success || function() {};
        //			options.error = options.error || function() {};
        //			options.async = typeof options.async === 'undefined' ? true : options.async;
        //
        //			var client = new XMLHttpRequest();
        //			if (options.timeout > 0) {
        //				client.timeout = options.timeout;
        //				client.ontimeout = function () {
        //					options.error('timeout', 'timeout', client);
        //				}
        //			}
        //			client.open(options.type, options.url, options.async);
        //
        //			for (var i in options.headers) {
        //				if (options.headers.hasOwnProperty(i)) {
        //					client.setRequestHeader(i, options.headers[i]);
        //				}
        //			}
        //
        //			client.send(options.data);
        //			client.onreadystatechange = function() {
        //				if (this.readyState == 4 && this.status == 200) {
        //					var data = this.responseText;
        //					var contentType = this.getResponseHeader('Content-Type');
        //					if (contentType && contentType.match(/json/)) {
        //						data = JSON.parse(this.responseText);
        //					}
        //					options.success(data, this.statusText, this);
        //				} else if (this.readyState == 4) {
        //					options.error(this.status, this.statusText, this);
        //				}
        //			};
        //
        //			if (options.async == false) {
        //				if (client.readyState == 4 && client.status == 200) {
        //					options.success(client.responseText, client);
        //				} else if (client.readyState == 4) {
        //					options.error(client.status, client.statusText, client);
        //				}
        //			}
        //
        //			return client;
        //		}
        Ajax.jsonParse = function (s) {
            if (typeof JSON !== 'undefined')
                return JSON.parse(s);
            return eval(s);
        };

        Ajax.jsonStringify = function (o) {
            if (typeof JSON !== 'undefined')
                return JSON.stringify(o);

            // - Before EcmaScript 5
            var t = typeof (o);
            if (t != 'object' || o === null) {
                if (t == 'string')
                    o = "'" + o + "'";
                return String(o);
            }
            var n, v, json = [], arr = Ajax.isArray(o);
            for (n in o) {
                if (!o.hasOwnProperty(n))
                    continue;
                v = o[n];
                t = typeof (v);
                if (t == 'string')
                    v = "'" + v + "'";
                else if (t == 'object' && v !== null)
                    v = Ajax.jsonStringify(v);
                json.push((arr ? '' : "'" + n + "':") + String(v));
            }
            return (arr ? '[' : '{') + String(json) + (arr ? ']' : '}');
        };

        Ajax.isArray = function (data) {
            if (Array.isArray)
                return Array.isArray(data);
            return Object.prototype.toString.call(data) === '[object Array]';
        };
        return Ajax;
    })();
    wot.Ajax = Ajax;

    // ##
    // ## CustomAjax
    // ##
    var CustomAjax = (function () {
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
        function CustomAjax(ajaxSrv, defaultOpt) {
            this.ajaxSrv = ajaxSrv;
            this.defaultGet = defaultOpt['get'] || {};
            this.defaultPost = defaultOpt['post'] || {};
        }
        // --
        // -- Public
        // --
        CustomAjax.prototype.ajax = function (opt) {
            this.ajaxSrv.ajax(this.makeAjaxOpt(opt));
        };

        CustomAjax.prototype.get = function (opt) {
            this.ajaxSrv.get(this.makeGetOpt(opt, false));
        };

        /**
        * <pre><code>bundleOpt = {
        * 	'urls': [opt],
        * 	'done'?: Function,
        * 	'fail'?: Function
        * }</code></pre>
        */
        CustomAjax.prototype.bundleAjax = function (bundleOpt) {
            var list = bundleOpt['urls'], newList = [];
            for (var i = 0; i < list.length; ++i)
                newList.push(this.makeAjaxOpt(list[i]));
            this.ajaxSrv.bundleAjax({
                'urls': newList,
                'done': bundleOpt['done'],
                'fail': bundleOpt['fail']
            });
        };

        CustomAjax.prototype.post = function (opt) {
            this.ajaxSrv.post(this.makePostOpt(opt, false));
        };

        CustomAjax.prototype.upload = function (opt) {
            this.ajaxSrv.upload(this.makePostOpt(opt, false));
        };

        // --
        // -- Private
        // --
        CustomAjax.prototype.makeAjaxOpt = function (opt) {
            if (opt['method'] === 'GET')
                return this.makeGetOpt(opt, true);
            else
                return this.makePostOpt(opt, true);
        };

        CustomAjax.prototype.makeGetOpt = function (opt, withMethod) {
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
        };

        CustomAjax.prototype.makePostOpt = function (opt, withMethod) {
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
        };
        return CustomAjax;
    })();
    wot.CustomAjax = CustomAjax;

    // ##
    // ## AjaxBundle
    // ##
    var AjaxBundle = (function () {
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
        function AjaxBundle(cn, bundleOpt) {
            this.cn = cn;
            this.bundleOpt = bundleOpt;
            this.propMap = {};
            this.hasError = false;
            var arr = bundleOpt['urls'], getOpt;
            this.waitedLoads = arr.length;
            for (var i = 0; i < this.waitedLoads; ++i) {
                getOpt = arr[i];
                this.propMap[getOpt['url']] = { 'opt': getOpt, 'status': AjaxBundle.S_NONE };
            }
        }
        // --
        // -- Public
        // --
        AjaxBundle.prototype.start = function () {
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
        };

        AjaxBundle.prototype.endItem = function (url, prop, done, rData) {
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
        };
        AjaxBundle.S_NONE = 1;
        AjaxBundle.S_LOADING = 2;
        AjaxBundle.S_DONE = 3;
        AjaxBundle.S_FAIL = 4;
        return AjaxBundle;
    })();
})(wot || (wot = {}));
//# sourceMappingURL=ajax.js.map
