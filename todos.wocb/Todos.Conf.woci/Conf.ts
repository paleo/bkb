/// <reference path="../d.ts/WocGeneric.d.ts" />
/// <reference path="../d.ts/jquery.d.ts" />

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
