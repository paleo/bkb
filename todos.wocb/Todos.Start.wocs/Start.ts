/// <reference path='../todos.d.ts' />
/// <reference path="../Test.Label.wocc/Label.ts" />

module Todos {
  'use strict';

  export class Start implements Woc.StartingPoint {
    private $list: JQuery;
    private $edit: JQuery;
    private list: Todos.List;
    //private edit: Todos.Edit;

    constructor(private sc: Woc.ServiceContext) {
    }

    public start(el: HTMLElement) {
      var $el = $(el);

      this.$list = $('<div></div>').appendTo($el);
      this.list = this.sc.createComponent<Todos.List>('Todos.List').attachTo(this.$list[0]);

      this.$edit = $('<div></div>').appendTo($el);
      //this.edit = this.sc.createComponent<Todos.Edit>('Todos.Edit').attachTo(this.$edit[0]);

      var routerProvider = this.sc.getService<WocGeneric.EasyRouterProvider>('WocGeneric.EasyRouterProvider');
      var router = routerProvider.createRouter().map([
        {
          route: '',
          activate: () => { this.activateList(); },
          title: 'Liste des tâches'
        },
        {
          route: 'todos/:id',
          activate: (prop: EasyRouter.RouteQuery) => { this.activateEdit(prop); },
          title: (prop: EasyRouter.RouteQuery) => { return this.makeEditTitle(prop); }
        }
      ]).mapUnknownRoutes({
        useQueryString: '404',
        activate: (prop: EasyRouter.RouteQuery) => { this.activate404(prop); },
        title: '404 Not Found'
      });
      routerProvider.start(router, {
        hashBangMode: true
      });
    }

    private activateList(): void {
      this.sc.getService<Woc.Log>('Woc.Log').wrap(() => {
        this.$edit.hide();
        this.$list.show();
        this.list.refresh();
      });
    }

    private activateEdit(prop: EasyRouter.RouteQuery): void {
      this.sc.getService<Woc.Log>('Woc.Log').wrap(() => {
        this.$list.hide();
        this.$edit.show();
        var id = parseInt(prop.routeParams['id'], 10);
        this.$edit.text(id);
      });
    }

    private makeEditTitle(prop: EasyRouter.RouteQuery): string {
      var id = parseInt(prop.routeParams['id'], 10);
      return this.sc.getService<Todos.Model>('Todos.Model').getTask(id).title;
    }

    private activate404(prop: EasyRouter.RouteQuery): void {
      console.log('Unknown page: ' + prop.queryString);
    }







    private testDialog(element: HTMLElement) {
      $(element).append('<p>Hello World!</p>');
      var l: Test.Label = this.sc.createComponent<Test.Label>('Test.Label', {'label': 'Hello!'});
      l.attachTo(element);

      //return;

      var dialogs: WocGeneric.Dialogs = this.sc.getService<WocGeneric.Dialogs>('WocGeneric.Dialogs');
      dialogs.showInfo('Info!');
      dialogs.showInfo('Info2!');
      dialogs.showWarning('Warn3!');
      dialogs.showError('Err!').then(() => {
        console.log('err done...');
      });
      dialogs.showError('Err2!').then(() => {
        console.log('err done...');
      });
      dialogs.confirm('confirm?', [{
        label: 'Yep',
        returnValue: 'y',
        isDefault: true
      }, {
        label: 'Nope',
        returnValue: 'n'
      }]).then((val) => {
        console.log('...confirm: ' + val);
      });
    }

    public test() {
      var routerProvider: WocGeneric.EasyRouterProvider = this.sc.getService<WocGeneric.EasyRouterProvider>('WocGeneric.EasyRouterProvider');

      var child = routerProvider.createRouter().map([
        {
          route: 'details',
          activate: (prop: EasyRouter.RouteQuery) => { this.activateTodoDetails(prop); },
          title: 'Détails'
        }
      ]);

      var root = routerProvider.createRouter().map([
        {
          route: '',
          redirectTo: 'todos'
        },
        {
          route: 'todos',
          activate: (prop: EasyRouter.RouteQuery) => { this.activateTestList(prop); },
          title: 'Liste des TODOS'
        },
        {
          route: 'todos/:id',
          activate: (prop: EasyRouter.RouteQuery) => { this.activateTodo(prop); },
          title: (prop: EasyRouter.RouteQuery) => { return this.makeTodoTitle(prop); }
        },
        {
          route: 'todos/:id/*',
          child: child
        }
      ]).mapUnknownRoutes({
        useQueryString: '404',
        activate: (prop: EasyRouter.RouteQuery) => { this.activateTest404(prop); },
        title: '404 Not Found'
      });
      var p = routerProvider.start(root, {
        hashBangMode: true,
        firstQueryString: 'todos/456'
      });
      //p = p.then(() => {
      //  console.log('STEP 1...');
      //  root.navigate('todos');
      //});
      p = p.then(() => {
        window.setTimeout(() => {
          console.log('STEP 2...');
          root.navigate('todos/4442/details');
        }, 100);
      });
      // then(() => {
      //  console.log('STEP 2...');
      //  root.navigate('todos/123');
      //});
    }

    private activateTestList(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateList: ' + JSON.stringify(prop));
    }
    private activateTodo(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateTodo: ' + JSON.stringify(prop));
    }
    private makeTodoTitle(prop: EasyRouter.RouteQuery): string {
      console.log('............ makeTodoTitle: ' + JSON.stringify(prop));
      return 'MyTitle: ' + prop.routeParams['id'];
    }
    private activateTest404(prop: EasyRouter.RouteQuery): void {
      console.log('............ activate404: ' + JSON.stringify(prop));
    }
    private activateTodoDetails(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateTodoDetails: ' + JSON.stringify(prop));
    }
  }
}
