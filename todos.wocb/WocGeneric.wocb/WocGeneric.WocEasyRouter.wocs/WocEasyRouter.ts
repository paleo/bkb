/// <reference path='../woc.d.ts' />
/// <reference path='EasyRouter.d.ts' />

module WocGeneric {
  'use strict';

  export interface WocEasyRouterOptions {
    hashBangMode?: boolean;
    noHistory?: boolean;
    firstQueryString?: string;
    root?: EasyRouter.Router;
  }

  export class WocEasyRouter implements Woc.Router {

    private onErrCb: (err: any) => void;
    private onRejectCb: (err: any, query?: EasyRouter.Query) => void;
    private onUnknownRouteCb: (query: EasyRouter.Query) => void;
    private root: EasyRouter.Router = null;
    private started = false;

    constructor(private sc: Woc.ServiceContext) {
      var log = <Woc.Log>sc.getService('Woc.Log');
      this.onErrCb = function (err: any) {
        log.error(err);
      };
      this.onRejectCb = function (err: any, query?: EasyRouter.Query) {
        log.error('Error on route: "' + query.queryString + '"');
        log.error(err);
      };
      this.onUnknownRouteCb = function (query: EasyRouter.Query) {
        log.warning('Unknown route: "' + query.queryString + '"');
      };
    }

    public createRouter(): EasyRouter.Router {
      if (this.started)
        throw Error('WocEasyRouter is already started');
      return new EasyRouter.Router(this.onErrCb, this.onRejectCb, this.onUnknownRouteCb);
    }

    public start(opt: WocEasyRouterOptions): Promise<void> {
      if (this.started)
        throw Error('WocEasyRouter is already started');
      if (opt.root) {
        if (this.root)
          throw Error('the root router is already defined');
        this.root = opt.root;
      } else
        this.getRoot();
      this.started = true;
      return this.root.startRoot({
        baseUrl: this.sc.appConfig.baseUrl,
        hashBangMode: opt['hashBangMode'] ? true : false,
        noHistory: opt['noHistory'] ? true : false,
        firstQueryString: opt['firstQueryString'] || this.sc.appConfig.firstRelUrl
      });
    }

    // --
    // -- EasyRouter.Router
    // --

    public map(activators: EasyRouter.RouteActivator[]): WocEasyRouter {
      this.getRoot().map(activators);
      return this;
    }

    public mapUnknownRoutes(activator: EasyRouter.RouteActivator): WocEasyRouter {
      this.getRoot().mapUnknownRoutes(activator);
      return this;
    }

    // --
    // -- Woc.Router
    // --

    public navigate(queryString: string): Promise<boolean> {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      return this.root.navigate(queryString);
    }

    public navigateToUnknown(): Promise<boolean> {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      return this.root.navigateToUnknown();
    }

    public navigateBack(level?: number): Promise<boolean> {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      return this.root.navigateBack(level);
    }

    public addCanLeaveListener(cb: () => any, onNavRm?: boolean): number {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      return this.root.addCanLeaveListener(cb, onNavRm);
    }

    public removeCanLeaveListener(handle: number): void {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      this.root.removeCanLeaveListener(handle);
    }

    public addLeaveListener(cb: () => void, onNavRm?: boolean): number {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      return this.root.addLeaveListener(cb, onNavRm);
    }

    public removeLeaveListener(handle: number): void {
      if (!this.started)
        throw Error('WocEasyRouter is not started');
      this.root.removeLeaveListener(handle);
    }

    // --
    // -- Private
    // --

    private getRoot(): EasyRouter.Router {
      if (!this.root)
        this.root = this.createRouter();
      return this.root;
    }
  }
}
