/// <reference path='../../woc.d.ts' />
/// <reference path='../jquery.d.ts' />
/// <reference path='../../ext.w/wocsingle_Button.c/Button.ts' />
/// <reference path="../todos_Item.c/Item.ts" />

module todos {
	'use strict';

	export class List implements woc.Component {
		private $bloc: JQuery;
		private $ul: JQuery;
		private items: {}[] = null;
		private btn: wocsingle.Button;

		constructor(private cc: woc.ComponentContext, props: {}) {
			this.btn = cc.createComponent('wocsingle.Button', {'label': '+'});
			this.$bloc = $(cc.getTemplate('.todos-list', {
				'addBtn': this.btn.getElement()
			}));
			this.$ul = this.$bloc.find('ul');
			var that = this;
			this.btn.click(function (e) {
				e.preventDefault();
				that.createItem();
			});
			this.$bloc.find('h1').text(props['title']);
			this.items = [];
			for (var i = 0; i < props['count']; ++i)
				this.createItem();
		}

		public getElement(): HTMLElement {
			return this.$bloc[0];
		}

		public destruct(removeFromDOM: boolean) {
			if (removeFromDOM)
				this.$bloc.remove();
		}

		public removeItem(itemId: number) {
			var prop = this.items[itemId];
			prop['$li'].remove();
			this.cc.removeComponent(prop['item']);
			delete this.items[itemId];
		}

		private createItem() {
			var id = this.items.length;
			var item = <todos.Item>this.cc.createComponent('todos.Item', {
				'list': this,
				'itemId': id,
				'label': 'TODO ' + (id + 1)
			});
			var $li = $('<li></li>').append(item.getElement()).appendTo(this.$ul);
			this.items[id] = {
				'item': item,
				'$li': $li
			};
		}
	}
}
