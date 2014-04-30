declare module wot {
	class Ajax {
		public addListener(callback: any): void;

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
	}
	class CustomAjax {
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
	}

	interface BundleMain {
		start(element): void;
	}
	interface Component {
		compose?(...props: any): Component;
		setData?(...data: any): Component;
		getElement?(): HTMLElement;

		show?(): Component;
		hide?(): Component;
		setEnabled?(b: boolean): Component;

		destroy(): void;
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
	 * The services that implement this interface can be declared as an alias of wot.Dialogs
	 */
	interface Dialogs {
		/**
		 * @param dialog wot.Dialog
		 * @param forcedOpen boolean
		 * @param hideBelow boolean
		 * @returns {number} The dialog ID
		 */
		addDialog(dialog: Dialog, forcedOpen?, hideBelow?): number;
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
		openDisposableDialog(dialogElem, setClosedCallback?: Function, forcedOpen?, hideBelow?): Function;
		clearDialogs(): boolean;
		showInfo(msgHtml: string): any;
		showWarning(msgHtml: string): any;
		reportError(e: any): any;
		/**
		 * @param msgHtml
		 * @param buttonList [{'label': string, 'callback': Function, 'ajax'?: boolean}]
		 */
		showConfirm(msgHtml: string, buttonList: any[]);
	}
	class ApplicationContext {
		public properties: {
		};

		public isDebug(): boolean;

		public getService(serviceName: any): any;

		public createComponent(st: LiveState, componentName: string, opt?: {}): any;

		public getServiceContext(serviceName: string): ServiceContext;

		public getComponentContext(componentName: string): ComponentContext;

		public loadBundle(bundlePath: string, opt?: {}): void;

		public hasLib(libName): boolean;
		public includeLib(libName): boolean;
		public requireLib(libName): void;

		public requireComponent(componentName): void;

		public requireService(serviceName): void;
	}
	class ServiceContext {
		public getApplicationContext(): ApplicationContext;

		public getServiceName(): string;

		public getServiceBaseUrl(): string;

		public getOwnService(): any;

		public getService(serviceName: any): any;

		public createComponent(st: LiveState, componentName: string, opt?: {}): any;

		public hasLib(libName): boolean;
		public includeLib(libName): boolean;
		public requireLib(libName): void;

		public requireComponent(componentName): void;

		public requireService(serviceName): void;
	}
	class ComponentContext {
		public getApplicationContext(): ApplicationContext;

		public getComponentName(): string;

		public getComponentBaseUrl(): string;

		public getTemplate(sel: string, elMap?: {}): any;

		public createOwnComponent(st: LiveState, opt?: {}): any;

		public createComponent(st: LiveState, componentName: string, opt?: {}): any;

		public getService(serviceName: any): any;

		public hasLib(libName): boolean;
		public includeLib(libName): boolean;
		public requireLib(libName): void;

		public requireComponent(componentName): void;

		public requireService(serviceName): void;
	}

	/**
	 * A readable dataset
	 */
	interface RDataset {
		getPath(): string;
		getId(): string;
		reqId(): string;
		getIdAsInt(): number;
		reqIdAsInt(): number;
		getIndex(): number;
		reqIndex(): number;
		/**
		 * @param level Default value is 1
		 */
		getParent(level?: number): any;
		/**
		 * @param relPath (optional) A relative path (string)
		 * @returns Array An ordered list of children. Always an array. An empty array is returned when relPath doesn't exists or doesn't contains an array
		 */
		toList(relPath?: string): any[];
		each(relPath: string, callback: Function): any;
		each(callback: Function): any;
		toPojo(relPath?: string): any;
		/**
		 * @param relPathOrIndex
		 * @returns any The value (a simple type or a Dataset), or undefined if not found
		 */
		get(relPathOrIndex: any): any;
		/**
		 * Same as get() but throws an error if undefined
		 */
		req(relPathOrIndex: any): any;
		isEmpty(relPath?: string): boolean;
		has(relPath: string): boolean;
		query(query: {
		}): DatasetQueryResult;
		addChangeListener(callback: Function): Function;
		addTopChangeListener(callback: Function): Function;
		addDeepChangeListener(callback: Function): Function;
	}
	interface Dataset extends RDataset {
		disengageListeners(): void;
		fireListeners(): void;
		toReadOnly(): RDataset;
		inc(relPath: string): number;
		dec(relPath: string): number;
		rm(relPath?: any): boolean;
		detach(): any;
		put(relPath: string, data: any, recursCreate?: any): string;
		reset(data: any): any;
		orderedInsert(relPath: string, data: any, index?: number): any;
		setChildIndices(indices: number[]): any;
		putComputedProperty(id: string, callback: Function): void;
	}
	interface DatasetQueryResult {
		toList(): any[];
		each(callback: Function): void;
	}
	/**
	 *
	 * @param jsonObjOrArr Array|Object
	 * @param opt Object {'indexedMapProp': '_index'}
	 * @returns {wotext.Dataset}
	 */
	function createDataset(jsonObjOrArr: any, opt?: {
	}): Dataset;

	class DatasetHelper {
		static isArray(data: any): boolean;

		static cloneData(o: any): any;

		static jsonParse(s: any): any;

		static jsonStringify(o: any): string;
	}

	class Log {
		public addListener(callback: any): void;

		public error(msg: string, stack?: any): void;

		public info(msg: any): void;

		public warning(msg: any): void;

		public trace(msg: string): void;

		public unexpectedErr(err: any): void;
	}

	interface UrlProps {
		relUrl: string;
		args: {string: string};
		sel: string;
		title?: string;
	}

	interface UrlController {
		fillUrlProps(props: UrlProps): boolean;
	}
	class Router {
		public addSelectors(selList: string[], urlTitleProvider: UrlController): Function;

		public start(opt?: {
		}): void;

		/**
		 * @param callback The listener
		 * @returns Function a callback for removing the listener
		 */
		public addChangeListener(callback: Function): Function;

		/**
		 * @param callback The listener
		 * @returns Function a callback for removing the listener
		 */
		public addBeforeListener(callback: Function): Function;

		public goTo(relUrl: string): boolean;

		public getCurrentUrlProps(): UrlProps;
	}
}
