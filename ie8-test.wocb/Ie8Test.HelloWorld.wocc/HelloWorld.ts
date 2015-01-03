/// <reference path='../defs/Ie8Test.d.ts' />

module Ie8Test {
  'use strict';

  export class HelloWorld implements Woc.Component {
    constructor(private cc: Woc.ComponentContext) {
    }

    public attachTo(el: HTMLElement): void {
      el.innerHTML = '<p>Hello, World!</p>';
    }
  }
}
