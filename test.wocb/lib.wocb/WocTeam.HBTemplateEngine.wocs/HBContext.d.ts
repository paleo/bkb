/// <reference path='../defs/Woc.d.ts' />

declare module WocTeam {
  interface HBContext {
    render(name: string, data?: {}): string;
    renderIn(el: HTMLElement, name: string, data?: {}): void;
  }

  interface HBServiceContext extends HBContext, Woc.ServiceContext {
  }

  interface HBInitializerContext extends HBContext, Woc.InitializerContext {
  }

  interface HBComponentContext extends HBContext, Woc.ComponentContext {
  }
}
