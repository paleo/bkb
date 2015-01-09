/// <reference path='../defs/test.d.ts' />

module Test {
  'use strict';

  export class Start implements Woc.StartingPoint {
    private model: Test.Model;

    constructor(private sc: Woc.ServiceContext) {
      this.model = this.sc.getService('Test.Model');
    }

    public start(el: HTMLElement) {
      el.classList.add('AppWrapper');
      this.sc.createComponent('Public.ScreenRouter', [
        {
          route: '',
          comp: this.sc.createComponent('Test.List'),
          title: 'List of tasks',
          activate: (query: EasyRouter.Query, comp: Test.List) => {
            comp.refresh();
          }
        },
        {
          route: 'task/:taskId',
          comp: this.sc.createComponent('Test.EditPanel'),
          canActivate: (query: EasyRouter.Query) => {
            var id = parseInt(query.routeParams['taskId'], 10);
            return this.model.getTask(id) ? true : false;
          },
          title: (query: EasyRouter.Query) => {
            var id = parseInt(query.routeParams['taskId'], 10),
              task = this.model.getTask(id);
            return task.title + ' | Edition';
          },
          activate: (query: EasyRouter.Query, comp: Test.EditPanel) => {
            var id = parseInt(query.routeParams['taskId'], 10);
            comp.setTask(id);
          }
        }
      ]).attachTo(el);
    }
  }
}
