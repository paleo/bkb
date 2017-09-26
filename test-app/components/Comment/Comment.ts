import * as $ from 'jquery'
import {Dash, Bkb} from 'bkb'
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import TestApp from '../TestApp/TestApp'

const templates = new RawTemplateProvider(require("html-loader!./Comment.html"))
// import tplStr from './Comment.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class Comment {
  static readonly componentName = 'Comment'
  private $container: JQuery

  constructor(private dash: Dash<TestApp>, el: HTMLElement) {
    this.$container = $(templates.getTemplate('.Comment'))
    const $input = this.$container.find('input')
    dash.listenToParent('enabled').onData(enabled => {
      console.log(`[parent-Event] [${this.dash.componentName} ${this.dash.componentId}] enabled ${enabled}`)
      $input.prop('disabled', !enabled)
    })
    // $input.click(() => {
    //   this.dash.emit('grabFocus')
    // })
    $(el).append(this.$container)
  }

  public test(): this {
    return this
  }
}