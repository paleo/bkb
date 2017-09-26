import { Log, Dash } from 'bkb'

type Comp = MonkberryComponent

export interface MonkberryComponent {
  update?(value?: string): void
}

export interface ComponentMakers {
  [directiveName: string]: (el: HTMLElement, value?: string) => MonkberryComponent
}

export default function createBkbDirectives(log: Log, makers: ComponentMakers, dash: Dash) {
  let directives = {}
  for (let name in makers) {
    if (makers.hasOwnProperty(name))
      directives[name] = createDirective(log, makers[name], name, dash)
  }
  return directives
}

function createDirective(log: Log, maker: (el: HTMLElement, value?: string) => Comp, directiveName: string, dash: Dash) {
  return class {
    private comp: Comp | null
    private el: HTMLElement | null

    bind(node) {
      this.el = node
    }

    unbind() {
      this.el = null
      if (this.comp) {
        try {
          dash.getBkbOf(this.comp).destroy()
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
        } else
          this.comp = maker(this.el, value)
      } catch (e) {
        log.error(e)
      }
    }
  }
}
