import {Dash} from 'bkb'

declare type Vue = any
declare let Vue: any // { new(config: any): Vue }

export interface VueConfig {
  el: HTMLElement
  data?: any
  methods?: any
  templateName: string
  childComponents?: any
}

export default class BkbVueProvider {
  private templates: string[]

  constructor(templatesStr: string) {
    this.templates = BkbVueProvider.splitTemplates(templatesStr)
  }

  public attachVue(dash: Dash<any>, config: VueConfig): Vue {
    const vt = new VueTemplate(dash, this.templates)
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

  constructor(private dash: Dash<any>, private templates: string[]) {
  }

  public createVue(config: VueConfig): Vue {
    this.BkbVue = this.createBkbVue(this.dash, config)
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
          destroyListener.disable()
          destroyListener = null
        }
      }
    })
    let destroyListener = this.dash.bkb.listen('destroy').call(() => {
      destroyListener.disable()
      destroyListener = null
      v.$destroy()
    })
    return v
  }

  private createBkbVue(dash: Dash<any>, config: VueConfig) {
// console.log('............. yop', config)
    let BkbVue = Vue.extend()
    BkbVue.directive('bkb', {
      bind: function (el, binding, vnode) {
// console.log('............. bind', el, binding, vnode)
        if (!config.childComponents)
          return
        const Cl = config.childComponents[binding.arg]
        if (!Cl)
          return
        try {
          if (binding.bkbChildComp)
            binding.bkbChildComp.bkb.destroy()
          binding.bkbChildComp = dash.create(Cl)
          if (!binding.bkbChildComp.attachTo)
            throw new Error('Component created by a Vue directive must have a method "attachTo"')
          binding.bkbChildComp.attachTo(el)
        } catch (e) {
          dash.app.bkb.log.error(e)
        }
      },
      inserted: function (el) {
// console.log('............. inserted', el)
      },
      update: function (value) {
// console.log('............. update', value)
      },
      unbind: function (el, binding) {
// console.log('............. unbind', arguments)
        if (binding.bkbChildComp) {
          try {
            binding.bkbChildComp.bkb.destroy()
            binding.bkbChildComp = null
          } catch (e) {
            dash.app.bkb.log.error(e)
          }
        }
      }
    })
    return BkbVue
  }
}