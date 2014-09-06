/// <reference path='../woc.d.ts' />
/// <reference path='EasyRouter.d.ts' />

module WocGeneric {
  'use strict';

  export class EasyRouterProvider implements Woc.Router {

    private onErrCb: (err: any) => void;
    private onRejectCb: (err: any, query?: EasyRouter.RouteQuery) => void;
    private onUnknownRouteCb: (query: EasyRouter.RouteQuery) => void;
    private root: EasyRouter.Router;

    constructor(private sc: Woc.ServiceContext) {
      var log = <Woc.Log>sc.getService('Woc.Log');
      this.onErrCb = function (err: any) {
        log.error(err);
      };
      this.onRejectCb = function (err: any, query?: EasyRouter.RouteQuery) {
        log.error('Error on route: "' + query.queryString + '"');
        log.error(err);
      };
      this.onUnknownRouteCb = function (query: EasyRouter.RouteQuery) {
        log.warning('Unknown route: "' + query.queryString + '"');
      };
    }

    public createRouter(): EasyRouter.Router {
      if (this.root)
        throw Error('EasyRouterProvider is already started');
      return new EasyRouter.Router(this.onErrCb, this.onRejectCb, this.onUnknownRouteCb);
    }

    public start(root: EasyRouter.Router, opt = {}): Promise<void> {
      if (this.root)
        throw Error('EasyRouterProvider is already started');
      this.root = root;
      return this.root.startRoot({
        baseUrl: this.sc.appConfig.baseUrl,
        hashBangMode: opt['hashBangMode'] ? true : false,
        noHistory: opt['noHistory'] ? true : false,
        firstQueryString: opt['firstQueryString'] || this.sc.appConfig.firstRelUrl
      });
    }

    // --
    // -- Woc.Router
    // --

    public navigate(queryString: string): Promise<boolean> {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      return this.root.navigate(queryString);
    }

    public navigateToUnknown(): Promise<boolean> {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      return this.root.navigateToUnknown();
    }

    public navigateBack(level?: number): Promise<boolean> {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      return this.root.navigateBack(level);
    }

    public addCanLeaveListener(cb: () => any, onNavRm?: boolean): number {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      return this.root.addCanLeaveListener(cb, onNavRm);
    }

    public removeCanLeaveListener(handle: number): void {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      this.root.removeCanLeaveListener(handle);
    }

    public addLeaveListener(cb: () => void, onNavRm?: boolean): number {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      return this.root.addLeaveListener(cb, onNavRm);
    }

    public removeLeaveListener(handle: number): void {
      if (!this.root)
        throw Error('EasyRouterProvider is not started');
      this.root.removeLeaveListener(handle);
    }
  }
}
