/// <reference path='../d.ts/woc.d.ts' />

declare var Handlebars;

module FirstExt {
	'use strict';

	export class HBTemplateEngine implements Woc.TemplateEngineService {
		public makeProcessor(ctc: Woc.ComponentTypeContext, tplStr: string): Woc.TemplateProcessor {
			return new Processor(ctc, tplStr);
		}
	}
	
	class Processor implements Woc.TemplateProcessor {
    private map = {};

    constructor(private ctc: Woc.ComponentTypeContext, tplStr: string) {
      this.splitTemplates(tplStr);
    }

    public getContextMethods(): {[index: string]: Function} {
      return {
        render: (name: string, context = {}): string => {
          return this.template(name, context);
        },
        renderIn: (el: HTMLElement, name: string, context = {}): void => {
          el.innerHTML = this.template(name, context);
        }
      };
    }

    private template(name: string, context = {}): string {
      if (this.map[name] === undefined)
        throw Error('Unknown template "' + name + '"');
      return this.map[name](context);
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
      var arr = templates.split(/\s*<!--\s*Template:\s*([a-zA-Z0-9_\-]+)\s*-->\s*/),
        name, tpl;
      for (var i = 1, len = arr.length; i < len; ++i) {
        name = arr[i];
        tpl = arr[++i];
        this.map[name] = Handlebars.compile(tpl);
      }
    }
  }
}
