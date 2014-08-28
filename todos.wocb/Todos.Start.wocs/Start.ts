/// <reference path="../d.ts/woc-firstext.d.ts" />
/// <reference path="../d.ts/jquery.d.ts" />

module Todos {
	'use strict';

	export class Start implements Woc.StartingPointService {
		constructor(private sc: Woc.ServiceContext) {
		}

		public start(element: HTMLElement) {
      $(element).append('Hello World!');
    }
	}
}
