import * as $ from 'jquery'
import { Dash, PublicDash } from 'bkb'
import Task from "../TaskJQuery/Task"
import Task2 from "../TaskMonkberry/Task"
import Task3 from "../TaskVue/Task"
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import TestApp from '../TestApp/TestApp'

const templates = new RawTemplateProvider(require("html-loader!./TodoList.html"))

export default class TodoList {
  private $container: JQuery
  private $ul: JQuery

  constructor(private dash: Dash<TestApp>, title: string, el: HTMLElement) {
    this.$container = $(templates.getTemplate('.TodoList'))
    this.$container.find('.TodoList-h1').text(title)
    this.$ul = this.$container.find('.TodoList-ul')
    this.$container.find('.TodoList-addBtn').click(() => this.add())

    dash.listenToChildren('grabFocus', { group: 'items' }).onEvent(ev => {
      console.log(`[Event] grabFocus`, this)
      for (const child of dash.children<Task>({ group: 'items' })) {
        if (child !== ev.source)
          child.setUpdateMode(false)
      }
    })
    this.$container.appendTo(el)
  }

  public add() {
    this.dash.app.log.info('add from todolist')
    const $li = $(templates.getTemplate('.TodoLi'))
    const task = this.dash.create(this.getTaskClass(), $li.find('.TodoLi-content')[0])
    this.dash.addToGroup(task, 'items')
    $li.appendTo(this.$ul).find('.TodoLi-rmBtn').click(() => {
      this.dash.getPublicDashOf(task).destroy()
      $li.remove()
    })
  }

  private getTaskClass(): typeof Task {
    let val = this.$ul.children().length % 3
    // console.log('-->', val, this.$ul.children())
    switch (val) {
      case 1:
        return Task2 as any
      case 2:
        return Task3 as any
      case 0:
        return Task
    }
  }
}