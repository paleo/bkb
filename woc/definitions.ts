/// <reference path="lib/es6-promise.d.ts" />

module Woc {

  // --
  // -- Embed
  // --

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

  export interface Initializer {
    init(): void;
  }

  // --
  // -- Core defined Services
  // --

  export interface StartingPoint {
    start(element: HTMLElement): void;
  }

  /**
   * The services that implement this interface can be declared as an alias of Woc.Log
   */
  export interface Log {
    error(msg: any): void;
    info(msg: any): void;
    warning(msg: any): void;
    trace(msg: any): void;
    wrap(cb: () => void): void;
  }

  export interface TemplateEngine {
    makeProcessor(tplStr: string, prop: EmbedProperties): TemplateProcessor;
  }

  /**
   * constructor: function (ctc: ComponentTypeContext, tplStr: string)
   */
  export interface TemplateProcessor {
    getContextMethods(): {[index: string]: Function};
  }


  // --
  // -- Contexts
  // --

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

  export interface EmbedProperties {
    name: string;
    baseUrl: string;
  }

  export interface EmbedContext {
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

  export interface ServiceContext extends EmbedContext {
    appConfig: AppConfig;
  }

  export interface InitializerContext extends EmbedContext {
    appConfig: AppConfig;
  }

  export interface ComponentContext extends EmbedContext {
    appProperties: AppProperties;
  }

  // --
  // -- The Ajax service
  // --

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
}
