/// <reference path='../woc.d.ts' />

declare module Woc {
  interface VueContext {
    /**
     * @return {} an extension of Vue.js
     */
    useCustomTemplateEngine: (name: string) => {};
    useDefaultTemplateEngine: () => void;
    /**
     * @return the instance of a Vue.js
     */
    bindTemplate(opt: {});
  }
  interface VueServiceContext extends VueContext, ServiceContext {
  }
  interface VueInitializerContext extends VueContext, InitializerContext {
  }
  interface VueComponentContext extends VueContext, ComponentContext {
  }
}
