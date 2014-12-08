/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class Item implements Woc.Component {
    private model: Todos.Model;
    private list: Todos.List;
    private insert: boolean;
    private task: ModelTask;
    private tplData;

    constructor(private cc: Woc.VueComponentContext, private props: {}) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
      this.list = props['listCb']();
      this.insert = props['id'] === null || props['id'] === undefined;
      if (this.insert)
        this.task = this.model.newTask();
      else
        this.task = this.model.getTask(props['id']);
    }

    public attachTo(el: HTMLElement): void {
      if (this.insert) {
        this.tplData = {
          title: this.task.title
        };
        this.cc.bindTemplate({
          el: el,
          wocTemplate: 'TodosNewItem',
          data: this.tplData,
          methods: {
            addCb: (e) => {
              e.preventDefault();
              this.cc.logWrap(() => this.add());
            }
          }
        });
      } else {
        this.tplData = {
          title: this.task.title
        };
        this.cc.bindTemplate({
          el: el,
          wocTemplate: 'TodosItem',
          data: this.tplData,
          methods: {
            editCb: () => {
              this.cc.getService<Woc.Router>('Woc.Router').navigate('todos/' + this.task.id);
            }
          }
        });
      }
    }

    public destruct() {
      console.log('Item: DESTRUCT ' + (this.task ? '' + this.task.id : 'NULL'));
    }

    public refresh() {
      if (!this.insert) {
        this.task = this.model.getTask(this.task.id);
        if (this.task) // test is exists (the view sync can be differed)
          this.tplData.title = this.task.title;
      }
    }

    private add() {
      this.task.title = this.tplData.title;
      this.model.addTask(this.task);
      this.task = this.model.newTask();
      this.tplData.title = this.task.title;
      this.list.refresh();
    }
  }
}
