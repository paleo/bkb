/*!
 * Public domain
 * © 2014 Tarh Paleo; Released under the CC0 License.
 * http://creativecommons.org/publicdomain/zero/1.0/
 * @license
 */

/// <reference path='../es6-promise.d.ts' />

module EasyRouter {
  'use strict';

  // --
  // -- Public interfaces
  // --

  export interface Query {
    parent?: any;
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
    useQueryString?: string;
    /**
     * @return any a boolean or a Promise&lt;boolean&gt;
     */
    canActivate?(query: Query): any;
    redirectTo?: string;
    /**
     * This callback is required except if a child router is defined
     * @return any void (undefined) or a Promise&lt;void&gt;
     */
    activate?(query: Query): any;
    /**
     * @return any a boolean or a Promise&lt;boolean&gt;
     */
    canDeactivate?(): any;
    /**
     * @return any void or a Promise&lt;void&gt;
     */
    deactivate?(): any;
    /**
     * A string or a callback(query: RouteProperties) that returns a string or a Promise&lt;string&gt;
     */
    title?: any;
    child?: ChildRouter;
  }

  export interface MinimalRouter {
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

  export interface ParentRouter {
    parentNavigateToUnknown(changeHist: boolean): Promise<boolean>;
  }

  export interface ChildRouter {
    startAsChild(parent: ParentRouter, withHistory: boolean): void;
    childNavigate(queryString: string, changeHist: boolean, parentUrl: string, parentQuery: any): Promise<boolean>;
    leaveChildRouter(): Promise<boolean>;
  }

  export interface RootConfig {
    baseUrl: string;
    /**
     * Default is true
     */
    hashMode?: boolean;
    /**
     * Default is false
     */
    noHistory?: boolean;
    firstQueryString?: string;
  }

  // --
  // -- Private interfaces
  // --

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
    completedQuery: Query;
    activator: RouteActivator;
    compiledRoute?: CompiledRoute;
  }

  // --
  // -- Router
  // --

  export class Router implements ParentRouter, ChildRouter, MinimalRouter {

    // --
    // -- Initialisation
    // --

    private onAsyncErrCb: (err: any) => void;

    private isRoot: boolean;
    private rootBaseUrl: string;
    private rootQSStack: string[];

    private withHistory: boolean;
    private parent: ParentRouter;
    private children: ChildRouter[] = [];

    private routes: Route[] = [];
    private unknownActivator: RouteActivator;
    private listeners = {};
    private onNavRmListeners = {};

    private curQuery: Query = null;
    private curActivator: RouteActivator = null;
    private curChild: ChildRouter = null;
    private working = false;

    constructor(
        onAsyncErrCb: (err: any) => void,
        private onRejectCb: (err: any, query?: Query) => void = null,
        private onUnknownRouteCb: (query: Query) => void = null
      ) {
      this.onAsyncErrCb = function (err: any) {
        try {
          onAsyncErrCb(err);
        } catch (e) {
        }
      };
    }

    public startRoot(config: RootConfig): Promise<void> {
      if (this.isRoot !== undefined)
        throw Error('Cannot call startRoot(), the router is ' + (this.isRoot ? 'already root' : 'a child'));
      this.isRoot = true;
      this.rootQSStack = [];
      // - Base URL
      this.rootBaseUrl = config.baseUrl;
      if (config.hashMode !== false)
        this.rootBaseUrl += '#';
      // - History
      this.withHistory = !config.noHistory;
      var firstQueryString = window.history.state || config.firstQueryString || Router.getDefaultFirstQueryString(config);
      if (this.withHistory) {
        window.onpopstate = this.makeOnPopState();
        window.onhashchange = this.makeOnHashChange();
      }
      // - Set children
      for (var i = 0, len = this.children.length; i < len; ++i)
        this.children[i].startAsChild(this, this.withHistory);
      // - Navigate
      return this.doNavigate(firstQueryString, false).then<void>((done: boolean) => {
        if (done) {
          if (this.withHistory && this.curQuery) {
            window.history.replaceState(
              this.curQuery.redirectedFrom || this.curQuery.queryString,
              this.curQuery.title,
              this.toUrl(this.curQuery.queryString, null)
            );
          }
        } else
          throw this.makeRejectError('Fail to navigate to the first URL: "' + firstQueryString + '"');
      });
    }

