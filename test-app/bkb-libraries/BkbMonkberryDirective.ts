import {Context} from 'bkb-framework'

export default function createBkbMonkberryDirective(context: Context<any>) {
  let bkbChildComp
  return class BkbMonkberryDirective {
    private el: HTMLElement
    
    constructor() {
      this.el = null
    }

    bind(node) {
      this.el = node
    }

    unbind(node) {
      if (bkbChildComp) {
        try {
          bkbChildComp.bkb.destroy()
          bkbChildComp = null
        } catch (e) {
          context.app.bkb.log.error(e)
        }
      }
      this.el = null
    }

    update(ClName: string) {
//       if (!ClName)
//         return
//       if (!Cl)
//         return
//       try {
//         if (bkbChildComp)
//           bkbChildComp.bkb.destroy()
// // console.log('this.arg', this.arg)
// // console.log('this.expression', this.expression)
// // console.log('value', value)
//         bkbChildComp = context.createComponent(Cl, value)
//         bkbChildComp.attachTo(this.el)
//       } catch (e) {
//         context.app.bkb.log.error(e)
//       }
    }
  }
}
