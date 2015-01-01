/// <reference path='EasyRouter.d.ts' />

declare module WocTeam {
  interface WocEasyRouterOptions {
    hashMode?: boolean;
    noHistory?: boolean;
    firstQueryString?: string;
    root?: EasyRouter.Router;
  }
  interface WocEasyRouter {
    createRouter(): EasyRouter.Router;
    start(opt?: WocEasyRouterOptions): Promise<void>;
    map(activators: EasyRouter.RouteActivator[]): WocEasyRouter;
    mapUnknownRoutes(activator: EasyRouter.RouteActivator): WocEasyRouter;
  }
}
