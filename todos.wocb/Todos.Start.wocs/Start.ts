/// <reference path="../d.ts/WocGeneric.d.ts" />
/// <reference path="../d.ts/jquery.d.ts" />
/// <reference path="../Test.Label.wocc/Label.ts" />

module Todos {
  'use strict';

  export class Start implements Woc.StartingPoint {
    constructor(private sc: Woc.ServiceContext) {
    }

    public start(element: HTMLElement) {
      $(element).append('<p>Hello World!</p>');
      var l: Test.Label = this.sc.createComponent<Test.Label>('Test.Label', {'label': 'Hello!'});
      l.attachTo(element);

      this.test();
      return;

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
          activate: (prop: EasyRouter.RouteQuery) => { this.activateList(prop); },
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
        activate: (prop: EasyRouter.RouteQuery) => { this.activate404(prop); },
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

    private activateList(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateList: ' + JSON.stringify(prop));
    }
    private activateTodo(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateTodo: ' + JSON.stringify(prop));
    }
    private makeTodoTitle(prop: EasyRouter.RouteQuery): string {
      console.log('............ makeTodoTitle: ' + JSON.stringify(prop));
      return 'MyTitle: ' + prop.routeParams['id'];
    }
    private activate404(prop: EasyRouter.RouteQuery): void {
      console.log('............ activate404: ' + JSON.stringify(prop));
    }
    private activateTodoDetails(prop: EasyRouter.RouteQuery): void {
      console.log('............ activateTodoDetails: ' + JSON.stringify(prop));
    }
  }
}