    public map(activators: RouteActivator[]): Router {
      var ra, compiledRoute;
      for (var i = 0, len = activators.length; i < len; ++i) {
        ra = activators[i];
        if (typeof ra.route === 'string')
          compiledRoute = Router.compileRoute(ra.route);
        else {
          if (!ra.canActivate)
            throw Error('Missing route: ' + JSON.stringify(ra));
          compiledRoute = null;
        }
        if (Object.freeze)
          Object.freeze(ra);
        this.routes.push({
          activator: ra,
          compiledRoute: compiledRoute
        });
        if (ra.child)
          this.children.push(ra.child);
      }
      return this;
    }

    public mapUnknownRoutes(activator: RouteActivator): Router {
      if (Object.freeze)
        Object.freeze(activator);
      this.unknownActivator = activator;
      return this;
    }

    // --
    // -- Public - ParentRouter
    // --

    public parentNavigateToUnknown(changeHist: boolean): Promise<boolean> {
      return this.doNavigate(null, changeHist, null, null, true);
    }

    // --
    // -- Public - ChildRouter
    // --

    public startAsChild(parent: ParentRouter, withHistory: boolean): void {
      if (this.isRoot)
        throw Error('Cannot call startAsChild() on the root router');
      if (this.parent) {
        if (this.parent !== parent)
          throw Error('Router cannot have several parents');
        return;
      }
      this.parent = parent;
      this.isRoot = false;
      this.withHistory = withHistory;
      // - Set children
      for (var i = 0, len = this.children.length; i < len; ++i)
        this.children[i].startAsChild(this, this.withHistory);
    }

    public childNavigate(queryString: string, changeHist: boolean, parentUrl: string, parentQuery: any): Promise<boolean> {
      return this.doNavigate(queryString, changeHist, parentUrl, parentQuery);
    }

    public leaveChildRouter(): Promise<boolean> {
      if (!this.curQuery)
        return Promise.resolve(true);
      return this.canLeaveCurrent().then((can: boolean): any => {
        if (!can)
          return false;
        return this.setNewQuery(null, null).then(() => true)
      });
    }

    // --
    // -- Public - MinimalRouter
    // --

    public navigate(queryString: string): Promise<boolean> {
      return this.doNavigate(queryString, true);
    }

    public navigateToUnknown(): Promise<boolean> {
      return this.doNavigate(null, true);
    }

    public navigateBack(level = 1): Promise<boolean> {
      if (!this.isRoot)
        throw Error('Method navigateBack() is available for root router only');
      if (level === 0)
        return Promise.resolve<boolean>(true);
      if (level < 0)
        return Promise.resolve<boolean>(false);
      var qs = this.rootQSStack[this.rootQSStack.length - level - 1];
      if (qs === undefined)
        return Promise.resolve(false);
      return this.doNavigate(qs, true);
    }

    public addCanLeaveListener(cb: () => any, onNavRm = false): number {
      return this.addListener('canLeave', cb, onNavRm);
    }

    public removeCanLeaveListener(handle: number): void {
      return this.removeListener('canLeave', handle);
    }

    public addLeaveListener(cb: () => void, onNavRm = false): number {
      return this.addListener('leave', cb, onNavRm);
    }

    public removeLeaveListener(handle: number): void {
      return this.removeListener('leave', handle);
    }

    // --
    // -- Public
    // --

    public addCanNavigateListener(cb: (query: Query) => any, onNavRm = false): number {
      return this.addListener('canNavigate', cb, onNavRm);
    }

    public removeCanNavigateListener(handle: number): void {
      return this.removeListener('canNavigate', handle);
    }

    public addNavigateListener(cb: (query: Query) => void, onNavRm = false): number {
      return this.addListener('navigate', cb, onNavRm);
    }

    public removeNavigateListener(handle: number): void {
      return this.removeListener('navigate', handle);
    }

    // --
    // -- Private - Routes
    // --

