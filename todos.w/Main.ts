/// <reference path="d.ts/wocbundle.d.ts" />
/// <reference path="d.ts/jquery.d.ts" />
/// <reference path='todos_List.c/List.ts' />
/// <reference path='../ext.w/FirstExt.w/FirstExt_Helpers.l/Helpers.ts' />

module todos {
	'use strict';

	export class Main implements woc.BundleMain {
		constructor(private ac: woc.ApplicationContext) {
		}

		public start(element) {
			var st = new FirstExt.Helpers.GenericLiveState(true);
			var list = <todos.List>this.ac.createComponent('todos.List', {'title': 'My First List', 'count': 3}, st);
			$(element).append(list.getElement());

			var btn = this.ac.createComponent('Unit.Button', {'label': 'TREE'}, st).click(() => {
				console.log(Main.stringifyTree(this.ac.getDebugTree()));
			});
			$(element).append(btn.getElement());
			btn = this.ac.createComponent('Unit.Button', {'label': 'END'}, st).click(() => {
				this.ac.removeComponent(list, true);
			});
			$(element).append(btn.getElement());
		}

		private static stringifyTree(tree: {}) {
			var s = '';
			for (var rootId in tree) {
				if (tree.hasOwnProperty(rootId)) {
					s += rootId + '\n';
					s += Main.stringifyNode(tree[rootId], '  ');
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
						s += Main.stringifyNode(children[id]['children'], prefix + '  ');
				}
			}
			return s;
		}
	}
}
