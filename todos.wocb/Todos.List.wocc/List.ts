/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';
  var $ = jQuery;

  export class List implements Woc.Component {
    private model: Todos.Model;
    private tplData;

    constructor(private cc: Woc.VueComponentContext) {
      this.model = cc.getService<Todos.Model>('Todos.Model');
    }

    public attachTo(el: HTMLElement): List {
      this.tplData = {
        itemPropsList: [],
        newItemProps: {
          listCb: () => this
        },
        rmCb: (id) => {
          this.removeItem(id);
        }
      };
      this.refresh();
      this.cc.renderIn(el, 'TodosList', this.tplData);
      return this;
    }

    public destruct() {
    }

    public refresh(): void {
      var list = this.model.listTasks(),
        propsList = [],
        changed = false;
      for (var i = 0, len = list.length; i < len; ++i) {
        if (!changed && (!this.tplData.itemPropsList[i] || this.tplData.itemPropsList[i].id !== list[i].id))
          changed = true;
        propsList.push({
          id: list[i].id,
          listCb: () => this
        });
      }
      if (!changed && this.tplData.itemPropsList[i])
        changed = true;
console.log('refresh: ' + changed); // TODO call recursively to child.refresh()
      if (changed)
        this.tplData.itemPropsList = propsList;
      this.cc.callChildComponents('refresh');
    }

    private removeItem(id: number): void {
console.log('removeItem: ' + id);
      this.model.rmTask(id);
      this.refresh();
    }
  }
}
