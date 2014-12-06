/// <reference path='../woc.d.ts' />

declare module Woc {
  interface VueContext {
    renderIn(el: HTMLElement, name: string, data?: {}): void;
  }
  interface VueServiceContext extends VueContext, ServiceContext {
  }
  interface VueInitializerContext extends VueContext, InitializerContext {
  }
  interface VueComponentContext extends VueContext, ComponentContext {
  }
}
