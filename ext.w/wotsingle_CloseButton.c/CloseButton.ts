/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />

module wotsingle {
	'use strict';

	export class CloseButton implements wot.Component {

		private disabled: boolean = false;
		private $btn: JQuery;

		// --
		// -- Component
		// --

		constructor(private cc: wot.ComponentContext, props: {}) {
			this.$btn = $(this.cc.getTemplate('.close-btn'));
			if (props['cssClass'])
				this.$btn.addClass(props['cssClass']);
		}

		public getElement(): HTMLElement {
			return this.$btn[0];
		}

		public show(): CloseButton {
			this.$btn.show();
			return this;
		}

		public hide(): CloseButton {
			this.$btn.hide();
			return this;
		}

		public setEnabled(b: boolean): CloseButton {
			this.disabled = !b;
			this.$btn.prop('disabled', this.disabled);
			return this;
		}

		public destroy() {
			this.$btn.off();
		}

		// --
		// -- Public
		// --

		public setSelected(b: boolean) {
			if (b)
				this.$btn.addClass('btn-cur');
			else
				this.$btn.removeClass('btn-cur');
		}

		public click(cb: Function = null): CloseButton {
			if (cb === null) {
				this.$btn.click();
				return this;
			}
			var that = this;
			this.$btn.click(function (e) {
				try {
					cb(e);
				} catch (err) {
					that.cc.getService('wot.Log').unexpectedErr(err);
				}
			});
			return this;
		}
	}
}
