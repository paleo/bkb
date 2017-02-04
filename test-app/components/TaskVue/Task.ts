import {Component, Dash, Bkb} from 'bkb'
import CommentList from '../CommentList/CommentList'
import BkbVueProvider from '../../bkb-libraries/BkbVueProvider';
import TestApp from '../TestApp/TestApp'

const templates = new BkbVueProvider(require("html-loader!./Task.html"))
// import tplStr from './Task.html!text'
// const templates = new BkbVueProvider(tplStr)

export default class Task {
  static readonly componentName = 'Task'

  private vm = {
    label: '',
    updMode: true
  };

  constructor(private dash: Dash<TestApp>, el: HTMLElement) {
    this.setUpdateMode(true)
    templates.attachVue(this.dash, {
      el: el,
      templateName: '.TaskV',
      data: this.vm,
      methods: {
        select: () => {
          this.setUpdateMode(true)
          this.dash.emit('grabFocus')
        }
      },
      childComponents: {CommentList}
    })
    this.dash.emit('grabFocus')
    return this
  }

  public setUpdateMode(mode: boolean) {
    if (this.vm.updMode === mode)
      return
    this.vm.updMode = mode
    this.dash.emit('enabled', mode)
  }
}