    private doNavigate(queryString: string, changeHist: boolean, parentUrl: string = null, parentQuery: any = null,
        alreadyWorking = false): Promise<boolean> {
      if (!alreadyWorking) {
        if (this.working)
          return Promise.resolve<boolean>(false);
        this.working = true;
      }
      if (this.isRoot)
        this.rootQSStack.push(queryString);
      var query = this.makeQuery(queryString, parentQuery);
      if (this.curQuery && this.curQuery.queryString === query.queryString) {
        this.working = false;
        return Promise.resolve<boolean>(true);
      }
      var p = this.canLeaveCurrent();
      p = p.then<boolean>((can: boolean): any => {
        if (!can)
          return false;
        return this.searchRoute(query).then<boolean>((matching: MatchingRoute): any => {
          if (matching === null)
            return this.parent ? this.parent.parentNavigateToUnknown(changeHist) : false;
          return this.fireListeners('canNavigate', matching.completedQuery, true).then((can: boolean): any => {
            if (!can)
              return false;
            if (matching.activator.redirectTo)
              return this.doNavigate(matching.activator.redirectTo, changeHist, parentUrl, parentQuery);
            return this.doNavigateToMatching(matching, changeHist, parentUrl);
          });
        });
      });
      if (!alreadyWorking) {
        p = p.then<boolean>((done: boolean) => {
          this.working = false;
          return done;
        }, (err: any) => {
          this.working = false;
          throw err;
        });
      }
      return p;
    }

    private canLeaveCurrent(): Promise<boolean> {
      var promises: Promise<boolean>[] = [];
      if (this.curActivator && this.curActivator.canDeactivate) {
        var can: any;
        try {
          can = this.curActivator.canDeactivate();
        } catch (err) {
          this.callOnRejectCb(err, this.curQuery);
          can = false;
        }
        if (!can)
          return Promise.resolve(false);
        if (can !== true)
          promises.push(can);
      }
      promises.push(this.fireListeners('canLeave', undefined, true));
      return Promise.all(promises).then<boolean>((arr) => {
        for (var i = 0, len = arr.length; i < len; ++i) {
          if (!arr[i])
            return false;
        }
        return true;
      });
    }

    private doNavigateToMatching(matching: MatchingRoute, changeHist: boolean, parentUrl: string): Promise<boolean> {
      var activator = matching.activator,
        completed = matching.completedQuery,
        p: Promise<boolean>;
      // - Case of a child router
      if (activator.child) {
        // - Call Unknown route CB
        if (activator === this.unknownActivator)
          this.callUnknownRouteCb(completed);
        // - Call the child router
        if (this.curChild && this.curChild !== activator.child)
          p = this.curChild.leaveChildRouter();
        else
          p = Promise.resolve<boolean>(true);
        return p.then<boolean>((done: boolean): any => {
          if (!done)
            return false;
          var parentUrl = this.toUrl(completed.processedQueryString, parentUrl),
            childQS = completed.remainingQueryString;
          return activator.child.childNavigate(childQS, changeHist, parentUrl, completed).then((done: boolean): any => {
            this.curChild = activator.child;
            if (done)
              return this.setNewQuery(completed, activator).then(() => done);
            return done;
          });
        });
      }
      // - Switch to the new route
      if (this.curChild) {
        p = this.curChild.leaveChildRouter();
        this.curChild = null;
      } else
        p = Promise.resolve<boolean>(true);
      return p.then<boolean>((done: boolean): any => {
        if (!done)
          return false;
        // - Get the title
        var title: string;
        if (!activator.title)
          title = null;
        else if (typeof activator.title === 'string')
          title = activator.title;
        else
          title = this.wrapUserCbOnErrorReject(activator.title, completed, completed);
        var finalRoute = Router.makeFinalQuery(completed, title);
        // - Call Unknown route CB
        if (activator === this.unknownActivator)
          this.callUnknownRouteCb(finalRoute);
        // - Change route
        return this.setNewQuery(finalRoute, activator).then(() => {
          if (changeHist)
            this.pushState(this.curQuery, parentUrl);
          document.title = this.curQuery.title;
          var activated = this.wrapUserCbOnErrorReject(activator.activate, this.curQuery, this.curQuery);
          return activated ? activated.then(() => true) : true;
        });
      });
    }

    private pushState(query: Query, parentUrl: string): void {
      if (!this.withHistory)
        return;
      var rootQuery = query;
      while (rootQuery.parent)
        rootQuery = rootQuery.parent;
      window.history.pushState(
        rootQuery.redirectedFrom || rootQuery.queryString,
        query.title,
        this.toUrl(query.queryString, parentUrl)
      );
    }

    private toUrl(queryString: string, parentUrl: string): string {
      var url = queryString || '';
      url = parentUrl ? parentUrl + url : url;
      return this.rootBaseUrl ? this.rootBaseUrl + url : url;
    }

