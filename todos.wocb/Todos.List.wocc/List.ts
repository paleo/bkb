/// <reference path='../defs/Todos.d.ts' />

module Todos {
  'use strict';

  export interface Refreshable {
    refresh(): void;
  }

  export class List implements Woc.Component {
    private model: Todos.Model;
    private router: Woc.Router;
    private tplData;

    constructor(private cc: WocTeam.VueComponentContext) {
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
            this.router.navigate('todos/' + id);
          }
        }
      });
    }

    public refresh(): void {
      var list = this.model.listTasks(true);
      if (!List.eqList(list, this.tplData.taskList))
        this.tplData.taskList = list;
      this.cc.callChildComponents('refresh');
    }

    private removeItem(id: number): void {
      this.model.rmTask(id);
      this.refresh();
    }

    private static eqList(list1, list2) {
      if (list1.length !== list2.length)
        return false;
      for (var i = 0, len = list1.length; i < len; ++i) {
        if (!list2[i] || list1[i].id !== list2[i].id || list1[i].title !== list2[i].title)
          return false;
      }
      return true;
    }
  }
}
