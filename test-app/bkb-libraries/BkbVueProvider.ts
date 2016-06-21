import {Context} from 'bkb-framework'

declare type Vue = any
declare var Vue: any // { new(config: any): Vue }

export interface VueConfig {
  el: HTMLElement
  data?: any
  methods?: any
  templateName: string
  childComponents: any
}

export default class BkbVueProvider {
  private templates: string[]

  constructor(templatesStr: string) {
    this.templates = BkbVueProvider.splitTemplates(templatesStr)
  }

  public attachVue(context: Context<any>, config: VueConfig): Vue {
    const vt = new VueTemplate(context, this.templates)
    return vt.createVue(config)
  }

  /**
   * <pre>
   * &lt;!-- Template: MyLabel --&gt;
   * &lt;span class="TestLabel"&gt;{{label}}&lt;/span&gt;
   * &lt;!-- Template: MyLabelB --&gt;
   * &lt;b class="TestLabel"&gt;{{label}}&lt;/b&gt;
   * </pre>
   */
  private static splitTemplates(templatesStr: string): string[] {
    const templates = []
    const arr = templatesStr.split(/\s*<!--\s*Template:\s*([^\s]+)\s*-->\s*/i)
    for (let i = 1, len = arr.length; i < len; ++i) {
      const name = arr[i]
      templates[name] = arr[++i]
    }
    return templates
  }
}

class VueTemplate {
  private BkbVue

  constructor(private context: Context<any>, private templates: string[]) {
  }

  public createVue(config: VueConfig): Vue {
    this.BkbVue = this.createBkbVue(this.context, config)
    if (!this.templates[config.templateName])
      throw new Error(`Unknown template ${config.templateName}`)
    const v = new this.BkbVue({
      el: config.el,
      replace: false,
      template: this.templates[config.templateName],
      data: config.data,
      methods: config.methods,
      destroyed: () => {
        //console.log('.................... destroyed')
        if (destroyListener) {
          destroyListener.cancel()
          destroyListener = null
        }
      }
    })
    let destroyListener = this.context.bkb.listen('destroy').call(() => {
      destroyListener.cancel()
      destroyListener = null
      v.$destroy()
    })
    return v
  }

  private createBkbVue(context: Context<any>, config: VueConfig) {
    var BkbVue = Vue.extend()
    BkbVue.directive('bkb-component', {
      bind: function () {
      },
      update: function (value) {
        if (!config.childComponents)
          return
        const Cl = config.childComponents[this.arg || this.expression]
        if (!Cl)
          return
        try {
          if (this.bkbChildComp)
            this.bkbChildComp.bkb.destroy()
// console.log('this.arg', this.arg)
// console.log('this.expression', this.expression)
// console.log('value', value)
          this.bkbChildComp = context.instanceComponent(Cl, value)
          this.bkbChildComp.attachTo(this.el)
        } catch (e) {
          context.app.bkb.log.error(e)
        }
      },
      unbind: function () {
        if (this.bkbChildComp) {
          try {
            this.bkbChildComp.bkb.destroy()
            this.bkbChildComp = null
          } catch (e) {
            context.app.bkb.log.error(e)
          }
        }
      }
    })
    return BkbVue
  }
}