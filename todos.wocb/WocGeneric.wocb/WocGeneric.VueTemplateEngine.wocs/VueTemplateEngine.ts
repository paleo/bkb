/// <reference path='../woc.d.ts' />

declare var Vue;

module WocGeneric {
  'use strict';

  export class VueTemplateEngine implements Woc.TemplateEngine {
    private WocVue;

    constructor() {
      this.WocVue = Vue.extend();
      this.WocVue.directive('woc-component', {
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
      this.WocVue.filter('woc-call', function (value, key) {
        var inst = VueTemplateEngine.getWocParam(this, 'wocInst');
        return typeof inst[key] === 'function' ? inst[key](value) : value;
      });
      this.WocVue.filter('woc-cb', function (value, key) {
        var inst = VueTemplateEngine.getWocParam(this, 'wocInst');
        return () => {
          if (typeof inst[key] === 'function')
            inst[key](value);
        };
      });
    }

    public makeProcessor(tplStr: string, prop: Woc.EmbedProperties): Woc.TemplateProcessor {
      return new Processor(this.WocVue, tplStr, prop);
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
  
  class Processor implements Woc.TemplateProcessor {
    private tplMap = {};

    constructor(private WocVue, tplStr: string, private prop: Woc.EmbedProperties) {
      if (tplStr)
        this.splitTemplates(tplStr);
    }

    public getContextMethods(): {[index: string]: Function} {
      var that = this;
      return {
        renderIn: function (el: HTMLElement, name: string, data = {}): void {
          that.renderIn(el, name, data, this, this.getOwner());
        }
      };
    }

    private renderIn(el: HTMLElement, name: string, data: {}, context, inst): void {
      try {
        if (this.tplMap[name] === undefined)
          throw Error('Unknown template "' + name + '"');
        new this.WocVue({
          'el': el,
          'template': this.tplMap[name],
          'data': data,
          'wocContext': context,
          'wocInst': inst
        });
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
      // TODO IE8 compat: see http://blog.stevenlevithan.com/archives/cross-browser-split
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
