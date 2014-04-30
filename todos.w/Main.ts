/// <reference path="jquery.d.ts" />
/// <reference path="../wot.d.ts" />
/// <reference path='../ext.w/wotext_helpers.l/helpers.ts' />
/// <reference path='todos_List.c/List.ts' />

module todos {
	'use strict';

	export class Main implements wot.BundleMain {
		constructor(private ac: wot.ApplicationContext) {
			var log = <wot.Log>this.ac.getService('wot.Log');
			log.addListener(function (type, msg, errStack) {
				console.log('[' + type + '] ' + msg);
				if (errStack)
					console.log(errStack);
			});
		}

		public start(element) {
			var st = new wotext.helpers.GenericLiveState(true);
			var list = <todos.List>this.ac.createComponent('todos.List', {'title': 'My First List', 'count': 3}, st);
			$(element).append(list.getElement());
		}
	}
}
