import * as $ from 'jquery'
import {Component, Dash, Bkb} from 'bkb-framework'
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import {TestApp} from '../../start'

const templates = new RawTemplateProvider(require("html!./Comment.html"))
// import tplStr from './Comment.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class Comment implements Component<Comment> {
  public static componentName = 'Comment'
  public bkb: Bkb<Comment>
  private $container: JQuery

  constructor(private context: Dash<TestApp>) {
    this.$container = $(templates.getTemplate('.Comment'))
    const $input = this.$container.find('input')
    context.listenToParent('enabled').call(evt => {
      console.log(`[parent-Event] [${this.bkb.componentName} ${this.bkb.componentId}] enabled ${evt.data}`)
      $input.prop('disabled', !evt.data)
    })
    // $input.click(() => {
    //   this.context.emit('grabFocus')
    // })
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
    return this
  }
}