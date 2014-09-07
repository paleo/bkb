/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class Item implements Woc.Component {
    private model: Todos.Model;
    private list: Todos.List;
    private insert: boolean;
    private task: ModelTask;
    private $editBtn: JQuery;
    private $addForm: JQuery;
    private $addTitle: JQuery;

    constructor(private cc: Woc.HBComponentContext, props: {}) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
      this.list = props['list'];
      this.insert = props['id'] ? false : true;
      if (this.insert)
        this.task = this.model.newTask();
      else
        this.task = this.model.getTask(props['id']);
    }

    public attachTo(el: HTMLElement): Item {
      if (this.insert) {
        this.$addForm = $(this.cc.render('TodosNewItem', this.task)).appendTo(el);
        this.$addForm.submit((e) => {
          e.preventDefault();
          this.cc.getService<Woc.Log>('Woc.Log').wrap(() => this.add());
        });
        this.$addTitle = this.$addForm.find('.js-newTitle');
      } else {
        var $comp = $(this.cc.render('TodosItem', this.task)).appendTo(el);
        this.$editBtn = $comp.find('.TodosItem-editBtn').click(() => {
          this.cc.getService<Woc.Router>('Woc.Router').navigate('todos/' + this.task.id);
        });
      }
      return this;
    }

    public destruct() {
      if (this.insert)
        this.$addForm.off();
      else
        this.$editBtn.off();
    }

    private add() {
      this.task.title = this.$addTitle.val();
      this.list.add(this.model.addTask(this.task));
      this.task = this.model.newTask();
      this.$addTitle.val(this.task.title);
    }
  }
}