    private setNewQuery(query: Query, activator: RouteActivator): Promise<void> {
      var p: Promise<void> = null;
      if (this.curActivator && this.curActivator.deactivate) {
        var deactivated: any = this.wrapUserCbOnErrorReject(this.curActivator.deactivate, query);
        if (deactivated)
          p = deactivated;
      }
      this.curActivator = activator;
      this.curQuery = query;
      this.fireListeners('leave', undefined, false).catch((err) => {
        this.onAsyncErrCb(err);
      });
      if (query) {
        this.fireListeners('navigate', query, false).catch((err) => {
          this.onAsyncErrCb(err);
        });
      }
      // - Remove listeners
      for (var k in this.onNavRmListeners) {
        if (this.onNavRmListeners.hasOwnProperty(k))
          this.removeListener(this.onNavRmListeners[k]['type'], this.onNavRmListeners[k]['handle']);
      }
      return p ? p : Promise.resolve<void>();
    }

    /**
     * @return any[] NULL or the Route and completed Query
     */
    private searchRoute(query: Query): Promise<MatchingRoute> {
      // - Make pending list
      var pendingList = [],
        r: Route,
        matchArr,
        can: any,
        matching: MatchingRoute;
      if (query.queryString !== null) {
        for (var k in this.routes) {
          if (!this.routes.hasOwnProperty(k))
            continue;
          r = this.routes[k];
          matchArr = this.matchActivator(query, r.activator, r.compiledRoute);
          can = matchArr[0];
          if (can === false)
            continue;
          matching = <any>matchArr[1];
          if (can === true) {
            if (pendingList.length === 0)
              return Promise.resolve<MatchingRoute>(matching);
            pendingList.push([Promise.resolve(true), matching]);
            break;
          } else
            pendingList.push([can, matching]); // can is a promise
        }
      }
      // - Add unknown routes
      if (this.unknownActivator) {
        matchArr = this.matchActivator(query, this.unknownActivator);
        can = matchArr[0];
        if (can !== false) {
          matching = <any>matchArr[1];
          pendingList.push([can === true ? Promise.resolve(true) : can, matching]);
        }
      }
      // - Wait promises
      var makeThenCb = function (matching: MatchingRoute, deeper: Promise<MatchingRoute>) {
        return function (activated: boolean): any {
          return activated ? matching : deeper;
        };
      };
      var pending,
        deeper = Promise.resolve<MatchingRoute>(null);
      for (var i = pendingList.length - 1; i >= 0; --i) {
        pending = pendingList[i];
        deeper = pending[0].then(makeThenCb(pending[1], deeper));
      }
      return deeper;
    }

    private matchActivator(query: Query, activator: RouteActivator, cr: CompiledRoute = null) {
      var completed: Query;
      if (cr) {
        completed = Router.makeCompletedQuery(query, cr, activator);
        if (!completed)
          return [false];
      } else
        completed = query;
      var matching: MatchingRoute = {
        completedQuery: completed,
        activator: activator,
        compiledRoute: cr
      };
      if (!activator.canActivate)
        return [true, matching];
      var can = this.wrapUserCbOnErrorReject(activator.canActivate, completed, completed);
      return [can, matching];
    }

    // --
    // -- Private - Queries
    // --

    private makeQuery(queryString: string, parentQuery: any): Query {
      var hash: string,
        params: { [index: string]: string; };
      if (queryString === null || queryString === undefined) {
        queryString = null;
        hash = null;
        params = null;
      } else {
        if (this.curQuery && this.curQuery.queryString === queryString)
          return this.curQuery;
        var hashPos = queryString.indexOf('#');
        hash = hashPos === -1 ? null : queryString.slice(hashPos + 1);
        if (hash === '')
          hash = null;
        var paramsPos = queryString.indexOf('?');
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
      }
      var query: Query = {
        queryString: queryString,
        queryHash: hash,
        queryParams: params
      };
      if (parentQuery)
        query.parent = parentQuery;
      if (Object.freeze)
        Object.freeze(query);
      return query;
    }

