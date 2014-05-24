/// <reference path="jquery.d.ts" />
/// <reference path="../wot.d.ts" />
/// <reference path='../ext.w/wotext_helpers.l/helpers.ts' />
/// <reference path='todos_List.c/List.ts' />

module todos {
	'use strict';

	export class Main implements wot.BundleMain {
		constructor(private ac: wot.ApplicationContext) {
		}

		public start(element) {
			var st = new wotext.helpers.GenericLiveState(true);
			var list = <todos.List>this.ac.createComponent('todos.List', {'title': 'My First List', 'count': 3}, st);
			$(element).append(list.getElement());

			var that = this;
			var btn = this.ac.createComponent('wotsingle.Button', {'label': 'TREE'}, st).click(function () {
				console.log(Main.stringifyTree(that.ac.getDebugTree()));
			});
			$(element).append(btn.getElement());
			btn = this.ac.createComponent('wotsingle.Button', {'label': 'END'}, st).click(function () {
				that.ac.removeComponent(list, true);
			});
			$(element).append(btn.getElement());
			console.log(Main.stringifyTree(this.ac.getDebugTree()));
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
