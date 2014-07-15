declare module woc {
    class Ajax {
        private log;
        private listeners;
        private runningCount;
        constructor(sc: ServiceContext);
        public addListener(cb: Function): void;
        /**
        * <pre><code>opt = {
        *     'get'?: {
        *         'baseUrl'?: string,
        *         'rDataType'?: 'json|script|css|text|detect',
        *         'attempts'?: integer // on XHR fail or malformed received JSON
        *     },
        *     'post'?: {
        *         'url'?: string,
        *         'rDataType'?: 'json|script|css|text|detect',
        *         'sAsJson'?: string, // contains the parameter name
        *         'attempts'?: integer // on XHR fail or HTTP 400 or malformed received JSON
        *     }
        * }</code></pre>
        */
        public createCustom(opt: any): CustomAjax;
        /**
        * <pre><code>opt = {
        *     'method': 'GET|POST|PUT|DELETE',
        *     'url': string,
        *     'sData'?: {},
        *     'done'?: Function,
        *     'fail'?: Function,
        *     'rDataType'?: 'json|script|css|text|detect', [default: 'json']
        *     'sAsJson'?: string, // contains the parameter name
        *     'attempts'?: integer [default: 1] // on XHR fail or malformed received JSON // TODO
        * }</code></pre>
        */
        public ajax(opt: any): void;
        /**
        * <pre><code>opt = {
        *     'url': string,
        *     'sData'?: {},
        *     'done'?: Function,
        *     'fail'?: Function,
        *     'rDataType'?: 'json|script|css|text|detect', [default: 'json']
        *     'attempts'?: integer [default: 1] // on XHR fail or malformed received JSON
        * }</code></pre>
        */
        public get(opt: any): void;
        /**
        * <pre><code>bundleOpt = {
        *     'urls': [opt],
        *     'done'?: Function,
        *     'fail'?: Function
        * }</code></pre>
        */
        public bundleAjax(bundleOpt: any): void;
        /**
        * <pre><code>opt = {
        *     'url': string,
        *     'sData'?: {},
        *     'done'?: Function,
        *     'fail'?: Function,
        *     'rDataType'?: 'json|script|css|text|detect', [default: 'json']
        *     'sAsJson'?: string, // contains the parameter name
        *     'attempts'?: integer [default: 1] // on XHR fail or HTTP 400 or malformed received JSON
        * }</code></pre>
        */
        public post(opt: any): void;
        /**
        * <pre><code>opt = {
        *     'url': string,
        *     'sData'?: {},
        *     'sFiles': {}[],
        *     'done'?: Function,
        *     'fail'?: Function,
        *     'rDataType'?: 'json|script|css|text|detect', [default: 'json']
        *     'sAsJson'?: string, // contains the parameter name
        *     'attempts'?: integer [default: 1] // on XHR fail or HTTP 400 or malformed received JSON
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
        *     'get'?: {
        *         'baseUrl'?: string,
        *         'rDataType'?: 'json|script|text|detect',
        *         'attempts'?: integer // on XHR fail or malformed received JSON
        *     },
        *     'post'?: {
        *         'url'?: string,
        *         'rDataType'?: 'json|script|text|detect',
        *         'sAsJson'?: string, // contains the parameter name
        *         'attempts'?: integer // on XHR fail or HTTP 400 or malformed received JSON
        *     }
        * }</code></pre>
        */
        constructor(ajaxSrv: Ajax, defaultOpt: any);
        public ajax(opt: any): void;
        public get(opt: any): void;
        /**
        * <pre><code>bundleOpt = {
        *     'urls': [opt],
        *     'done'?: Function,
        *     'fail'?: Function
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
declare module woc {
    interface BundleMain {
        start(element: any): void;
    }
    interface Component {
        compose?(...props: any[]): Component;
        setData?(...data: any[]): Component;
        getElement?(): HTMLElement;
        reset?(): Component;
        show?(): Component;
        hide?(): Component;
        setEnabled?(b: boolean): Component;
        destruct?(removeFromDOM: boolean): void;
    }
    interface LiveState {
        isLive(): boolean;
        addLiveListener(cb: (live: boolean) => void): void;
    }
    interface Dialog {
        getDialogElement(): any;
        setDialogOpened(): void;
        setDialogClosed(): void;
    }
    /**
    * The services that implement this interface can be declared as an alias of woc.Dialogs
    */
    interface Dialogs {
        /**
        * @param dialog woc.Dialog
        * @param forcedOpen boolean
        * @param hideBelow boolean
        * @returns {number} The dialog ID
        */
        addDialog(dialog: Dialog, forcedOpen?: any, hideBelow?: any): number;
        openDialog(dialogId: number): void;
        closeDialog(dialogId: number): boolean;
        removeDialog(dialogId: number): void;
        /**
        *
        * @param dialogElem
        * @param setClosedCallback
        * @param forcedOpen boolean
        * @param hideBelow boolean
        * @returns Function A callback for closing the dialog (the callback returns TRUE when dialog is closed, FALSE when the dialog remains)
        */
        openDisposableDialog(dialogElem: any, setClosedCallback?: Function, forcedOpen?: any, hideBelow?: any): Function;
        clearDialogs(): boolean;
        showInfo(msgHtml: string): void;
        showWarning(msgHtml: string): void;
        reportError(e: any): void;
        /**
        * @param msgHtml
        * @param buttonList [{'label': string, 'callback': Function, 'ajax'?: boolean}]
        */
        showConfirm(msgHtml: string, buttonList: any[]): void;
    }
    interface ApplicationContext {
        properties: {}
        isDebug(): boolean;
        getService(serviceName): any;
        createComponent(componentName: string, props: {}, st: LiveState): any;
        removeComponent(c: Component, fromDOM?: boolean): void;
        removeComponent(cList: Component[], fromDOM?: boolean): void;
        getServiceContext(serviceName: string): ServiceContext;
        getComponentTypeContext(componentName: string): ComponentTypeContext;
        /**
         * Available options:
         * <pre>{
         *     'autoLoadCss': boolean,
         *     'version': string,
         *     'w': boolean,
         *     'start': -DOM-element-,
         *     'done': Function,
         *     'fail': Function
         * }</pre>
         * @param bundlePath
         * @param opt
         */
        loadBundle(bundlePath: string, opt?: {}): void;
        hasLib(libName): boolean;
        includeLib(libName): boolean;
        requireLib(libName: any): void;
        requireService(serviceName: string): void;
        requireComponent(componentName: string): void;
        getDebugTree(): {};
    }
    interface ServiceContext {
        getApplicationContext(): ApplicationContext;
        getServiceName(): string;
        getServiceBaseUrl(): string;
        getOwnService(): any;
        getService(serviceName): any;
        createComponent(componentName: string, props: {}, st: LiveState): any;
        removeComponent(c: Component, fromDOM?: boolean): void;
        removeComponent(cList: Component[], fromDOM?: boolean): void;
        hasLib(libName): boolean;
        includeLib(libName): boolean;
        requireLib(libName): void;
        requireService(serviceName): void;
        requireComponent(componentName): void;
    }
    interface ComponentContext {
        getApplicationContext(): ApplicationContext;
        getLiveState(): LiveState;
        getComponentName(): string;
        getComponentBaseUrl(): string;
        getTemplate(sel: string, elMap?: {}): HTMLElement;
        createOwnComponent(props?: {}, st?: LiveState): any;
        createComponent(componentName: string, props?: {}, st?: LiveState): any;
        removeComponent(c: Component, fromDOM?: boolean): void;
        removeComponent(cList: Component[], fromDOM?: boolean): void;
        removeOwnComponent(fromDOM?: boolean): void;
        getService(serviceName): any;
        hasLib(libName): boolean;
        includeLib(libName): boolean;
        requireLib(libName): void;
        requireService(serviceName): void;
        requireComponent(componentName): void;
    }
    interface ComponentTypeContext {
        getComponentName(): string;
        getComponentBaseUrl(): string;
        getTemplate(sel: string, elMap?: {}): HTMLElement;
        createOwnComponent(props: {}, st: LiveState): any;
    }
}
declare module woc {
    class Log {
        private hasConsole;
        private debug;
        private listeners;
        constructor(sc: ServiceContext);
        /**
        *
        * @param cb This function must return TRUE if the message is successfully logged
        */
        public addListener(cb: Function): void;
        public error(msg: string, stack?: any): void;
        public info(msg: any): void;
        public warning(msg: any): void;
        public trace(msg: string): void;
        public unexpectedErr(err: any): void;
        private fireEvent(type, msg, errStack?);
    }
}
declare module woc {
    interface UrlProps {
        relUrl: string;
        args: {
            string: string;
        };
        sel: string;
        title?: string;
    }
    interface UrlController {
        fillUrlProps(props: UrlProps): boolean;
    }
    class Router {
        private sc;
        private log;
        private listeners;
        private selList;
        private baseUrl;
        private firstRelUrl;
        private withHistory;
        private withHashBang;
        private curUrlProps;
        constructor(sc: ServiceContext);
        /**
        *
        * @param selList
        * @param urlController
        * @returns Function A callback that deletes the added selectors
        */
        public addSelectors(selList: string[], urlController: UrlController): Function;
        public start(opt?: {}): void;
        /**
        * @param cb The listener
        * @returns Function a callback for removing the listener
        */
        public addChangeListener(cb: Function): Function;
        /**
        * @param cb The listener
        * @returns Function a callback for removing the listener
        */
        public addBeforeListener(cb: Function): Function;
        public goTo(relUrl: string): boolean;
        public getCurrentUrlProps(): UrlProps;
        private doGoTo(relUrl, changeHist);
        private addListener(type, cb);
        private fireListeners(type, up, stopOnFalse?);
        private static matchRelUrl(relUrl, regex, keys);
        private static pathToRegexp(path, keys, sensitive, strict);
        private static appendUrl(a, b);
        private static getDefaultFirstRelUrl(baseUrl, withHashBang);
    }
}
