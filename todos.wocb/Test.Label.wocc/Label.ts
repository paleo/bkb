/// <reference path='../todos.d.ts' />

module Test {
  'use strict';

  export class Label implements Woc.Component {

    public static init(cc: Woc.HBComponentContext) {
      console.log('STATIC-INIT!');
      cc.createComponent('Test.Label');
    }

    private $lbl: JQuery;

    constructor(private cc: Woc.HBComponentContext, props: {}) {
      this.$lbl = $(cc.render('MyLabelI', {label: props['label']}));

      //cc.getService<Woc.Log>('Woc.Log').wrap(() => {
      //  throw Error('Hep!');
      //});
    }

    public attachTo(el: HTMLElement): Label {
      this.$lbl.appendTo(el);
      return this;
    }

    public show(): Label {
      this.$lbl.show();
      return this;
    }

    public hide(): Label {
      this.$lbl.hide();
      return this;
    }

    public setEnabled(b: boolean): Label {
      this.$lbl.prop('disabled', !b);
      return this;
    }

    public destructInDOM() {
      this.$lbl.remove();
      this.$lbl = null;
    }
  }
}
