/// <reference path='../d.ts/woc.d.ts' />
/// <reference path='../WocGeneric.Log.wocs/WocGeneric.Log.d.ts' />

module WocGeneric {
  'use strict';

  export interface RouteQuery {
    //parent?: RouteQuery;
    redirectedFrom?: string;
    queryString: string;
    queryHash: string;
    queryParams: { [index: string]: string; };
    route?: string;
    routeParams?: { [index: string]: string; };
    processedQueryString?: string;
    remainingQueryString?: string;
    title?: string;
  }

  export interface RouteActivator {
    /**
     * Required if canActivate is not defined
     */
    route?: string;
    /**
     * @return any a boolean or a Promise&lt;boolean&gt;
     */
    canActivate?(query: RouteQuery) : any;
    /**
     * This callback is required except if a child router is defined
     * @return any void (undefined) or a Promise&lt;void&gt;
     */
    activate?(query: RouteQuery): any;
    /**
     * @return any a boolean or a Promise&lt;boolean&gt;
     */
    deactivate?(query: RouteQuery) : any;
    /**
     * A string or a callback(query: RouteProperties) that returns a string or a Promise&lt;string&gt;
     */
    title?: any;
    child?: MinimalRouter;
  }

  export interface MinimalRouter {
    navigate(queryString: string, baseUrl?: string): Promise<boolean>;
    navigateBack(level?: number): Promise<boolean>;
    leave(): Promise<boolean>;
    /**
     * @param cb returns a boolean or a Promise&lt;boolean&gt;
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

    public createRouter(): ARouter {
    }


    public start(opt = {}): Promise<boolean> {
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
            this.doNavigate(queryString, false);
          } catch (e) {
            this.log.error(e);
          }
        };
      }
      this.doNavigate(this.firstRelUrl, false);
    }
  }

  interface CompiledRoute {
    regexp: RegExp;
    pNames: string[];
    withStar: boolean;
  }

  interface Route {
    activator: RouteActivator;
    compiledRoute: CompiledRoute;
  }

  interface MatchingRoute {
    route: Route;
    completedQuery: RouteQuery;
  }

  export class ARouter implements MinimalRouter {

    // --
    // -- Initialisation
    // --

    private routes: Route[] = [];
    private unknownRoutes;
    private listeners = {};

    private curRouteQuery: RouteQuery;
    private curChild: MinimalRouter;


    private baseUrl: string;
    private firstRelUrl: string;
    private withHistory: boolean;
    private withHashBang: boolean;


    constructor(private log: Woc.Log) {
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
        if (ra.route)
          compiledRoute = ARouter.compileRoute(ra.route);
        else {
          if (!ra.canActivate)
            throw Error('Missing route');
          compiledRoute = null;
        }
        this.routes.push({
          activator: ra,
          compiledRoute: compiledRoute
        });
      }
      return this;
    }

    public mapUnknownRoutes(queryString: string, activator: RouteActivator): ARouter {
      this.unknownRoutes = {
        'queryString': queryString,
        'activator': activator
      };
      return this;
    }

    // --
    // -- Public - MinimalRouter
    // --

    public navigate(queryString: string): Promise<boolean> {
      return this.doNavigate(queryString, true);
    }

    public navigateBack(level = 1): Promise<boolean> {
    }

    public addCanLeaveListener(cb: () => any, curPageOnly?: boolean): number {
      return this.addListener('canLeave', cb);
    }

    public removeCanLeaveListener(handle: number): void {
      return this.removeListener('canLeave', handle);
    }

    public addLeaveListener(cb: () => void, curPageOnly?: boolean): number {
      return this.addListener('leave', cb);
    }

    public removeLeaveListener(handle: number): void {
      return this.removeListener('leave', handle);
    }

    // --
    // -- Public
    // --

    public addCanNavigateListener(cb: (query: RouteQuery) => any, curPageOnly?: boolean): number {
      return this.addListener('canNavigate', cb); // TODO curPageOnly
    }

    public removeCanNavigateListener(handle: number): void {
      return this.removeListener('canNavigate', handle);
    }

    public addNavigateListener(cb: (query: RouteQuery) => void, curPageOnly?: boolean): number {
      return this.addListener('navigate', cb); // TODO curPageOnly
    }

    public removeNavigateListener(handle: number): void {
      return this.removeListener('navigate', handle);
    }

    // --
    // -- Private - Routes
    // --

    private doNavigate(queryString: string, changeHist: boolean): Promise<boolean> {
      var query = this.makeRouteQuery(queryString);
      if (this.curRouteQuery && this.curRouteQuery.queryString === query.queryString)
        return Promise.resolve<boolean>(true);
      var p = this.fireListeners('canLeave', undefined, true);
      return p.then((can: boolean): any => {
        if (!can)
          return false;
        return this.searchRoute(query).then<boolean>((matching: MatchingRoute): any => {
          if (matching === null)
            return false;
          return this.fireListeners('canNavigate', matching.completedQuery, true).then((can: boolean): any => {
            if (!can)
              return false;
            return this.doNavigateGo(matching, changeHist);
          });
        });
      });
    }

    private doNavigateGo(matching: MatchingRoute, changeHist: boolean): Promise<boolean> {
      var activator = matching.route.activator,
        completed = matching.completedQuery,
        p: Promise<boolean>;
      // - Case of a child router
      if (activator.child) {
        if (this.curChild && this.curChild !== activator.child)
          p = this.curChild.leave();
        else
          p = Promise.resolve<boolean>(true);
        return p.then<boolean>((done: boolean): any => {
          if (!done)
            return false;
          var baseUrl = this.toUrl(completed.processedQueryString);
          return activator.child.navigate(completed.remainingQueryString, baseUrl).then((done: boolean) => {
            this.curChild = activator.child;
            if (done)
              this.doNavigateNewRouteQuery(completed);
            return done;
          });
        });
      }
      // - Switch to the new route
      if (this.curChild) {
        p = this.curChild.leave();
        this.curChild = null;
      } else
        p = Promise.resolve<boolean>(true);
      return p.then<boolean>((done: boolean) => {
        if (!done)
          return false;
        // - Get the title
        var title: string;
        if (!activator.title)
          title = null;
        else if (typeof activator.title === 'string')
          title = activator.title;
        else
          title = activator.title(completed);
        // - New route
        this.doNavigateNewRouteQuery(ARouter.makeFinalRouteQuery(completed, title));
        activator.activate(this.curRouteQuery);
        if (changeHist && this.withHistory) {
          window.history.pushState(
            this.curRouteQuery.redirectedFrom || this.curRouteQuery.queryString,
            this.curRouteQuery.title,
            this.toUrl(completed.queryString)
          );
        }
        document.title = this.curRouteQuery.title;
        return true;
      });
    }

    private toUrl(queryString: string): string {
      return this.baseUrl + queryString;
    }

    private doNavigateNewRouteQuery(query: RouteQuery) {
      this.curRouteQuery = query;
      this.fireListeners('leave', undefined, false).catch((err) => {
        this.log.error(err);
      });
      this.fireListeners('navigate', query, false).catch((err) => {
        this.log.error(err);
      });
    }

    /**
     * @return any[] NULL or the Route and completed RouteQuery
     */
    private searchRoute(query: RouteQuery): Promise<MatchingRoute> {
      var r: Route,
        completed: RouteQuery,
        matching: MatchingRoute,
        activated: any,
        pendingList = [];
      for (var k in this.routes) {
        if (!this.routes.hasOwnProperty(k))
          continue;
        r = this.routes[k];
        if (r.compiledRoute) {
          completed = ARouter.makeCompletedRouteQuery(query, r.compiledRoute, r.activator.route);
          if (!completed)
            continue;
        } else
          completed = query;
        matching = {
          route: r,
          completedQuery: completed
        };
        if (!r.activator.canActivate) {
          if (pendingList.length === 0)
            return Promise.resolve<MatchingRoute>(matching);
          pendingList.push([Promise.resolve(true), matching]);
          break;
        }
        activated = r.activator.canActivate(completed);
        if (activated === false)
          continue;
        if (activated === true) {
          if (pendingList.length === 0)
            return Promise.resolve<MatchingRoute>(matching);
          pendingList.push([Promise.resolve(true), matching]);
          break;
        } else
          pendingList.push([activated, matching]); // activated is a promise
      }
      // - Wait promises
      var makeThenCb = function (matching: MatchingRoute, deeper: Promise<MatchingRoute>) {
        return function (activated: boolean): any {
          return activated ? matching : deeper;
        };
      };
      var pending, deeper = Promise.resolve<MatchingRoute>(null);
      for (var i = pendingList.length - 1; i >= 0; --i) {
        pending = pendingList[i];
        deeper = pending[0].then(makeThenCb(pending[1], deeper));
      }
      return deeper;
    }

