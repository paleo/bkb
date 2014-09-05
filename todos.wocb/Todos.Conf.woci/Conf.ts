/// <reference path='../todos.d.ts' />

module Todos {
  'use strict';

  export class Conf implements Woc.Initializer {
    constructor(private ic: Woc.InitializerContext) {
    }

    public init() {
      console.log('Init: ' + JSON.stringify(this.ic.appConfig));
    }
  }
}
