/// <reference path='../d.ts/woc.d.ts' />
/// <reference path='../WocGeneric.Log.wocs/WocGeneric.Log.d.ts' />

module WocGeneric {
  'use strict';

  export interface RouteQuery {
    parent?: RouteProperties;
    redirectedFrom?: string;
    queryString: string;
    queryHash: string;
    queryParams: { [index: string]: string; };
  }

  export interface RouteProperties extends RouteQuery {
    route: string;
    routeParams: { [index: string]: string; };
    title?: string;
  }

  export interface RouteActivator {
    /**
     * Required if canActivate is not defined
     */
    route?: string;
    /**
     * If this method is defined, then route is ignored
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
     * A string or a callback(query: RouteProperties) that returns a string or a Promise<string>
     */
    title?: any;
    child?: MinimalRouter;
  }

  export interface MinimalRouter {
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

  export class ARouterImpl {
    constructor(private sc: Woc.ServiceContext) {
      this.log = <Woc.Log>sc.getService('Woc.Log');
    }
  }

  export class ARouter implements MinimalRouter {

    // --
    // -- Initialisation
    // --

    private log: Woc.Log;
    private listeners = {};
    private routes = [];
    private baseUrl: string;
    private firstRelUrl: string;
    private withHistory: boolean;
    private withHashBang: boolean;

    private curRouteQuery: RouteQuery;

    constructor() {
    }

    /*  export interface RouteActivator {
    route?: string;
    canActivate?(query: RouteQuery) : any;
    activate?(query: RouteProperties): any;
    deactivate?(query: RouteProperties) : any;
    title?: any;
    child?: MinimalRouter;
  }
*/
    //private static makeCanActivateCb(compiled): Function {
    //  return function (query: RouteQuery) {
    //    return compiled['regexp'].test(query.queryString);
    //  };
    //}

    public map(activators: RouteActivator[]): ARouter {
      var ra, compiledRoute;
      for (var i = 0, len = activators.length; i < len; ++i) {
        ra = activators[i];
        if (!ra.canActivate) {
          if (!ra.route)
            throw Error('Route Activator misses a member "canActivate" or "route"');
          compiledRoute = ARouter.compileRoute(ra.route);
        } else
          compiledRoute = null;
        this.routes.push({
          'ra': ra,
          'compiledRoute': compiledRoute
        });
      }
      return this;
    }

    public mapUnknownRoutes(queryString: string, activator: RouteActivator): ARouter {
    }

    public createRouter(): ARouter {
    }

    public start(): Promise<boolean> {
    }

    // --
    // -- Public - MinimalRouter
    // --

    public navigate(queryString: string): Promise<boolean> {
    }

    public navigateBack(level = 1): Promise<boolean> {
    }

    public addCanLeaveListener(cb: () => any, curPageOnly?: boolean): number {
    }

    public removeCanLeaveListener(handle: number): void {
    }

    public addLeaveListener(cb: () => void, curPageOnly?: boolean): number {
    }

    public removeLeaveListener(handle: number): void {
    }

    // --
    // -- Public
    // --

    public addCanNavigateListener(cb: (query: RouteQuery) => any, curPageOnly?: boolean): number {
    }

    public removeCanNavigateListener(handle: number): void {
    }

    public addNavigateListener(cb: (prop: RouteProperties) => void, curPageOnly?: boolean): number {
    }

    public removeNavigateListener(handle: number): void {
    }

    // --
    // -- Private
    // --


    public start(opt = {}): void {
      // - Options
      this.withHistory = opt['history'] !== false;
      this.withHashBang = opt['hashBang'] ? true : false;
      // - Base URL
      this.baseUrl = this.sc.appConfig.baseUrl;
      if (this.withHashBang)
        this.baseUrl += '#!';
      this.firstRelUrl = this.sc.appConfig.firstRelUrl;
      if (!this.firstRelUrl)
        this.firstRelUrl = ARouter.getDefaultFirstRelUrl(this.baseUrl, this.withHashBang);
      if (this.withHistory) {
        window.onpopstate = (e) => {
          try {
            var queryString = e.state === null ? this.firstRelUrl : e.state['queryString'];
            this.doGoTo(queryString, false);
          } catch (e) {
            this.log.error(e);
          }
        };
      }
      this.doGoTo(this.firstRelUrl, false);
    }

    // --
    // -- Public
    // --

