/// <reference path='../woc.d.ts' />

declare module Woc {
  interface HBContext {
    render(name: string, data?: {}): string;
    renderIn(el: HTMLElement, name: string, data?: {}): void;
  }
  interface HBServiceContext extends HBContext, ServiceContext {
  }
  interface HBInitializerContext extends HBContext, InitializerContext {
  }
  interface HBComponentContext extends HBContext, ComponentContext {
  }
}