    // --
    // -- Private - Queries
    // --

    private makeRouteQuery(queryString: string): RouteQuery {
      if (!queryString)
        queryString = '/';
      else if (queryString.charAt(0) !== '/')
        queryString = ARouter.appendUrl(this.curRouteQuery ? this.curRouteQuery.queryString : '/', queryString);
      if (this.curRouteQuery && this.curRouteQuery.queryString === queryString)
        return this.curRouteQuery;
      var hashPos = queryString.indexOf('#'),
        hash = hashPos === -1 ? null : queryString.slice(hashPos + 1);
      if (hash === '')
        hash = null;
      var paramsPos = queryString.indexOf('?'),
        params: { [index: string]: string; };
      if (paramsPos === -1)
        params = null;
      else {
        var paramsStr = hashPos === -1 ? queryString.slice(paramsPos + 1) : queryString.slice(paramsPos + 1, hashPos),
          pTokens = paramsStr.split('&'),
          nameVal;
        params = {};
        for (var i = 0, len = pTokens.length; i < len; ++i) {
          nameVal = pTokens[i].split('=');
          params[nameVal[0]] = nameVal[1] || '';
        }
      }
      var query: RouteQuery = {
        queryString: queryString,
        queryHash: hash,
        queryParams: params
      };
      if (Object.freeze)
        Object.freeze(query);
      return query;
    }

