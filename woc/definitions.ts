/// <reference path="lib/es6-promise.d.ts" />

module Woc {

  // ##
  // ## These interfaces are implemented by the user classes
  // ##

  // Service:
  // constructor: function (sc: Woc.ServiceContext)
  // constructor: function (ac: Woc.ApplicationContext, sc: Woc.ServiceContext)

  /**
   * constructor: function (cc: Woc.ComponentContext, props: any)
   * constructor: function (ac: Woc.ApplicationContext, cc: Woc.ComponentContext, props: any)
   */
  export interface Component {
    attachTo?(...elements: HTMLElement[]): Component;
    detach?(): Component;
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

  export interface Initializer {
    init(): void;
  }

  export interface StartingPointService {
    start(element: HTMLElement): void;
  }

  export interface TemplateEngineService {
    makeProcessor(ctc: ComponentTypeContext, tplStr: string): TemplateProcessor;
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
   * The services that implement this interface can be declared as an alias of Woc.Dialogs
   */
  export interface Dialogs {
    /**
     * @param dialog Woc.Dialog
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

  export interface AppProperties {
    /**
     * The root URL for the Woc application
     */
    wocUrl: string;
    /**
     * The base URL for links to pages or external resources
     */
    baseUrl: string;
  }

  export interface AppConfig extends AppProperties {
    /**
     * The relative URL of the application page to open first
     */
    firstRelUrl: string;
  }

  export interface BundleLoadingOptions {
    name: string;
    version: string;
    autoLoadCss: boolean;
    w: boolean;
  }

  export interface ApplicationContext {
    appConfig: AppConfig;
    appProperties: AppProperties;
    loadBundles(optList: BundleLoadingOptions[]): Promise<void>;
    start(el: HTMLElement, startingPointName: string, preload?: BundleLoadingOptions[]): Promise<void>;
    getDebugTree(): {};
  }

  export interface SingletonContext {
    getService(serviceName: string): any;
    createComponent(st: LiveState, componentName: string, props?: {}): any;
    removeComponent(c: Component, fromDOM?: boolean): void;
    removeComponent(cList: Component[], fromDOM?: boolean): void;
    hasLibrary(libName: string): boolean;
    hasLibrary(libName: string[]): boolean;
    evalLibrary(libName: string): void;
    evalLibrary(libName: string[]): void;
    evalService(serviceName: string): void;
    evalService(serviceName: string[]): void;
    evalComponent(componentName: string): void;
    evalComponent(componentName: string[]): void;
    getName(): string;
    getBaseUrl(): string;
    appConfig: AppConfig;
  }

  export interface ServiceContext extends SingletonContext {
  }

	export interface InitializerContext extends SingletonContext {
	}

  export interface ComponentTypeContext {
    getName(): string;
    getBaseUrl(): string;
  }

  export interface ComponentContext {
    getService(serviceName: string): any;
		createComponent(componentName: string, props?: {}): any;
		createComponent(st: LiveState, componentName: string, props?: {}): any;
    removeComponent(c: Component, fromDOM?: boolean): void;
    removeComponent(cList: Component[], fromDOM?: boolean): void;
    hasLibrary(libName: string): boolean;
    hasLibrary(libName: string[]): boolean;
    evalLibrary(libName: string): void;
    evalLibrary(libName: string[]): void;
    evalService(serviceName: string): void;
    evalService(serviceName: string[]): void;
    evalComponent(componentName: string): void;
    evalComponent(componentName: string[]): void;
    getName(): string;
    getBaseUrl(): string;
    appProperties: AppProperties;
    getLiveState(): LiveState;
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
