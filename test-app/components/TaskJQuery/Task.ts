import * as $ from 'jquery'
import {Component, Dash, Bkb} from 'bkb-framework'
import RawTemplateProvider from '../../bkb-libraries/RawTemplateProvider'
import CommentList from '../CommentList/CommentList'
import TestApp from '../TestApp/TestApp'

const templates = new RawTemplateProvider(require("html!./Task.html"))
// import tplStr from './Task.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class Task implements Component {
  static readonly componentName = 'Task'
  readonly bkb: Bkb
  private $container: JQuery
  private $update: JQuery
  private $read: JQuery
  private $input: JQuery
  private $lbl: JQuery
  private updMode: boolean
  
  constructor(private dash: Dash<TestApp>) {
    this.$container = $(templates.getTemplate('.Task'))
    this.$update = this.$container.find('.js-update')
    this.$read = this.$container.find('.js-read')
      .click(() => {
        this.setUpdateMode(true)
        this.dash.emit('grabFocus')
      })
    this.$input = this.$container.find('.js-input')
    this.$lbl = this.$container.find('.js-lbl')
    dash.create(CommentList).attachTo(this.$container.find('.Task-comments')[0])
    this.setUpdateMode(true)
    this.dash.emit('grabFocus')
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
    return this
  }

  public setUpdateMode(mode: boolean) {
    if (this.updMode === mode)
      return
    this.updMode = mode
    if (mode) {
      this.$read.hide()
      this.$update.show()
      this.$input.focus()
    } else {
      this.$update.hide()
      this.$read.show()
      this.$lbl.text(this.$input.val())
    }
    this.dash.emit('enabled', mode)
  }
}