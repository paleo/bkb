/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class List implements Woc.Component {
    private model: Todos.Model;
    private $comp: JQuery;
    private $ul: JQuery;
    private items: Todos.Item[];

    constructor(private cc: Woc.HBComponentContext) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
    }

    public attachTo(el: HTMLElement): List {
      this.$comp = $(this.cc.render('TodosList')).appendTo(el);
      this.$ul = this.$comp.find('.TodosList-ul').click((e) => {
        if (!e.target['classList'])
          return;
        var btn = <HTMLButtonElement>e.target;
        if (btn.classList.contains('js-rmBtn'))
          this.removeItem(parseInt(btn.value, 10));
      });
      this.cc.createComponent<Todos.Item>('Todos.Item', {list: this}).attachTo(this.$comp.find('.TodosList-new')[0]);
      this.refresh();
      return this;
    }

    public destruct() {
      this.$ul.off();
    }

    public refresh(): void {
      // - Clear
      if (this.items) {
        this.$ul.empty();
        this.cc.removeComponent(this.items);
      }
      this.items = [];
      // - Build
      this.$ul.append(this.cc.render('each-TodosList-li', {
        items: this.model.listTasks()
      }));
      var that = this;
      this.$ul.find('.js-item').each(function () {
        that.items.push(
          that.cc.createComponent<Todos.Item>('Todos.Item', {list: this, id: $(this).attr('data-id')}).attachTo(this)
        );
      });
    }

    public add(task: ModelTask): void {
      var $li = $(this.cc.render('each-TodosList-li', {
        items: [task]
      })).appendTo(this.$ul);
      this.cc.createComponent<Todos.Item>('Todos.Item', {list: this, id: task.id}).attachTo($li.find('.js-item')[0]);
    }

    private removeItem(id: number): void {
      this.model.rmTask(id);
      this.refresh();
    }
  }
}
