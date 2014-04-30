/// <reference path="loader.d.ts" />
/// <reference path="log.d.ts" />
declare module wot {
    class Ajax {
        private log;
        private listeners;
        private runningCount;
        constructor(sc: ServiceContext);
        public addListener(cb: Function): void;
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
        public createCustom(opt: any): CustomAjax;
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
        public ajax(opt: any): void;
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
        public get(opt: any): void;
        /**
        * <pre><code>bundleOpt = {
        * 	'urls': [opt],
        * 	'done'?: Function,
        * 	'fail'?: Function
        * }</code></pre>
        */
        public bundleAjax(bundleOpt: any): void;
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
        public post(opt: any): void;
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
        public upload(opt: any): void;
        private doAjax(method, opt);
        private safelyDone(rData, statusCode, rDataType, opt);
        private safelyFail(statusCode, statusText, opt);
        private safelyUpdateStatus(running);
        private static doXHR(method, url, sData, rDataType, doneCallback, failCallback);
        private static jsonParse(s);
        private static jsonStringify(o);
        private static isArray(data);
    }
    class CustomAjax {
        private ajaxSrv;
        private defaultGet;
        private defaultPost;
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
        constructor(ajaxSrv: Ajax, defaultOpt: any);
        public ajax(opt: any): void;
        public get(opt: any): void;
        /**
        * <pre><code>bundleOpt = {
        * 	'urls': [opt],
        * 	'done'?: Function,
        * 	'fail'?: Function
        * }</code></pre>
        */
        public bundleAjax(bundleOpt: any): void;
        public post(opt: any): void;
        public upload(opt: any): void;
        private makeAjaxOpt(opt);
        private makeGetOpt(opt, withMethod);
        private makePostOpt(opt, withMethod);
    }
}
