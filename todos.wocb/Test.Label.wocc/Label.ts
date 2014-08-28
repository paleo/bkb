/// <reference path='../d.ts/woc-firstext.d.ts' />
/// <reference path='../d.ts/jquery.d.ts' />

module Test {
	'use strict';

	export class Label implements Woc.Component {

		private $lbl: JQuery;

		constructor(private cc: Woc.HBComponentContext, props: {}) {
			this.$lbl = $(cc.render('MyLabelI', {label: props['label']}));
		}

    public attachTo(el: HTMLElement): Label {
      this.$lbl.appendTo(el);
      return this;
    }

		public show(): Label {
			this.$lbl.show();
			return this;
		}

		public hide(): Label {
			this.$lbl.hide();
			return this;
		}

		public setEnabled(b: boolean): Label {
			this.$lbl.prop('disabled', !b);
			return this;
		}

		public destructInDOM() {
			this.$lbl.remove();
      this.$lbl = null;
		}
	}
}
