import * as $ from 'jquery'
import {Component, Dash, Bkb} from 'bkb-framework'
//import Task from "../TaskVue/Task"
import Task from "../TaskMonkberry/Task"
//import Task from "../TaskJQuery/Task"
import RawTemplateProvider from "../../bkb-libraries/RawTemplateProvider"
import {TestApp} from '../../start'
import {MonkberryComponent} from '../../bkb-libraries/BkbMonkberryDirective'

const templates = new RawTemplateProvider(require("html!./TodoList.html"))
// import tplStr from './TodoList.html!text'
// const templates = new RawTemplateProvider(tplStr)

export default class TodoList implements Component<TodoList> {
  public static componentName = 'TodoList'
  public bkb: Bkb<TodoList>
  private $container: JQuery
  private $ul: JQuery

  constructor(private dash: Dash<TestApp>, title: string) {
    this.$container = $(templates.getTemplate('.TodoList'))
    this.$container.find('.TodoList-h1').text(title)
    this.$ul = this.$container.find('.TodoList-ul')
    this.$container.find('.TodoList-addBtn').click(() => this.add())
    dash.listenToChildren('grabFocus', {groupName: 'items'}).call((evt) => {
      console.log(`[Event] [${this.bkb.componentName} ${this.bkb.componentId}] grabFocus`)
      for (const child of dash.find<Task>({groupName: 'items', componentName: 'Task'})) {
        if (child !== evt.source)
          child.setUpdateMode(false)
      }
    })
  }

  public attachTo(el: HTMLElement) {
    $(el).append(this.$container)
  }

  public add() {
    this.dash.app.log.info('add from todolist')
    const $li = $(templates.getTemplate('.TodoLi'))
      .appendTo(this.$ul)
    const task = this.dash.createComponent(Task, {groupName: 'items'}).attachTo($li.find('.TodoLi-content')[0])
    $li.find('.TodoLi-rmBtn').click(() => {
      //task[this.dash.app.bkbSymbol].destroy();
      //this.dash.app.getBkb(task).destroy()
      task.bkb.destroy()
      $li.remove()
    })
  }
}