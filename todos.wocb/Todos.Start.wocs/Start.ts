/// <reference path='../Todos.d.ts' />
/// <reference path="../Test.Label.wocc/Label.ts" />

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
          title: 'List of tasks'
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







    private testDialog(element: HTMLElement) {
      //$(element).append('<p>Hello World!</p>');
      //var l: Test.Label = this.sc.createComponent<Test.Label>('Test.Label', {'label': 'Hello!'});
      //l.attachTo(element);

      //var dialogs: WocGeneric.Dialogs = this.sc.getService<WocGeneric.Dialogs>('WocGeneric.Dialogs');
      //dialogs.showInfo('Info!');
      //dialogs.showInfo('Info2!');
      //dialogs.showWarning('Warn3!');
      //dialogs.showError('Err!').then(() => {
      //  console.log('err done...');
      //});
      //dialogs.showError('Err2!').then(() => {
      //  console.log('err done...');
      //});
      //dialogs.confirm('confirm?', [{
      //  label: 'Yep',
      //  returnValue: 'y',
      //  isDefault: true
      //}, {
      //  label: 'Nope',
      //  returnValue: 'n'
      //}]).then((val) => {
      //  console.log('...confirm: ' + val);
      //});
    }

    //public test() {
    //  var routerProvider: WocGeneric.WocEasyRouter = this.sc.getService<WocGeneric.WocEasyRouter>('WocGeneric.WocEasyRouter');
    //
    //  var child = routerProvider.createRouter().map([
    //    {
    //      route: 'details',
    //      activate: (prop: EasyRouter.Query) => { this.activateTodoDetails(prop); },
    //      title: 'Détails'
    //    }
    //  ]);
    //
    //  var root = routerProvider.createRouter().map([
    //    {
    //      route: '',
    //      redirectTo: 'todos'
    //    },
    //    {
    //      route: 'todos',
    //      activate: (prop: EasyRouter.Query) => { this.activateTestList(prop); },
    //      title: 'Liste des TODOS'
    //    },
    //    {
    //      route: 'todos/:id',
    //      activate: (prop: EasyRouter.Query) => { this.activateTodo(prop); },
    //      title: (prop: EasyRouter.Query) => { return this.makeTodoTitle(prop); }
    //    },
    //    {
    //      route: 'todos/:id/*',
    //      child: child
    //    }
    //  ]).mapUnknownRoutes({
    //    useQueryString: '404',
    //    activate: (prop: EasyRouter.Query) => { this.activateTest404(prop); },
    //    title: '404 Not Found'
    //  });
    //  var p = routerProvider.start(root, {
    //    hashBangMode: true,
    //    firstQueryString: 'todos/456'
    //  });
    //  //p = p.then(() => {
    //  //  console.log('STEP 1...');
    //  //  root.navigate('todos');
    //  //});
    //  p = p.then(() => {
    //    window.setTimeout(() => {
    //      console.log('STEP 2...');
    //      root.navigate('todos/4442/details');
    //    }, 100);
    //  });
    //  // then(() => {
    //  //  console.log('STEP 2...');
    //  //  root.navigate('todos/123');
    //  //});
    //}
    //
    //private activateTestList(prop: EasyRouter.Query): void {
    //  console.log('............ activateList: ' + JSON.stringify(prop));
    //}
    //private activateTodo(prop: EasyRouter.Query): void {
    //  console.log('............ activateTodo: ' + JSON.stringify(prop));
    //}
    //private makeTodoTitle(prop: EasyRouter.Query): string {
    //  console.log('............ makeTodoTitle: ' + JSON.stringify(prop));
    //  return 'MyTitle: ' + prop.routeParams['id'];
    //}
    //private activateTest404(prop: EasyRouter.Query): void {
    //  console.log('............ activate404: ' + JSON.stringify(prop));
    //}
    //private activateTodoDetails(prop: EasyRouter.Query): void {
    //  console.log('............ activateTodoDetails: ' + JSON.stringify(prop));
    //}
  }
}
