import {Component, Context, Bkb} from 'bkb-framework'
import createBkbMonkberryDirective from '../../bkb-libraries/BkbMonkberryDirective';
import CommentList from '../CommentList/CommentList'
import {TestApp} from '../../start'
import Template from './Task.monk'


export default class Task implements Component<Task> {
  public static componentName = 'Task'
  public bkb: Bkb<Task>

  private state = {
    label: 'Hop Monkberry',
    updMode: true
  };

  constructor(private context: Context<TestApp>) {
    this.setUpdateMode(true)
    this.context.emit<void>('grabFocus')
  }

  public attachTo(el: HTMLElement) {
    templates.attachMonkberry(this.context, {
      el: el,
      templateName: '.TaskV',
      data: this.state,
      methods: {
        select: () => {
          this.setUpdateMode(true)
          this.context.emit<void>('grabFocus')
        }
      },
      childComponents: {
        CommentList: CommentList
      }
    })
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
    this.context.emit('enabled', mode)
  }
}