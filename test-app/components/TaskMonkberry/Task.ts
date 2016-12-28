import {Component, Dash, Bkb} from 'bkb'
import createBkbDirectives from '../../bkb-libraries/BkbMonkberryDirective'
import CommentList from '../CommentList/CommentList'
import TestApp from '../TestApp/TestApp'

import * as Monkberry from 'monkberry'
import monkberryDirectives from 'monkberry-directives'
import 'monkberry-events'

import * as Template from './Task.monk'

export default class Task implements Component {
  public static componentName = 'Task'
  readonly bkb: Bkb
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
    this.state.compId = dash.bkb.componentId
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
    this.view = Monkberry.render(Template, el, {
      noCache: true,
      directives: {
        ...monkberryDirectives,
        ...createBkbDirectives(this.dash.app.log, {
          'CommentList': (el: HTMLElement, value: string) => {
            return this.dash.create(CommentList, {
              args: [value]
            })
          }
        })
      }
    })
    // this.view.on('click', 'input', (e: Event) => {
    //   console.log('==> click', e.target, e.currentTarget)
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