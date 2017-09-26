import * as $ from 'jquery'
import {Dash, Bkb} from 'bkb'
import Comment from "../Comment/Comment"
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import TestApp from '../TestApp/TestApp'

// import tplStr from "html-loader!./CommentList.html";

const templates = new RawTemplateProvider(require("html-loader!./CommentList.html"))
// import tplStr from './CommentList.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class CommentList {
  static readonly componentName = 'CommentList'
  private $container: JQuery
  private $ul: JQuery

  constructor(private dash: Dash<TestApp>, el: HTMLElement, title: string) {
    this.$container = $(templates.getTemplate('.CommentList'))
    this.$container.find('.CommentList-h1').text(title)
    this.$ul = this.$container.find('.CommentList-ul')
    const $addBtn = this.$container.find('.CommentList-addBtn').click(() => this.add())
    dash.listenToParent('enabled').onEvent(evt => {
      console.log(`[parent-Event] [${dash.componentName} ${dash.componentId}] enabled ${evt.data}`)
      if (evt.data)
        $addBtn.show()
      else
        $addBtn.hide()
      dash.broadcast(evt)
    })
    $(el).append(this.$container)
  }

  public add() {
    const $li = $(templates.getTemplate('.CommentLi'))
      .appendTo(this.$ul)
    const comment = this.dash.create(Comment, {args: [$li[0]]}).test()
    const listener = this.dash.listenToParent('enabled').onEvent(evt => {
      console.log(`[parent-Event] [${this.dash.componentName} ${this.dash.componentId}] enabled ${evt.data} (for li)`)
      if (evt.data)
        $rmBtn.show()
      else
        $rmBtn.hide()
    })
    const $rmBtn = $li.find('.js-rmBtn').click(() => {
      $li.remove()
      this.dash.getBkbOf(comment).destroy()
      listener.disable()
    })
  }

  /**
   * MonkberryComponent
   */
  public update() {
  }
}