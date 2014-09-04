/// <reference path='EasyRouter.d.ts' />

declare module WocGeneric {
  interface EasyRouterProvider {
    createRouter(): EasyRouter.Router;
    start(root: EasyRouter.Router, opt?: {}): Promise<void>;
  }
}
