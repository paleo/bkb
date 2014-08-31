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

    }
  }
}
