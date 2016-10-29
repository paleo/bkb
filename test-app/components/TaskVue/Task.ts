import {Component, Context, Bkb} from 'bkb-framework'
import CommentList from '../CommentList/CommentList'
import BkbVueProvider from '../../bkb-libraries/BkbVueProvider';
import {TestApp} from '../../start'

const templates = new BkbVueProvider(require("html!./Task.html"))
// import tplStr from './Task.html!text'
// const templates = new BkbVueProvider(tplStr)

export default class Task implements Component<Task> {
  public static componentName = 'Task'
  public bkb: Bkb<Task>

  private vm = {
    label: '',
    updMode: true
  };

  constructor(private context: Context<TestApp>) {
    this.setUpdateMode(true)
    this.context.emit<void>('grabFocus')
  }

  public attachTo(el: HTMLElement): this {
    templates.attachVue(this.context, {
      el: el,
      templateName: '.TaskV',
      data: this.vm,
      methods: {
        select: () => {
          this.setUpdateMode(true)
          this.context.emit<void>('grabFocus')
        }
      },
      childComponents: {CommentList}
    })
    return this
  }

  public setUpdateMode(mode: boolean) {
    if (this.vm.updMode === mode)
      return
    this.vm.updMode = mode
    this.context.emit('enabled', mode)
  }
}