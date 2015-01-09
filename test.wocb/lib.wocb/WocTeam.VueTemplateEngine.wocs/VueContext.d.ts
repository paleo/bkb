/// <reference path='../defs/Woc.d.ts' />

declare module WocTeam {
  interface VueConfig {
    el: HTMLElement;
    /**
     * The template's name
     */
    wocTemplate?: string;
    template?: string;
    data: any;
    methods?: {
      [index: string]: Function;
    }
  }

  interface VueContext {
    /**
     * @return {} an extension of Vue.js
     */
    useCustomTemplateEngine: (name: string) => {};
    useDefaultTemplateEngine: () => void;
    /**
     * @return the instance of a Vue.js
     */
    bindTemplate(config: VueConfig);
  }

  interface VueServiceContext extends VueContext, Woc.ServiceContext {
  }

  interface VueInitializerContext extends VueContext, Woc.InitializerContext {
  }

  interface VueComponentContext extends VueContext, Woc.ComponentContext {
  }
}
