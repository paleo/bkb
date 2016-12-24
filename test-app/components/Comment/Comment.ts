import * as $ from 'jquery'
import {Component, Dash, Bkb} from 'bkb-framework'
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import TestApp from '../TestApp/TestApp'

const templates = new RawTemplateProvider(require("html!./Comment.html"))
// import tplStr from './Comment.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class Comment implements Component {
  static readonly componentName = 'Comment'
  readonly bkb: Bkb
  private $container: JQuery

  constructor(private dash: Dash<TestApp>) {
    this.$container = $(templates.getTemplate('.Comment'))
    const $input = this.$container.find('input')
    dash.listenToParent('enabled').call('dataFirst', enabled => {
      console.log(`[parent-Event] [${this.bkb.componentName} ${this.bkb.componentId}] enabled ${enabled}`)
      $input.prop('disabled', !enabled)
    })
    // $input.click(() => {
    //   this.dash.emit('grabFocus')
    // })
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
    return this
  }
}