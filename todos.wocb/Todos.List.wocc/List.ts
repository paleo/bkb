/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export interface Refreshable {
    refresh(): void;
  }

  export class List implements Woc.Component {
    private model: Todos.Model;
    private router: Woc.Router;
    private tplData;

    constructor(private cc: Woc.VueComponentContext) {
      this.model = cc.getService('Todos.Model');
      this.router = cc.getService('Woc.Router');
    }

    public attachTo(el: HTMLElement): void {
      this.tplData = {
        taskList: [],
        createTaskProps: {
          refreshCb: () => {
            this.refresh();
          }
        }
      };
      this.refresh();
      this.cc.bindTemplate({
        el: el,
        wocTemplate: 'TodosList',
        data: this.tplData,
        methods: {
          rmCb: (id) => {
            this.removeItem(id);
          },
          editCb: (id) => {
            this.cc.getService<Woc.Router>('Woc.Router').navigate('todos/' + id);
          }
        }
      });
    }

    public refresh(): void {
      var list = this.model.listTasks(),
        taskList = [],
        changed = false;
      for (var i = 0, len = list.length; i < len; ++i) {
        if (!changed && !List.eqTask(this.tplData.taskList[i], list[i]))
          changed = true;
        taskList.push({
          id: list[i].id,
          title: list[i].title
        });
      }
      if (!changed && this.tplData.taskList[i])
        changed = true;
      if (changed)
        this.tplData.taskList = taskList;
      this.cc.callChildComponents('refresh');
    }

    private removeItem(id: number): void {
      this.model.rmTask(id);
      this.refresh();
    }

    private static eqTask(task1, task2) {
      if (!task1 || !task2)
        return false;
      return task1.id === task2.id && task1.title === task2.title;
    }
  }
}
