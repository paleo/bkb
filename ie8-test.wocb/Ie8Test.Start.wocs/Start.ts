/// <reference path='../defs/Ie8Test.d.ts' />

module Ie8Test {
  'use strict';

  export class Start implements Woc.StartingPoint {
    constructor(private sc: Woc.ServiceContext) {
    }

    public start(el: HTMLElement) {
      el.className += 'AppWrapper';
      var comp: Ie8Test.HelloWorld = this.sc.createComponent('Ie8Test.HelloWorld');
      comp.attachTo(el);
    }
  }
}
