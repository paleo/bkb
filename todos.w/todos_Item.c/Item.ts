/// <reference path='../d.ts/wocbundle.d.ts' />
/// <reference path='../d.ts/jquery.d.ts' />
/// <reference path='../todos_List.c/List.ts' />
/// <reference path='../../ext.w/wocsingle_Button.c/Button.ts' />

module todos {
	'use strict';

	export class Item implements woc.Component {
		private $bloc: JQuery;
		private btn: wocsingle.Button;
		private curList: todos.List;
		private curItemId: number;

		constructor(private cc: woc.ComponentContext, props: {}) {
			this.btn = cc.createComponent('wocsingle.Button', {'label': '×'});
			this.$bloc = $(cc.getTemplate('.todos-item', {'button': this.btn.getElement()}));
			this.btn.click((e) => {
				e.preventDefault();
				this.removeFromList();
			});
			this.curItemId = props['itemId'];
			this.curList = props['list'];
			this.$bloc.find('.lbl').text(props['label']);
		}

		public getElement(): HTMLElement {
			return this.$bloc[0];
		}

		public destruct(removeFromDOM: boolean) {
			if (removeFromDOM)
				this.$bloc.remove();
		}

		private removeFromList() {
			this.curList.removeItem(this.curItemId);
		}
	}
}
