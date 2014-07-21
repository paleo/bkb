/// <reference path="definitions.ts" />
'use strict';

module woc {
	export class ComponentTree {

		private static ID_PROP = '_wocCompId';
		private tree = {};
		private list = [];

		public newPlaceholder(cName: string, compTreeArg): number {
			switch (compTreeArg['from']) {
				case 'A':
					return this.addFromRoot(cName, '/');
				case 'S':
					return this.addFromRoot(cName, compTreeArg['sc'].getOwnName());
				case 'C':
					var parentId = compTreeArg['id'];
					if (this.list[parentId] === undefined)
						throw Error('Unknown parent component "' + parentId + '"');
					var item = this.list[parentId];
					return this.addItem(cName, item['children']);
				default:
					throw Error('Unknown from "' + compTreeArg['from'] + '"');
			}
		}

		public setComp(id: number, c: Component): void {
			var item = this.list[id];
			if (item === undefined)
				throw Error('Unknown component "' + id + '"');
			item['comp'] = c;
			c[ComponentTree.ID_PROP] = id;
		}

		public destruct(c: Component, removeFromDOM: boolean) {
			this.destructItem(c[ComponentTree.ID_PROP], removeFromDOM);
		}

		public destructFromId(id: number, removeFromDOM: boolean) {
			this.destructItem(id, removeFromDOM);
		}

		public getTreeCopy(): {} {
			var copy = {}, children;
			for (var rootId in this.tree) {
				if (this.tree.hasOwnProperty(rootId)) {
					children = ComponentTree.copyItems(this.tree[rootId]);
					if (children !== null)
						copy[rootId] = children;
				}
			}
			return copy;
		}

		private static copyItems(items: {}) {
			var copy = {}, empty = true, children: {};
			for (var id in items) {
				if (items.hasOwnProperty(id)) {
					empty = false;
					copy[id] = {
						'name': items[id]['name'],
						'comp': items[id]['comp']
					};
					children = ComponentTree.copyItems(items[id]['children']);
					if (children !== null)
						copy[id]['children'] = children;
				}
			}
			return empty ? null : copy;
		}

		private destructItem(id: number, removeFromDOM: boolean) {
			var item = this.list[id];
			if (item === undefined)
				throw Error('Unknown component "' + id + '" (already removed?)');
			if (item['comp'] === null)
				throw Error('Cannot destruct the component "' + item['name'] + '" during its initialisation');
			if (removeFromDOM && item['comp']['destructInDOM'] !== undefined)
				item['comp']['destructInDOM']();
			if (item['comp']['destruct'] !== undefined)
				item['comp']['destruct']();
			var children = item['children'];
			for (var childId in children) {
				if (children.hasOwnProperty(childId))
					this.destructItem(parseInt(childId, 10), removeFromDOM);
			}
			delete item['parentMap'][id];
			delete this.list[id];
		}

		private addFromRoot(cName: string, parentId: string): number {
			var children = this.tree[parentId];
			if (children === undefined)
				this.tree[parentId] = children = {};
			return this.addItem(cName, children);
		}

		private addItem(cName: string, children: {}): number {
			var id = this.list.length;
			this.list.push(children[id] = {
				'comp': null,
				'name': cName,
				'children': {},
				'parentMap': children
			});
			return id;
		}
	}
}
