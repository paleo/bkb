/// <reference path='../d.ts/woc.d.ts' />
/// <reference path='EasyRouter.d.ts' />

module WocGeneric {
  'use strict';

  export class EasyRouterProvider {

    private onErrCb: (err: any) => void;
    private root: EasyRouter.Router;

    constructor(private sc: Woc.ServiceContext) {
      var log = <Woc.Log>sc.getService('Woc.Log');
      this.onErrCb = function (err: any) {
        log.error(err);
      };
    }

    public createRouter(): EasyRouter.Router {
      if (this.root)
        throw Error('EasyRouterProvider is already started');
      return new EasyRouter.Router(this.onErrCb);
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

  }
}