    /**
     * @param cb The listener
     * @returns Function a callback for removing the listener
     */
    public addChangeListener(cb: Function): Function {
      return this.addListener('change', cb);
    }

    /**
     * @param cb The listener
     * @returns Function a callback for removing the listener
     */
    public addBeforeListener(cb: Function): Function {
      return this.addListener('before', cb);
    }

    public goTo(queryString: string): boolean {
      return this.doGoTo(queryString, true);
    }

    public getCurrentRouteQuery(): RouteQuery {
      return this.curRouteQuery;
    }

    // --
    // -- Private
    // --

    private doGoTo(queryString: string, changeHist: boolean): boolean {
      if (!queryString)
        queryString = '/';
      else if (queryString.charAt(0) !== '/')
        queryString = ARouter.appendUrl(this.curRouteQuery ? this.curRouteQuery['queryString'] : '/', queryString);
      if (this.curRouteQuery && this.curRouteQuery['queryString'] === queryString)
        return true;
      var selProp, routeParams, up: RouteQuery = null;
      for (var k in this.routes) {
        if (!this.routes.hasOwnProperty(k))
          continue;
        selProp = this.routes[k];
        routeParams = ARouter.matchRelUrl(queryString, selProp['regex'], selProp['keys']);
        if (routeParams) {
          up = {
            'queryString': queryString,
            'routeParams': routeParams,
            'sel': selProp['sel']
          };
          if (!selProp['urlController'].fillRouteQuery(up))
            return false;
          if (Object.freeze) {
            Object.freeze(routeParams);
            Object.freeze(up);
          }
          break;
        }
      }
      if (up === null)
        return false;
      if (!this.fireListeners('before', up, true))
        return false;
      this.curRouteQuery = up;
      this.fireListeners('change', up);
      if (changeHist && this.withHistory)
        window.history.pushState({'queryString': queryString}, up['title'], this.baseUrl + queryString);
      document.title = up['title'];
      return true;
    }

    private addListener(type: string, cb: Function): Function {
      var listeners = this.listeners[type];
      if (listeners === undefined)
        listeners = this.listeners[type] = [];
      var newId = listeners.length;
      listeners[newId] = cb;
      return () => {
        listeners.splice(newId, 1);
      };
    }

    private fireListeners(type: string, up: RouteQuery, stopOnFalse = false) {
      var listeners = this.listeners[type];
      if (listeners === undefined)
        return true;
      var retFalse;
      for (var i = 0, len = listeners.length; i < len; ++i) {
        retFalse = listeners[i](up) === false;
        if (stopOnFalse && retFalse)
          return false;
      }
      return true;
    }

    private static matchRelUrl(queryString: string, regex: RegExp, keys: {}[]) {
      var m = regex.exec(queryString);
      if (m === null)
        return null;
      var routeParams = {};
      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];
        if (key)
          routeParams[key['name']] = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
      }
      return routeParams;
    }

    private static compileRoute(route: string) {
      var pNames: string[];
      var withStar = route[route.length - 1] === '*';
      if (withStar)
        route = route.slice(0, -1);
      route = route
        .replace(/\(/g, '==par_open==')
        .replace(/\)/g, '==par_close==')
        .replace(/([\/\?&=])?:(\w+)/g, function (_, sep, key) {
          pNames.push(key);
          if (!sep)
            sep = '';
          return sep + '([^\/\?&=]+)';
        })
        .replace(/==par_open==/g, '(?:')
        .replace(/==par_close==/g, ')?')
        .replace(/\*/g, '\\*');
      if (withStar)
        route += '(.*)';
      return {
        regexp: new RegExp('^' + route + '$'),
        pNames: pNames,
        withStar: withStar
      };
    }

    private static appendUrl(a: string, b: string) {
      var trailingSlash = a.slice(-1) === '/';
      if (trailingSlash)
        return b.charAt(0) === '/' ? a + b.slice(1) : a + b;
      return a + '/' + b;
    }

    private static getDefaultFirstRelUrl(baseUrl: string, withHashBang: boolean) {
      if (withHashBang) {
        var hash = window.location.hash;
        if (!hash || hash.length <= 2)
          return '/';
        return hash.slice(2);
      }
      var path = window.location.pathname;
      var baseLen = baseUrl.length;
      if (path.length <= baseLen)
        return '/';
      if (path.slice(0, baseLen) !== baseUrl)
        return '/';
      return path.slice(baseLen);
    }
  }
}
