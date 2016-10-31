import {Component, Context, Bkb} from 'bkb-framework'
import createBkbDirectives from '../../bkb-libraries/BkbMonkberryDirective'
import CommentList from '../CommentList/CommentList'
import {TestApp} from '../../start'

import * as Monkberry from 'monkberry'
import directives from 'monkberry-directives'
import 'monkberry-events'

import * as Template from './Task.monk'

export default class Task implements Component<Task> {
  public static componentName = 'Task'
  public bkb: Bkb<Task>
  private view: any
  private directives: any

  private state = {
    label: 'Hop Monkberry',
    updMode: true,
    ctrl: {
      select: e => {
        this.setUpdateMode(true)
        this.context.emit<void>('grabFocus')
      },
      changeText: (e: Event) => {
        this.state.label = (e.target as any).value
      }
    }
  }

  constructor(private context: Context<TestApp>) {
    this.setUpdateMode(true)
    this.context.emit<void>('grabFocus')

    this.directives = createBkbDirectives(context.app.log, {
      'CommentList': (el: HTMLElement, value: string) => context.createComponent(CommentList, value)
    })
    for (let name in directives) {
      if (directives.hasOwnProperty(name))
        this.directives[name] = directives[name]
    }
  }

  public attachTo(el: HTMLElement) {
    this.view = Monkberry.render(Template, el, {directives: this.directives})
    // this.view.on('change', 'input', (e: Event) => {
    //   this.state.label = (e.target as any).value
    // })
    this.view.update(this.state)

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