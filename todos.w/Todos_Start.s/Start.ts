/// <reference path="../d.ts/wocbundle.d.ts" />
/// <reference path="../d.ts/jquery.d.ts" />
/// <reference path='../Todos_List.c/List.ts' />
/// <reference path='../../ext.w/firstext.w/FirstExt_Helpers.l/Helpers.ts' />

module Todos {
	'use strict';

	export class Start implements Woc.StartingPointService {
		constructor(private ac: Woc.ApplicationContext, private sc: Woc.ServiceContext) {
		}

		public start(element: HTMLElement) {
			var st = new FirstExt.Helpers.GenericLiveState(true);
			var list = <Todos.List>this.sc.createComponent('Todos.List', {'title': 'My First List', 'count': 3}, st);
			$(element).append(list.getElement());

			var btn = this.sc.createComponent('Unit.Button', {'label': 'TREE'}, st).click(() => {
				console.log(Start.stringifyTree(this.ac.getDebugTree()));
			});
			$(element).append(btn.getElement());
			btn = this.sc.createComponent('Unit.Button', {'label': 'END'}, st).click(() => {
				this.sc.removeComponent(list, true);
			});
			$(element).append(btn.getElement());
		}

		private static stringifyTree(tree: {}) {
			var s = '';
			for (var rootId in tree) {
				if (tree.hasOwnProperty(rootId)) {
					s += rootId + '\n';
					s += Start.stringifyNode(tree[rootId], '  ');
				}
			}
			return s;
		}

		private static stringifyNode(children: {}, prefix = '') {
			var s = '';
			for (var id in children) {
				if (children.hasOwnProperty(id)) {
					s += prefix + id + ' [' + children[id]['name'] + ']\n';
					if (children[id]['children'])
						s += Start.stringifyNode(children[id]['children'], prefix + '  ');
				}
			}
			return s;
		}
	}
}
