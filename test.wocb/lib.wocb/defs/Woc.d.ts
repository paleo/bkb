/// <reference path='es6-promise.d.ts' />

declare module Woc {

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
  interface Component {
    attachTo?(...elements: HTMLElement[]): void;
    destructInDOM?(): void;
    destruct?(): void;
  }

  interface Initializer {
    init(): void;
  }

  interface StartingPoint {
    start(el: HTMLElement): void;
  }

  /**
   * The services that implements this interface can be declared as an alias of Woc.Log
   */
  interface Log {
    log(something: any): void;
    error(err: any): void;
    warn(msg: any): void;
    info(msg: any): void;
    debug(msg: any): void;
  }

  interface TemplateEngine {
    makeProcessor(tplStr: string, prop: EmbedProperties): TemplateProcessor;
  }

  /**
   * constructor: function (ctc: ComponentTypeContext, tplStr: string)
   */
  interface TemplateProcessor {
    getContextMethods(): {[index: string]: Function};
    destruct(context: Woc.ComponentContext): void;
  }

  /**
   * The services that implements this interface can be declared as an alias of Woc.Router
   * Copy of EasyRouter.MinimalRouter
   */
  export interface Router {
    navigate(queryString: string): Promise<boolean>;
    navigateToUnknown(): Promise<boolean>;
    navigateBack(level?: number): Promise<boolean>;
    /**
     * @param cb returns a boolean or a Promise&lt;boolean&gt;
     * @param onNavRm default value is FALSE
     */
    addCanLeaveListener(cb: () => any, onNavRm?: boolean): number;
    removeCanLeaveListener(handle: number): void;
    /**
     * @param onNavRm default value is FALSE
     */
    addLeaveListener(cb: () => void, onNavRm?: boolean): number;
    removeLeaveListener(handle: number): void;
  }

  // ##
  // ## Contexts
  // ##

  interface AppProperties {
    /**
     * The root URL for the Woc application
     */
    wocUrl: string;
    /**
     * The base URL for links to pages or external resources
     */
    baseUrl: string;
  }

  interface AppConfig extends AppProperties {
    encoding: string;
    /**
     * The relative URL of the application page to open first
     */
    firstRelUrl: string;
  }

  interface BundleLoadingOptions {
    name: string;
    version: string;
    autoLoadCss: boolean;
    w: boolean;
  }

  interface ApplicationContext {
    appConfig: AppConfig;
    appProperties: AppProperties;
    loadBundles(optList: BundleLoadingOptions[]): Promise<void>;
    start(el: HTMLElement, startingPointName: string, preload?: BundleLoadingOptions[]): Promise<void>;
    getDebugTree(): {};
  }

  interface EmbedProperties {
    name: string;
    baseUrl: string;
  }

  export interface EmbedContext {
    log: Log;
    logWrap(cb: () => any): any;
    getService(serviceName: string): any;
    getService<S>(serviceName: string): S;
    createComponent(componentName: string, props?: any): any;
    createComponent<C>(componentName: string, props?: any): C;
    /**
     * @param c
     * @param fromDOM default is FALSE
     */
    removeComponent(c: Component, fromDOM?: boolean): void;
    /**
     * @param cList
     * @param fromDOM default is FALSE
     */
    removeComponent(cList: Component[], fromDOM?: boolean): void;
    getChildComponents(): Component[];
    callChildComponents(methodName, ...args: any[]): any[];
    hasExternLib(libName: string): boolean;
    hasExternLib(libName: string[]): boolean;
    evalExternLib(libName: string): void;
    evalExternLib(libName: string[]): void;
    evalService(serviceName: string): void;
    evalService(serviceName: string[]): void;
    evalComponent(componentName: string): void;
    evalComponent(componentName: string[]): void;
    getName(): string;
    getBaseUrl(): string;
    getOwner(): {};
  }

  interface ServiceContext extends EmbedContext {
    appConfig: AppConfig;
  }

  interface InitializerContext extends EmbedContext {
    appConfig: AppConfig;
  }

  interface ComponentContext extends EmbedContext {
    appProperties: AppProperties;
  }

  // ##
  // ## Ajax service
  // ##

  interface AjaxConfig {
    method?: string;
    url?: string;
    data?: any;
    headers?: { [index: string]: any };
    timeout?: number;
    /**
     * See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#responseType
     */
    responseType?: string;
  }

  interface AjaxResponse {
    data?: any;
    status: number;
    headers: () => { [index: string]: any };
    config: AjaxConfig;
    statusText: string;
  }

  interface Ajax {
    ajax(config: AjaxConfig): Promise<AjaxResponse>;
    get(url: string, config?: AjaxConfig): Promise<AjaxResponse>;
    head(url: string, config?: AjaxConfig): Promise<AjaxResponse>;
    post(url: string, data: any, config?: AjaxConfig): Promise<AjaxResponse>;
    put(url: string, data: any, config?: AjaxConfig): Promise<AjaxResponse>;
    delete(url: string, config?: AjaxConfig): Promise<AjaxResponse>;
  }
}

// ##
// ## Utils
// ##

declare module Woc {
  function globalEval(script: string): void;
  function toClass(s: string): any;
}
