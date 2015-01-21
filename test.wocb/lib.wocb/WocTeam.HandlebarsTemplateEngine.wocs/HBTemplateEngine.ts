/// <reference path='../defs/Woc.d.ts' />

declare var Handlebars;

module WocTeam {
  'use strict';

  export class HandlebarsTemplateEngine implements Woc.TemplateEngine {
    public makeProcessor(tplStr: string, prop: Woc.EmbedProperties): Woc.TemplateProcessor {
      return new Processor(tplStr, prop);
    }
  }
  
  class Processor implements Woc.TemplateProcessor {
    private static hb;
    private map = {};
    private tplStrMap = {};

    constructor(tplStr: string, private prop: Woc.EmbedProperties) {
      if (!Processor.hb)
        Processor.hb = Handlebars.create();
      if (tplStr)
        this.splitTemplates(tplStr);
    }

    public getContextMethods(): {[index: string]: Function} {
      return {
        render: (name: string, data = {}): string => {
          return this.render(name, data);
        },
        renderIn: (el: HTMLElement, name: string, data = {}): void => {
          el.innerHTML = this.render(name, data);
        }
      };
    }

    public destruct(): void {
    }

    private render(name: string, data = {}): string {
      try {
        if (this.map[name] === undefined)
          throw Error('Unknown template "' + name + '"');
        if (this.map[name] === null)
          this.map[name] = Processor.hb.compile(this.tplStrMap[name]);
        return this.map[name](data);
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
        var arr = templates.split(/\s*<!--\s*Template:\s*([^\s]+)\s*-->\s*/),
          name, tpl;
        for (var i = 1, len = arr.length; i < len; ++i) {
          name = arr[i];
          tpl = arr[++i];
          this.tplStrMap[name] = tpl;
          this.map[name] = null;
        }
      } catch (e) {
        throw Error('Handlebars error when compilation in "' + this.prop.name + '": ' + (e['message'] ? e['message'] : e));
      }
    }
  }
}
