/// <reference path='../d.ts/woc.d.ts' />

declare module WocGeneric {

  interface RouteQuery {
    parent?: RouteProperties;
    redirectedFrom?: string;
    queryString: string;
    queryHash: string;
    queryParams: { [index: string]: string; };
  }

  interface RouteProperties extends RouteQuery {
    route: string;
    routeParams: { [index: string]: string; };
    title?: string;
  }

  interface RouteActivator {
    route?: string;
    /**
     * @return a boolean or a Promise<boolean>
     */
    canActivate?(query: RouteQuery) : any;
    /**
     * This callback is required except if a child router is defined
     * @return void (undefined) or a Promise<void>
     */
    activate?(query: RouteProperties): any;
    /**
     * @return a boolean or a Promise<boolean>
     */
    deactivate?(query: RouteProperties) : any;
    /**
     * a string or a callback(query: RouteProperties) that returns a string or a Promise<string>
     */
    title?: any;
    child?: MinimalRouter;
  }

  interface MinimalRouter {
    navigate(queryString: string): Promise<boolean>;
    navigateBack(level?: number): Promise<boolean>;
    /**
     * @param cb returns a boolean or a Promise<boolean>
     * @param curPageOnly default value is FALSE
     */
    addCanLeaveListener(cb: () => any, curPageOnly?: boolean): number;
    removeCanLeaveListener(handle: number): void;
    /**
     * @param curPageOnly default value is FALSE
     */
    addLeaveListener(cb: () => void, curPageOnly?: boolean): number;
    removeLeaveListener(handle: number): void;
  }

  interface ARouter extends MinimalRouter {
    /**
     * @param cb returns a boolean or a Promise<boolean>
     * @param curPageOnly default value is FALSE
     */
    addCanNavigateListener(cb: (query: RouteQuery) => any, curPageOnly?: boolean): number;
    removeCanNavigateListener(handle: number): void;
    /**
     * @param curPageOnly default value is FALSE
     */
    addNavigateListener(cb: (prop: RouteProperties) => void, curPageOnly?: boolean): number;
    removeNavigateListener(handle: number): void;

    map(activators: RouteActivator[]): ARouter;
    mapUnknownRoutes(queryString: string, activator: RouteActivator): ARouter;
    createRouter(): ARouter;
    navigate(queryString: string): Promise<boolean>;
    navigateBack(level?: number): Promise<boolean>;
    start(): Promise<boolean>;
  }






  interface UrlProperties {
    relUrl: string;
    args: {string: string};
    sel: string;
    title?: string;
  }
  interface UrlController {
    fillUrlProperties(props: UrlProperties): boolean;
  }
  interface FirstRouter {
    /**
     *
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
    getCurrentUrlProperties(): UrlProperties;
  }
}
