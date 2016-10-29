import $ from 'jquery'
import {Component, Context, Bkb} from 'bkb-framework'
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import {TestApp} from '../../start'

const templates = new RawTemplateProvider(require("html!./Comment.html"))
// import tplStr from './Comment.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class Comment implements Component<Comment> {
  public static componentName = 'Comment'
  public bkb: Bkb<Comment>
  private $container: JQuery

  constructor(private context: Context<TestApp>) {
    this.$container = $(templates.getTemplate('.Comment'))
    const $input = this.$container.find('input')
    context.listenParent('enabled').call((evt) => {
      console.log(`[parent-Event] [${this.bkb.componentName} ${this.bkb.componentId}] enabled ${evt.data}`)
      $input.prop('disabled', !evt.data)
    })
    // $input.click(() => {
    //   this.context.emit<void>('grabFocus')
    // })
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
    return this
  }
}