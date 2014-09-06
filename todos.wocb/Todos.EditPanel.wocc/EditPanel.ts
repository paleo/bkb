/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class EditPanel implements Woc.Component {
    private model: Todos.Model;
    private $el: JQuery;

    constructor(private cc: Woc.HBComponentContext) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
    }

    public attachTo(el: HTMLElement): EditPanel {
      this.$el = $(el);
      return this;
    }

    public setTask(taskId: number) {
      this.$el.text('-> ' + this.model.getTask(taskId).title);
    }
  }
}
