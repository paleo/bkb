/// <reference path='../todos.d.ts' />

module Todos {
  'use strict';

  export class Item implements Woc.Component {
    private task: ModelTask;
    private $el: JQuery;

    constructor(private cc: Woc.HBComponentContext, props: {}) {
      this.task = this.cc.getService<Todos.Model>('Todos.Model').getTask(props['id']);
    }

    public attachTo(el: HTMLElement): Item {
      this.$el = $(el).append(this.cc.render('TodosItem', this.task));
      this.$el.find('.TodosItem-editBtn').click(() => {
        this.cc.getService<Woc.Router>('Woc.Router').navigate('todos/' + this.task.id).then((b) => {
console.log('then: ' + b);
        });
      });
      return this;
    }

    public destruct() {
      this.$el.off();
    }
  }
}
