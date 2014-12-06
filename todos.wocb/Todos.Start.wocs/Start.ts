/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class Start implements Woc.StartingPoint {

    constructor(private sc: Woc.ServiceContext) {
    }

    public start(el: HTMLElement) {
      el.classList.add('AppWrapper');
      this.sc.createComponent('Tarh.Tools.ScreenSwitcher', [
        {
          route: '',
          comp: this.sc.createComponent('Todos.List'),
          title: 'List of tasks',
          activate: (query: EasyRouter.Query, comp: Todos.List) => {
            //try {
              comp.refresh();
            //} catch (e) {
            //  console.log(e);
            //}
          }
        },
        {
          route: 'todos/:id',
          comp: this.sc.createComponent('Todos.EditPanel'),
          title: (query: EasyRouter.Query) => {
            var id = parseInt(query.routeParams['id'], 10);
            return (<Todos.Model>this.sc.getService('Todos.Model')).getTask(id).title + ' | Edition';
          },
          activate: (query: EasyRouter.Query, comp: Todos.EditPanel) => {
            var id = parseInt(query.routeParams['id'], 10);
            comp.setTask(id);
          }
        }
      ]).attachTo(el);
    }
  }
}
