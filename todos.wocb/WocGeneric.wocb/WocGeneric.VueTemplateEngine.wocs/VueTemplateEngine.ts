/// <reference path='../woc.d.ts' />

declare var Vue;

module WocGeneric {
  'use strict';

  // --
  // -- VueTemplateEngine
  // --

  export class VueTemplateEngine implements Woc.TemplateEngine {
    private DefaultWocVue;
    private customs = {};

    constructor() {
      this.DefaultWocVue = VueTemplateEngine.createWocVue();
    }

    public makeProcessor(tplStr: string, prop: Woc.EmbedProperties): Woc.TemplateProcessor {
      return new Processor(this, this.DefaultWocVue, tplStr, prop);
    }

    /**
     * @return {} an extension of Vue.js
     */
    public getCustom(name: string) {
      if (!this.customs[name])
        this.customs[name] = VueTemplateEngine.createWocVue();
      return this.customs[name];
    }

    private static createWocVue() {
      var WocVue = Vue.extend();
      WocVue.directive('woc-component', {
        bind: function () {
        },
        update: function (value) {
          var context = VueTemplateEngine.getWocParam(this.vm, 'wocContext');
          if (this.wocCur)
            context.removeComponent(this.wocCur);
          this.wocCur = context.createComponent(this.arg, value);
          this.wocCur.attachTo(this.el);
        },
        unbind: function () {
          if (this.wocCur) {
            var context = VueTemplateEngine.getWocParam(this.vm, 'wocContext');
            context.removeComponent(this.wocCur);
            this.wocCur = null;
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
        bindTemplate: function (opt = {}): void {
          that.bind(opt, this, this.getOwner());
        }
      };
    }

    private bind(opt, context, inst): void {
      try {
        var copy: any = {
          wocContext: context,
          wocSelf: inst
        };
        for (var k in opt) {
          if (opt.hasOwnProperty(k))
            copy[k] = opt[k];
        }
        if (opt.wocTemplate) {
          if (this.tplMap[opt.wocTemplate] === undefined)
            throw Error('Unknown template "' + opt.wocTemplate + '"');
          copy.template = this.tplMap[opt.wocTemplate];
        }
        new this.WocVue(copy);
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
