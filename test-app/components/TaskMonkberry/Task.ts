import {Component, Context, Bkb} from 'bkb-framework'
import createBkbMonkberryDirective from '../../bkb-libraries/BkbMonkberryDirective'
import CommentList from '../CommentList/CommentList'
import {TestApp} from '../../start'

import * as Monkberry from 'monkberry'
import directives from 'monkberry-directives'
import 'monkberry-events'

import * as Template from './Task.monk'
// // let t: { new(): {} } = <any>Template
// // class T extends t {
// // }
// let T: any = {}
// T.prototype = Object.create(Template)
// T.select = e => {
//   console.log(e)
//   //this.setUpdateMode(true)
//   //this.context.emit<void>('grabFocus')
// }
//
// console.log(Template)
// console.log(T)

export default class Task implements Component<Task> {
  public static componentName = 'Task'
  public bkb: Bkb<Task>
  private view: any

  private state = {
    label: 'Hop Monkberry',
    updMode: true,
    select: e => {
      console.log(e)
      this.setUpdateMode(true)
      this.context.emit<void>('grabFocus')
    }
  }

  constructor(private context: Context<TestApp>) {
    this.setUpdateMode(true)
    this.context.emit<void>('grabFocus')
  }

  public attachTo(el: HTMLElement) {

    this.view = Monkberry.render(Template, el, {directives})
    this.view.on('change', 'input', (e: Event) => {
      this.state.label = (e.target as any).value
    })
    this.view.update(this.state)

    // templates.attachMonkberry(this.context, {
    //   el: el,
    //   templateName: '.TaskV',
    //   data: this.state,
    //   methods: {
    //     select: () => {
    //       this.setUpdateMode(true)
    //       this.context.emit<void>('grabFocus')
    //     }
    //   },
    //   childComponents: {
    //     CommentList: CommentList
    //   }
    // })

    // new Monkberry({
    //   el: el,
    //   replace: false,
    //   template: templates.getTemplate('.TaskV'),
    //   data: this.vm,
    //   methods: {
    //     select: () => {
    //       this.setUpdateMode(true)
    //       this.context.emit<void>('grabFocus')
    //     }
    //   }
    // })

    return this
  }

  public setUpdateMode(mode: boolean) {
    if (this.state.updMode === mode)
      return
    this.state.updMode = mode
    this.view.update(this.state)
    this.context.emit('enabled', mode)
  }
}