    private static makeCompletedRouteQuery(query: RouteQuery, compiledRoute: CompiledRoute, routeStr: string): RouteQuery {
      var m = compiledRoute.regexp.exec(query.queryString);
      if (m === null)
        return null;
      var params: { [index: string]: string; } = {},
        pNamesLen = compiledRoute.pNames.length,
        pName: string,
        pVal: string,
        index = 0;
      while (index < pNamesLen) {
        pName = compiledRoute.pNames[index];
        pVal = m[++index];
        params[pName] = pVal === undefined ? undefined : decodeURIComponent(pVal);
      }
      var lastIndex = m.length - 1;
      var remaining: string = lastIndex > pNamesLen ? m[lastIndex] : null,
        processed = remaining ? query.queryString.slice(0, -remaining.length) : query.queryString;
      var completed: RouteQuery = {
        queryString: query.queryString,
        queryHash: query.queryHash,
        queryParams: query.queryParams,
        route: routeStr,
        routeParams: params,
        processedQueryString: processed,
        remainingQueryString: remaining,
        title: null
      };
      if (Object.freeze)
        Object.freeze(completed);
      return completed;
    }

    private static makeFinalRouteQuery(completedQuery: RouteQuery, title: string): RouteQuery {
      if (!title)
        return completedQuery;
      var finalQuery: RouteQuery = {
        queryString: completedQuery.queryString,
        queryHash: completedQuery.queryHash,
        queryParams: completedQuery.queryParams,
        route: completedQuery.route,
        routeParams: completedQuery.routeParams,
        processedQueryString: completedQuery.processedQueryString,
        remainingQueryString: completedQuery.remainingQueryString,
        title: title
      };
      if (Object.freeze)
        Object.freeze(finalQuery);
      return finalQuery;
    }

    // --
    // -- Private - Listeners
    // --

    private addListener(type: string, cb: Function): number {
      var listeners = this.listeners[type];
      if (listeners === undefined)
        listeners = this.listeners[type] = [];
      var handle = listeners.length;
      listeners[handle] = cb;
      return handle;
    }

    private removeListener(type: string, handle: number): void {
      var listeners = this.listeners[type];
      if (listeners === undefined || listeners[handle] === undefined)
        throw Error('Unknown listener "' + type + '": "' + handle + '"');
      delete listeners[handle];
    }

    private fireListeners(type: string, arg: any, returnBoolean: boolean): Promise<any> {
      var listeners = this.listeners[type];
      if (listeners === undefined)
        return returnBoolean ? Promise.resolve(true) : Promise.resolve();
      var promArr = [];
      for (var k in listeners) {
        if (listeners.hasOwnProperty(k))
          promArr.push(arg === undefined ? listeners[k]() : listeners[k](arg));
      }
      var p = Promise.all<any>(promArr);
      if (returnBoolean) {
        p.then(function (resArr: boolean[]) {
          for (var i = 0, len = resArr.length; i < len; ++i) {
            if (!resArr[i])
              return false;
          }
          return true;
        });
      }
      return p;
    }

    // --
    // -- Private - Tools
    // --

    private static compileRoute(route: string): CompiledRoute {
      var pNames: string[];
      var withStar = route.length > 0 && route[route.length - 1] === '*';
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
