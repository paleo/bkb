/// <reference path='../d.ts/wocbundle.d.ts' />
/// <reference path='../d.ts/jquery.d.ts' />

module Unit {
	'use strict';

	export class Button implements Woc.Component {

		private withAjax: boolean;
		private manualDisabled: boolean = false;
		private autoDisableMode: boolean;
		private autoDisabled: boolean = false;
		private $btn: JQuery;
		private $ajaxFlag: JQuery;

		// --
		// -- Component
		// --

		constructor(private cc: Woc.FirstComponentContext, props: {}) {
			this.withAjax = props['ajax'] ? true : false;
			this.autoDisableMode = this.withAjax || (props['autoDisable'] ? true : false);
			if (this.withAjax) {
				this.$btn = $(cc.getTemplate('.ajax-btn'));
				this.$ajaxFlag = $('<img class="ajax-flag" alt="">');
				this.$ajaxFlag.attr('src', cc.getBaseUrl() + '/ajax-loader.gif');
				this.$ajaxFlag.hide();
				this.$ajaxFlag.appendTo(this.$btn);
			} else
				this.$btn = $(cc.getTemplate('.simple-btn'));
			if (props['cssClass'])
				this.$btn.addClass(props['cssClass']);
			if (props['label'] !== undefined)
				this.setLabel(props['label']);
		}

		public getElement(): HTMLElement {
			return this.$btn[0];
		}

		public show(): Button {
			this.$btn.show();
			return this;
		}

		public hide(): Button {
			this.$btn.hide();
			return this;
		}

		public setEnabled(b: boolean): Button {
			this.manualDisabled = !b;
			if (!this.autoDisabled)
				this.$btn.prop('disabled', this.manualDisabled);
			return this;
		}

		public destructInDOM() {
			this.$btn.remove();
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

		public click(cb: Function = null): Button {
			if (cb === null) {
				this.$btn.click();
				return this;
			}
			this.$btn.click((e) => {
				try {
					if (this.autoDisableMode) {
						this.autoDisabled = true;
						this.$btn.prop('disabled', true);
					}
					if (this.withAjax)
						this.$ajaxFlag.show();
					cb(e);
				} catch (err) {
					this.cc.getService('Woc.Log').error(err);
				}
			});
			return this;
		}

		public setLabel(text: string): Button {
			if (this.withAjax)
				this.$btn.find('.lbl').text(text);
			else
				this.$btn.text(text);
			return this;
		}

		public reset(): Button {
			this.autoDisabled = false;
			if (this.withAjax)
				this.$ajaxFlag.hide();
			if (!this.manualDisabled)
				this.$btn.prop('disabled', false);
			return this;
		}
	}
}
