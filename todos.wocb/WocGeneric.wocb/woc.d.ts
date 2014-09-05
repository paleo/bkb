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
    attachTo?(...elements: HTMLElement[]): Component;
    detach?(): Component;
    show?(): Component;
    hide?(): Component;
    setEnabled?(b: boolean): Component;
    destructInDOM?(): void;
    destruct?(): void;
  }

  interface Initializer {
    init(): void;
  }

  interface StartingPoint {
    start(element: HTMLElement): void;
  }

  /**
   * The services that implements this interface can be declared as an alias of Woc.Log
   */
  interface Log {
    error(msg: any): void;
    info(msg: any): void;
    warning(msg: any): void;
    trace(msg: any): void;
    wrap(cb: () => void): void;
  }

  interface TemplateEngine {
    makeProcessor(tplStr: string, prop: EmbedProperties): TemplateProcessor;
  }

  /**
   * constructor: function (ctc: ComponentTypeContext, tplStr: string)
   */
  interface TemplateProcessor {
    getContextMethods(): {[index: string]: Function};
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

  interface EmbedContext {
    getService<S>(serviceName: string): S;
    getService(serviceName: string): any;
    createComponent<C>(componentName: string, props?: {}): C;
    createComponent(componentName: string, props?: {}): any;
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

  interface Ajax {
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
}

// ##
// ## Utils
// ##

declare module Woc {
  function globalEval(script: string): void;
  function toClass(s: string): any;
}
