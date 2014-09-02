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

      this.test();
    }


    public test() {
      var router: WocGeneric.ARouter = this.sc.getService<WocGeneric.ARouter>('WocGeneric.ARouter');

      var child = router.createChild();
      child.map([
        {
          route: 'details',
          activate: (prop: WocGeneric.RouteProperties) => { this.activateTodoDetails(prop); },
          title: 'Détails'
        }
      ]);

      router.map([
        {
          route: '',
          redirectTo: 'todos'
        },
        {
          route: 'todos',
          activate: (prop: WocGeneric.RouteProperties) => { this.activateList(prop); },
          title: 'Liste des TODOS'
        },
        {
          route: 'todos/:id',
          activate: (prop: WocGeneric.RouteProperties) => { this.activateTodo(prop); },
          title: (prop: WocGeneric.RouteProperties) => { return this.makeTodoTitle(prop); }
        },
        {
          route: 'todos/:id/*',
          child: child
        }
      ]).mapUnknownRoutes('404', {
        activate: (prop: WocGeneric.RouteProperties) => { this.activate404(prop); },
        title: '404 Not Found'
      }).start();

    }
    private activateList(prop: WocGeneric.RouteProperties): void {
      console.log('activateList: ' + JSON.stringify(prop));
    }
    private activateTodo(prop: WocGeneric.RouteProperties): void {
      console.log('activateTodo: ' + JSON.stringify(prop));
    }
    private makeTodoTitle(prop: WocGeneric.RouteProperties): string {
      console.log('activateTodo: ' + JSON.stringify(prop));
      return 'MyTitle: ' + prop.routeParams['id'];
    }
    private activate404(prop: WocGeneric.RouteProperties): void {
      console.log('activate404: ' + JSON.stringify(prop));
    }
    private activateTodoDetails(prop: WocGeneric.RouteProperties): void {
      console.log('activateTodoDetails: ' + JSON.stringify(prop));
    }
  }
}
