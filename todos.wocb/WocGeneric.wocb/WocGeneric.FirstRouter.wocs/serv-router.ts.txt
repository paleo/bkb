/// <reference path="definitions.ts" />
'use strict';

module Woc {
  export class CoreRouter implements Router {

    // --
    // -- Fields & Initialisation
    // --

    private log: Woc.Log;
    private listeners = {};
    private selList = [];
    private baseUrl: string;
    private firstRelUrl: string;
    private withHistory: boolean;
    private withHashBang: boolean;

    private curUrlProps: UrlProps;

    constructor(private ac: Woc.ApplicationContext, private sc: Woc.ServiceContext) {
      this.log = <Woc.Log>sc.getService('Woc.Log');
    }

    /**
     *
     * @param selList
     * @param urlController
     * @returns Function A callback that deletes the added selectors
     */
    public addSelectors(selList: string[], urlController: UrlController): Function {
      var keys, regex, indices = [], index;
      for (var i = 0, len = selList.length; i < len; ++i) {
        keys = [];
        regex = CoreRouter.pathToRegexp(selList[i], keys, true, true);
        index = this.selList.length;
        indices.push(index);
        this.selList[index] = {
          'sel': selList[i],
          'urlController': urlController,
          'regex': regex,
          'keys': keys
        };
      }
      return () => {
        for (var i = 0, len = indices.length; i < len; ++i)
          delete this.selList[indices[i]];
      };
    }

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
        this.firstRelUrl = CoreRouter.getDefaultFirstRelUrl(this.baseUrl, this.withHashBang);
      if (this.withHistory) {
        window.onpopstate = (e) => {
          try {
            var relUrl = e.state === null ? this.firstRelUrl : e.state['relUrl'];
            this.doGoTo(relUrl, false);
          } catch (e) {
            this.log.unexpectedErr(e);
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

    public goTo(relUrl: string): boolean {
      return this.doGoTo(relUrl, true);
    }

    public getCurrentUrlProps(): UrlProps {
      return this.curUrlProps;
    }

    // --
    // -- Private
    // --

    private doGoTo(relUrl: string, changeHist: boolean): boolean {
      if (!relUrl)
        relUrl = '/';
      else if (relUrl.charAt(0) !== '/')
        relUrl = CoreRouter.appendUrl(this.curUrlProps ? this.curUrlProps['relUrl'] : '/', relUrl);
      if (this.curUrlProps && this.curUrlProps['relUrl'] === relUrl)
        return true;
      var selProp, args, up: UrlProps = null;
      for (var k in this.selList) {
        if (!this.selList.hasOwnProperty(k))
          continue;
        selProp = this.selList[k];
        args = CoreRouter.matchRelUrl(relUrl, selProp['regex'], selProp['keys']);
        if (args) {
          up = {
            'relUrl': relUrl,
            'args': args,
            'sel': selProp['sel']
          };
          if (!selProp['urlController'].fillUrlProps(up))
            return false;
          if (Object.freeze) {
            Object.freeze(args);
            Object.freeze(up);
          }
          break;
        }
      }
      if (up === null)
        return false;
      if (!this.fireListeners('before', up, true))
        return false;
      this.curUrlProps = up;
      this.fireListeners('change', up);
      if (changeHist && this.withHistory)
        window.history.pushState({'relUrl': relUrl}, up['title'], this.baseUrl + relUrl);
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

    private fireListeners(type: string, up: UrlProps, stopOnFalse = false) {
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

    private static matchRelUrl(relUrl: string, regex: RegExp, keys: {}[]) {
      var m = regex.exec(relUrl);
      if (m === null)
        return null;
      var args = {};
      for (var i = 1, len = m.length; i < len; ++i) {
        var key = keys[i - 1];
        if (key)
          args[key['name']] = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
      }
      return args;
    }

    private static pathToRegexp(path, keys, sensitive, strict) { // From Routie, MIT License, http://projects.jga.me/routie/ (-> TODO REWRITE)
      if (path instanceof RegExp) return path;
      if (path instanceof Array) path = '(' + path.join('|') + ')';
      path = path
        .concat(strict ? '' : '/?')
        .replace(/\/\(/g, '(?:/')
        .replace(/\+/g, '__plus__')
        .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, (_, slash, format, key, capture, optional) => {
          keys.push({ 'name': key, 'optional': optional ? true : false });
          slash = slash || '';
          return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
        })
        .replace(/([\/.])/g, '\\$1')
        .replace(/__plus__/g, '(.+)')
        .replace(/\*/g, '(.*)');
      return new RegExp('^' + path + '$', sensitive ? '' : 'i');
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
