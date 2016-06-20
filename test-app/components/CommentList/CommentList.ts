import $ from 'jquery'
import {Component, Context, Bkb} from 'bkb'
import Comment from "../Comment/Comment"
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import {TestApp} from '../../start'

//const templates = new RawTemplateProvider(require("html!./CommentList.html"))
import tplStr from './CommentList.html!text'
const templates = new RawTemplateProvider(tplStr)

export default class CommentList implements Component<CommentList> {
  public static componentName = 'CommentList'
  public bkb: Bkb<CommentList>
  private $container: JQuery
  private $ul: JQuery

  constructor(private context: Context<TestApp>, title: string) {
    this.$container = $(templates.getTemplate('.CommentList'))
    this.$container.find('.CommentList-h1').text(title)
    this.$ul = this.$container.find('.CommentList-ul')
    const $addBtn = this.$container.find('.CommentList-addBtn').click(() => this.add())
    context.listenParent('enabled').call((evt) => {
      console.log(`[parent-Event] [${this.bkb.componentName} ${this.bkb.componentId}] enabled ${evt.data}`)
      if (evt.data)
        $addBtn.show()
      else
        $addBtn.hide()
      context.broadcast(evt)
    })
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
  }

  public add() {
    const $li = $(templates.getTemplate('.CommentLi'))
      .appendTo(this.$ul)
    const comment = this.context.instanceComponent<Comment>(Comment).attachTo($li[0])
    const listener = this.context.listenParent('enabled').call((evt) => {
      console.log(`[parent-Event] [${this.bkb.componentName} ${this.bkb.componentId}] enabled ${evt.data} (for li)`)
      if (evt.data)
        $rmBtn.show()
      else
        $rmBtn.hide()
    })
    const $rmBtn = $li.find('.js-rmBtn').click(() => {
      $li.remove()
      comment.bkb.destroy()
      listener.cancel()
    })
  }
}