import {Log, Component} from 'bkb-framework'

type Comp = Component<any> & MonkberryComponent

export interface MonkberryComponent {
  attachTo(el: HTMLElement): void
  update?(value: string): void
}

export interface ComponentMakers {
  [directiveName: string]: (el: HTMLElement, value?: string) => Component<any> & MonkberryComponent
}

export default function createBkbDirectives(log: Log, makers: ComponentMakers) {
  let directives = {}
  for (let name in makers) {
    if (makers.hasOwnProperty(name))
      directives[name] = createDirective(log, makers[name], name)
  }
  return directives
}

function createDirective(log: Log, maker: (el: HTMLElement, value: string) => Comp, directiveName: string) {
  return class {
    private comp: Comp
    private el: HTMLElement

    bind(node) {
      this.el = node
    }

    unbind() {
      this.el = null
      if (this.comp) {
        try {
          this.comp.bkb.destroy()
          this.comp = null
        } catch (e) {
          log.error(e)
        }
      }
    }

    update(value?: string) {
      try {
        if (!this.el)
          throw new Error('Cannot call method "update" of an unbound directive')
        if (this.comp) {
          if (!this.comp.update)
            throw new Error(`Missing method "update" in component of the Monkberry directive "${directiveName}"`)
          this.comp.update(value)
        } else {
          this.comp = maker(this.el, value)
          this.comp.attachTo(this.el)
        }
      } catch (e) {
        log.error(e)
      }
    }
  }
}
