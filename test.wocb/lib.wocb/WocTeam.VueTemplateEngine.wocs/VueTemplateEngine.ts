/// <reference path='../defs/Woc.d.ts' />

declare var Vue;

module WocTeam {
  'use strict';

  // --
  // -- VueConfig
  // --

  export interface VueConfig {
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

  // --
  // -- VueTemplateEngine
  // --

  export class VueTemplateEngine implements Woc.TemplateEngine {
    private log: Woc.Log;
    private DefaultWocVue;
    private customs = {};

    constructor(sc: Woc.ServiceContext) {
      this.log = sc.log;
      this.DefaultWocVue = this.createWocVue();
    }

    public makeProcessor(tplStr: string, prop: Woc.EmbedProperties): Woc.TemplateProcessor {
      return new Processor(this, this.DefaultWocVue, tplStr, prop);
    }

    /**
     * @return {} an extension of Vue.js
     */
    public getCustom(name: string) {
      if (!this.customs[name])
        this.customs[name] = this.createWocVue();
      return this.customs[name];
    }

    private createWocVue() {
      var self = this,
        WocVue = Vue.extend();
      WocVue.directive('woc-component', {
        bind: function () {
        },
        update: function (value) {
          try {
            var context = VueTemplateEngine.getWocParam(this.vm, 'wocContext');
            if (this.wocCur)
              context.removeComponent(this.wocCur);
            this.wocCur = context.createComponent(this.arg || this.expression, value);
            this.wocCur.attachTo(this.el);
          } catch (e) {
            self.log.error(e);
          }
        },
        unbind: function () {
          if (this.wocCur) {
            try {
              var context = VueTemplateEngine.getWocParam(this.vm, 'wocContext');
              context.removeComponent(this.wocCur);
              this.wocCur = null;
            } catch (e) {
              self.log.error(e);
            }
          }
        }
      });
      WocVue.filter('woc-call', function (value, key) {
        var inst = VueTemplateEngine.getWocParam(this, 'wocSelf');
        return typeof inst[key] === 'function' ? inst[key](value) : value;
      });
      WocVue.filter('woc-cb', function (value, key) {
        var inst = VueTemplateEngine.getWocParam(this, 'wocSelf');
        return () => {
          if (typeof inst[key] === 'function')
            inst[key](value);
        };
      });
      return WocVue;
    }

    private static getWocParam(vm, name: string) {
      while (vm) {
        if (vm.$options && vm.$options[name])
          return vm.$options[name];
        vm = vm.$parent;
      }
      throw Error('Cannot find the Vue instance, that is managed by Woc');
    }
  }

  // --
  // -- Processor
  // --

  class Processor implements Woc.TemplateProcessor {
    private tplMap = {};

    constructor(private parent: VueTemplateEngine, private WocVue, tplStr: string, private prop: Woc.EmbedProperties) {
      if (tplStr)
        this.splitTemplates(tplStr);
    }

    public getContextMethods(): {[index: string]: Function} {
      var that = this;
      return {
        useCustomTemplateEngine: function (name: string) {
          return that.WocVue = that.parent.getCustom(name);
        },
        useDefaultTemplateEngine: function (): void {
          that.WocVue = that.parent['DefaultWocVue']; // direct access to the private member
        },
        bindTemplate: function (config: VueConfig) {
          return that.bind(config, this, this.getOwner());
        }
      };
    }

    public destruct(context: Woc.ComponentContext): void {
      if (context['_vueVmList']) {
        for (var i = 0, len = context['_vueVmList'].length; i < len; ++i)
          context['_vueVmList'][i].$destroy();
        context['_vueVmList'] = null;
      }
    }

    private bind(config: VueConfig, context: Woc.EmbedContext, inst) {
      try {
        var copy: any = {
          wocContext: context,
          wocSelf: inst
        };
        for (var k in config) {
          if (config.hasOwnProperty(k))
            copy[k] = config[k];
        }
        if (config.wocTemplate) {
          if (this.tplMap[config.wocTemplate] === undefined)
            throw Error('Unknown template "' + config.wocTemplate + '"');
          copy.template = this.tplMap[config.wocTemplate];
        }
        var vm = new this.WocVue(copy);
        if (!context['_vueVmList'])
          context['_vueVmList'] = [];
        context['_vueVmList'].push(vm);
        return vm;
      } catch (e) {
        throw Error('Vue.js error when rendering in "' + this.prop.name + '": ' + (e['message'] ? e['message'] : e));
      }
    }

    /**
     * <pre>
     * &lt;!-- Template: MyLabel --&gt;
     * &lt;span class="TestLabel"&gt;{{label}}&lt;/span&gt;
     * &lt;!-- Template: MyLabelB --&gt;
     * &lt;b class="TestLabel"&gt;{{label}}&lt;/b&gt;
     * </pre>
     */
    private splitTemplates(templates: string) {
      var arr = templates.split(/\s*<!--\s*Template:\s*([^\s]+)\s*-->\s*/),
        name, tpl;
      for (var i = 1, len = arr.length; i < len; ++i) {
        name = arr[i];
        tpl = arr[++i];
        this.tplMap[name] = tpl;
      }
    }
  }
}
