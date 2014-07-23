/// <reference path='../d.ts/wocbundle.d.ts' />
/// <reference path='../d.ts/jquery.d.ts' />
/// <reference path="../Todos_Item.c/Item.ts" />
/// <reference path='../../ext.w/Unit_Button.c/Button.ts' />

module Todos {
	'use strict';

	export class List implements woc.Component {
		private $bloc: JQuery;
		private $ul: JQuery;
		private items: {}[] = null;
		private btn: Unit.Button;

		constructor(private cc: woc.ComponentContext, props: {}) {
			this.btn = cc.createComponent('Unit.Button', {'label': '+'});
			this.$bloc = $(cc.getTemplate('.todos-list', {
				'addBtn': this.btn.getElement()
			}));
			this.$ul = this.$bloc.find('ul');
			this.btn.click((e) => {
				e.preventDefault();
				this.createItem();
			});
			this.$bloc.find('h1').text(props['title']);
			this.items = [];
			for (var i = 0; i < props['count']; ++i)
				this.createItem();
		}

		public getElement(): HTMLElement {
			return this.$bloc[0];
		}

		public destructInDOM() {
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
			var item = <Todos.Item>this.cc.createComponent('Todos.Item', {
				'cbRemove': () => {
					this.removeItem(id);
				},
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
