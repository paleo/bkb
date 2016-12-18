import {Component, Dash, Bkb} from 'bkb-framework'
import createBkbDirectives from '../../bkb-libraries/BkbMonkberryDirective'
import CommentList from '../CommentList/CommentList'
import {TestApp} from '../../start'

import * as Monkberry from 'monkberry'
import monkberryDirectives from 'monkberry-directives'
import 'monkberry-events'

import * as Template from './Task.monk'

export default class Task implements Component<Task> {
  public static componentName = 'Task'
  public bkb: Bkb<Task>
  private view: any

  private state = {
    label: 'Hop Monkberry',
    updMode: true,
    compId: null,
    ctrl: {
      select: () => {
        this.setUpdateMode(true)
        this.dash.emit('grabFocus')
      },
      changeText: (e: Event) => {
        this.state.label = (e.target as any).value
      }
    }
  }

  constructor(private dash: Dash<TestApp>) {
    this.state.compId += dash.bkb.componentId
    this.setUpdateMode(true)
    this.dash.emit('grabFocus')
    dash.onDestroy(() => {
      // console.log('destroy task')
      if (this.view) {
        this.view.remove()
        this.view = null
      }
    });
  }

  public attachTo(el: HTMLElement) {
    console.log('Task.attachTo a', this.bkb.componentId)
    this.view = Monkberry.render(Template, el, {directives: {
      ...monkberryDirectives,
      ...createBkbDirectives(this.dash.app.log, {
        'CommentList': (el: HTMLElement, value: string) => this.dash.createComponent(CommentList, value)
      })
    }})
    console.log('Task.attachTo b', this.bkb.componentId)
    this.view.on('click', 'input', (e: Event) => {
      console.log('==> click', e.target, e.currentTarget)
    })
    console.log('Task.attachTo c', this.bkb.componentId)
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
    this.dash.emit('enabled', mode)
  }
}