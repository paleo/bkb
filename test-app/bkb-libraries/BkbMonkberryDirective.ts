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
    directives[name] = createDirective(log, makers[name], name)
  }
  return directives
}

function createDirective(log: Log, maker: (el: HTMLElement, value: string) => Comp, directiveName: string) {

  let comp: Comp,
    el: HTMLElement


  return class {
    bind(node) {
      el = node
    }

    unbind() {
      el = null
      if (comp) {
        try {
          comp.bkb.destroy()
          comp = null
        } catch (e) {
          log.error(e)
        }
      }
    }

    update(value?: string) {
      try {
        if (!el)
          throw new Error('Cannot call method "update" of an unbound directive')
        if (comp) {
          if (!comp.update)
            throw new Error(`Missing method "update" in component of the Monkberry directive "${directiveName}"`)
          comp.update(value)
        } else {
          comp = maker(el, value)
          comp.attachTo(el)
        }
      } catch (e) {
        log.error(e)
      }
    }
  }
}
