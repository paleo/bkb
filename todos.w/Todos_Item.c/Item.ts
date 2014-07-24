/// <reference path='../d.ts/wocbundle.d.ts' />
/// <reference path='../d.ts/jquery.d.ts' />
/// <reference path='../../ext.w/Unit_Button.c/Button.ts' />

module Todos {
	'use strict';

	export class Item implements Woc.Component {
		private $bloc: JQuery;
		private btn: Unit.Button;
		private cbRemove: () => void;

		constructor(private cc: Woc.FirstComponentContext, props: {}) {
			this.btn = cc.createComponent('Unit.Button', {'label': '×'});
			this.$bloc = $(cc.getTemplate('.todos-item', {'button': this.btn.getElement()}));
			this.btn.click((e) => {
				e.preventDefault();
				this.removeFromList();
			});
			this.cbRemove = props['cbRemove'];
			this.$bloc.find('.lbl').text(props['label']);
		}

		public getElement(): HTMLElement {
			return this.$bloc[0];
		}

		public destructInDOM() {
			this.$bloc.remove();
		}

		private removeFromList() {
			this.cbRemove();
		}
	}
}
