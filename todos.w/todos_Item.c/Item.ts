/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
/// <reference path='../../ext.w/wotsingle_Button.c/Button.ts' />
/// <reference path='../todos_List.c/List.ts' />

module todos {
	'use strict';

	export class Item implements wot.Component {
		private $bloc: JQuery;
		private btn: wotsingle.Button;
		private curList: todos.List;
		private curItemId: number;

		constructor(private cc: wot.ComponentContext, props: {}) {
			this.btn = cc.createComponent('wotsingle.Button', {'label': '×'});
			this.$bloc = $(cc.getTemplate('.todos-item', {'button': this.btn.getElement()}));
			var that = this;
			this.btn.click(function (e) {
				e.preventDefault();
				that.removeFromList();
			});
			this.curItemId = props['itemId'];
			this.curList = props['list'];
			this.$bloc.find('.lbl').text(props['label']);
		}

		public destroy() {
			this.btn.destroy();
		}

		public getElement(): HTMLElement {
			return this.$bloc[0];
		}

		private removeFromList() {
			if (this.curList)
				this.curList.removeItem(this.curItemId);
		}
	}
}
