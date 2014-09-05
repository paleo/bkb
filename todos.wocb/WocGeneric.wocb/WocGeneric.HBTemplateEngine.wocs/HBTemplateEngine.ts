/// <reference path='../woc.d.ts' />

declare var Handlebars;

module WocGeneric {
  'use strict';

  export class HBTemplateEngine implements Woc.TemplateEngine {
    public makeProcessor(tplStr: string, prop: Woc.EmbedProperties): Woc.TemplateProcessor {
      return new Processor(tplStr, prop);
    }
  }
  
  class Processor implements Woc.TemplateProcessor {
    private map = {};

    constructor(tplStr: string, private prop: Woc.EmbedProperties) {
      this.splitTemplates(tplStr);
    }

    public getContextMethods(): {[index: string]: Function} {
      return {
        render: (name: string, context = {}): string => {
          return this.render(name, context);
        },
        renderIn: (el: HTMLElement, name: string, context = {}): void => {
          el.innerHTML = this.render(name, context);
        }
      };
    }

    private render(name: string, context = {}): string {
      try {
        if (this.map[name] === undefined)
          throw Error('Unknown template "' + name + '"');
        return this.map[name](context);
      } catch (e) {
        throw Error('Handlebars error when rendering in "' + this.prop.name + '": ' + (e['message'] ? e['message'] : e));
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
      try {
        var arr = templates.split(/\s*<!--\s*Template:\s*([a-zA-Z0-9_\-]+)\s*-->\s*/),
          name, tpl;
        for (var i = 1, len = arr.length; i < len; ++i) {
          name = arr[i];
          tpl = arr[++i];
          this.map[name] = Handlebars.compile(tpl);
        }
      } catch (e) {
        throw Error('Handlebars error when compilation in "' + this.prop.name + '": ' + (e['message'] ? e['message'] : e));
      }
    }
  }
}
