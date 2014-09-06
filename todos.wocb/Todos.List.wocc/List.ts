/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class List implements Woc.Component {
    private model: Todos.Model;
    private $el: JQuery;
    private items: Todos.Item[];

    constructor(private cc: Woc.HBComponentContext) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
    }

    public attachTo(el: HTMLElement): List {
      this.$el = $(el);
      this.refresh();
      return this;
    }

    public refresh() {
      // - Clear
      if (this.items)
        this.cc.removeComponent(this.items);
      // - Build
      this.items = [];
      this.$el.empty().append(this.cc.render('TodosList', {
        items: this.model.listTasks()
      }));
      var that = this;
      this.$el.find('.sd-item').each(function () {
        that.cc.createComponent<Todos.Item>('Todos.Item', {id: $(this).attr('data-id')}).attachTo(this);
      });
    }
  }
}
