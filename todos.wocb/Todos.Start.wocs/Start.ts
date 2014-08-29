/// <reference path="../d.ts/woc-firstext.d.ts" />
/// <reference path="../d.ts/jquery.d.ts" />
/// <reference path="../Test.Label.wocc/Label.ts" />

module Todos {
	'use strict';

	export class Start implements Woc.StartingPointService {
		constructor(private sc: Woc.ServiceContext) {
		}

		public start(element: HTMLElement) {
      $(element).append('<p>Hello World!</p>');
      var l: Test.Label = this.sc.createComponent('Test.Label', {'label': 'Hello!'});
      l.attachTo(element)
    }
	}
}
