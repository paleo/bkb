/// <reference path='../d.ts/woc.d.ts' />

module FirstExt.Helpers {
	'use strict';

	// ##
	// ## Listeners
	// ##

	export class Listeners {
		private listeners = {};

		public add(type: string, cb: Function): Function {
			if (this.listeners[type] === undefined)
				this.listeners[type] = [];
			var id = this.listeners[type].length;
			this.listeners[type][id] = cb;
			return () => {
				delete this.listeners[type][id];
			};
		}

		public fire(type: string, param: any = undefined): void {
			var list = this.listeners[type];
			if (!list)
				return;
			for (var i = 0, len = list.length; i < len; ++i)
				list[i](param);
		}

		public clear(): void {
			this.listeners = {};
		}
	}

	// ##
	// ## GenericLiveState
	// ##

	export class GenericLiveState implements Woc.LiveState {
		private listeners: Listeners = null;

		constructor(private live: boolean) {
		}

		// --
		// -- woc.LiveState
		// --

		public isLive(): boolean {
			return this.live;
		}

		public addLiveListener(cb: (live: boolean) => void): Function {
			if (!this.listeners)
				this.listeners = new Listeners();
			return this.listeners.add('live', cb);
		}

		// --
		// -- Public
		// --

		public setLive(b: boolean): void {
			if (this.live === b)
				return;
			this.live = b;
			if (this.listeners)
				this.listeners.fire('live', b);
		}

		public reset(): void {
			if (this.listeners) {
				this.listeners.clear();
				this.listeners = null;
			}
		}
	}
}