    private static makeCompletedQuery(query: Query, compiledRoute: CompiledRoute, activator: RouteActivator): Query {
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
      var completed: Query = {
        queryString: query.queryString,
        queryHash: query.queryHash,
        queryParams: query.queryParams,
        route: activator.route,
        routeParams: params,
        processedQueryString: processed,
        remainingQueryString: remaining,
        title: null
      };
      if (query.parent)
        completed.parent = query.parent;
      if (activator.useQueryString) {
        completed.redirectedFrom = completed.queryString;
        completed.queryString = activator.useQueryString;
      }
      if (Object.freeze)
        Object.freeze(completed);
      return completed;
    }

    private static makeFinalQuery(completedQuery: Query, title: string): Query {
      if (!title)
        return completedQuery;
      var finalQuery: Query = {
        queryString: completedQuery.queryString,
        queryHash: completedQuery.queryHash,
        queryParams: completedQuery.queryParams,
        route: completedQuery.route,
        routeParams: completedQuery.routeParams,
        processedQueryString: completedQuery.processedQueryString,
        remainingQueryString: completedQuery.remainingQueryString,
        title: title
      };
      if (completedQuery.parent)
        finalQuery.parent = completedQuery.parent;
      if (Object.freeze)
        Object.freeze(finalQuery);
      return finalQuery;
    }

    // --
    // -- Private - Listeners
    // --

    private addListener(type: string, cb: Function, onNavRm = false): number {
      var listeners = this.listeners[type];
      if (listeners === undefined)
        listeners = this.listeners[type] = [];
      var handle = listeners.length;
      listeners[handle] = cb;
      if (onNavRm) {
        this.onNavRmListeners[type + '~' + handle] = {
          'type': type,
          'handle': handle
        };
      }
      return handle;
    }

    private removeListener(type: string, handle: number): void {
      var listeners = this.listeners[type];
      if (listeners === undefined || listeners[handle] === undefined)
        throw Error('Unknown listener "' + type + '": "' + handle + '"');
      delete listeners[handle];
      var k = type + '~' + handle;
      if (this.onNavRmListeners[k])
        delete this.onNavRmListeners[k];
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
        p = p.then<any>(function (resArr: boolean[]) {
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
    // -- Root router
    // --

    private makeOnPopState() {
      return (e) => {
        if (e.state === null || e.state === undefined)
          return;
        try {
          this.doNavigate(e.state, false);
        } catch (err) {
          this.onAsyncErrCb(err);
        }
      };
    }

    private makeOnHashChange() {
      return () => {
        try {
          var queryString: string = window.location.hash;
          if (queryString.length >= 1 && queryString[0] === '#')
            queryString = queryString.slice(1);
          this.doNavigate(queryString, false);
        } catch (err) {
          this.onAsyncErrCb(err);
        }
      };
    }

    private static getDefaultFirstQueryString(config: RootConfig) {
      if (config.hashMode !== false) {
        var hash = window.location.hash;
        if (!hash)
          return '';
        if (hash.length >= 1 && hash[0] === '#')
          hash = hash.slice(1);
        return hash;
      }
      var path = window.location.pathname;
      var baseLen = config.baseUrl.length;
      if (path.length <= baseLen)
        return '';
      if (path.slice(0, baseLen) !== config.baseUrl)
        return '';
      return path.slice(baseLen);
    }

    // --
    // -- Private - Tools
    // --

    private callUnknownRouteCb(query: Query) {
      if (this.onUnknownRouteCb) {
        try {
          this.onUnknownRouteCb(query);
        } catch (err) {
          this.onAsyncErrCb(err);
        }
      }
    }

    private wrapUserCbOnErrorReject(cb: any, query: Query = undefined, arg: any = undefined): any {
      var res: any;
      try {
        if (arg === undefined)
          res = cb();
        else
          res = cb(arg);
      } catch (err) {
        throw this.callOnRejectCb(err, query);
      }
      if (typeof res === 'object' && res['then'] && res['catch']) {
        res = res['catch']((err) => {
          throw this.callOnRejectCb(err);
        });
      }
      return res;
    }

    private makeRejectError(msg: string, query: Query = undefined): Error {
      return this.callOnRejectCb(Error(msg), query);
    }

    private callOnRejectCb(err: any, query: Query = undefined): any {
      if (this.onRejectCb) {
        try {
          this.onRejectCb(err, query);
        } catch (e) {
          this.onAsyncErrCb(e);
        }
      }
      return err;
    }

    private static compileRoute(route: string): CompiledRoute {
      var pNames: string[] = [];
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
          return sep + '([^\/\\?&=]+)';
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
  }
}
