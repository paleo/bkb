/// <reference path="lib/es6-promise.d.ts" />

module woc {

	// ##
	// ## These interfaces are implemented by the user classes
	// ##

	/**
	 * constructor: function (ac: woc.ApplicationContext)
	 */
	export interface BundleMain {
		start(element): void;
	}

	/**
	 * constructor: function (cc: woc.ComponentContext, props: any)
	 */
	export interface Component {
		compose?(...props): Component;
		setData?(...data): Component;
		getElement?(): HTMLElement;
		reset?(): Component;
		show?(): Component;
		hide?(): Component;
		setEnabled?(b: boolean): Component;
		destructInDOM?(): void;
		destruct?(): void;
	}

	/**
	 * constructor: function (live: boolean)
	 */
	export interface LiveState {
		isLive(): boolean;
		addLiveListener(cb: (live: boolean) => void): Function;
	}

	export interface TemplateEngineService {
		makeProcessor(ctc: woc.ComponentTypeContext, tplStr: string): woc.TemplateProcessor;
	}

	/**
	 * constructor: function (ctc: ComponentTypeContext, tplStr: string)
	 */
	export interface TemplateProcessor {
		getContextMethods(): {[index: string]: Function};
	}

	export interface Dialog {
		getDialogElement(): any;
		setDialogOpened(): void;
		setDialogClosed(): void;
	}

	/**
	 * The services that implement this interface can be declared as an alias of woc.Dialogs
	 */
	export interface Dialogs {
		/**
		 * @param dialog woc.Dialog
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
		showInfo(msgHtml: string): void;
		showWarning(msgHtml: string): void;
		reportError(e): void;
		/**
		 * @param msgHtml
		 * @param buttonList [{'label': string, 'callback': Function, 'ajax'?: boolean}]
		 */
		showConfirm(msgHtml: string, buttonList: any[]): void;
	}

	// ##
	// ## Contexts
	// ##

	export interface ApplicationContext {
		properties: {};
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
		 * 	'autoLoadCss': boolean,
		 * 	'version': string,
		 * 	'w': boolean,
		 * 	'start': -DOM-element-,
		 * 	'done': Function,
		 * 	'fail': Function
		 * }</pre>
		 * @param bundlePath
		 * @param opt
		 */
		loadBundle(bundlePath: string, opt?: {}): Promise<void>;
		hasLib(libName): boolean;
		includeLib(libName): boolean;
		requireLib(libName: any): void;
		requireService(serviceName: string): void;
		requireComponent(componentName: string): void;
		getDebugTree(): {};
	}

	export interface ServiceContext {
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

	export interface ComponentTypeContext {
		getApplicationContext(): ApplicationContext;
		getComponentName(): string;
		getComponentBaseUrl(): string;
		createOwnComponent(props: {}, st: LiveState): any;
	}

	export interface ComponentContext {
		getApplicationContext(): ApplicationContext;
		getLiveState(): LiveState;
		getComponentName(): string;
		getComponentBaseUrl(): string;
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

	// ##
	// ## Ajax service
	// ##
	
	export interface Ajax {
		/**
		 * * method: 'GET|POST|PUT|DELETE|HEAD'
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		ajax(method: string, url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		get(url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		head(url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		post(url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		put(url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;

		/**
		 * * rDataType: 'json|script|text' [default: 'json']
		 * * sAsJson: contains the parameter name
		 */
		delete(url: string, opt?: {
					sData?: {};
					rDataType?: string;
					sAsJson?: string;
				}): Promise<any>;
	}

	// ##
	// ## Log service
	// ##
	
	export interface Log {
		/**
		*
		* @param cb This function must return TRUE if the message is successfully logged
		*/
		addListener(cb: Function): void;
		error(msg: string, stack?: any): void;
		info(msg: any): void;
		warning(msg: any): void;
		trace(msg: string): void;
		unexpectedErr(err: any): void;
	}

	// ##
	// ## Router service
	// ##

	export interface UrlProps {
		relUrl: string;
		args: {string: string};
		sel: string;
		title?: string;
	}

	export interface UrlController {
		fillUrlProps(props: UrlProps): boolean;
	}

	export interface Router {
		/**
		* @param selList
		* @param urlController
		* @returns Function A callback that deletes the added selectors
		*/
		addSelectors(selList: string[], urlController: UrlController): Function;
		start(opt?: {}): void;
		/**
		* @param cb The listener
		* @returns Function a callback for removing the listener
		*/
		addChangeListener(cb: Function): Function;
		/**
		* @param cb The listener
		* @returns Function a callback for removing the listener
		*/
		addBeforeListener(cb: Function): Function;
		goTo(relUrl: string): boolean;
		getCurrentUrlProps(): UrlProps;
	}
}
