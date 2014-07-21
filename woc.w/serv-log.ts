/// <reference path='definitions.ts' />
'use strict';

module woc {
	export class CoreLog implements Log {

		// --
		// -- Fields, Initialisation
		// --

		private hasConsole: boolean;
		private listeners = [];

		constructor() {
			this.hasConsole = typeof console !== 'undefined';
		}

		/**
		 *
		 * @param cb This function must return TRUE if the message is successfully logged
		 */
		public addListener(cb: Function) {
			this.listeners.push(cb);
		}

		// --
		// -- Public
		// --

		public error(msg: string, stack = null) {
			this.fireEvent('error', msg, stack);
		}

		public info(msg) {
			this.fireEvent('info', msg);
		}

		public warning(msg) {
			this.fireEvent('warning', msg);
		}

		public trace(msg: string) {
			this.fireEvent('trace', msg);
		}

		public unexpectedErr(err) {
			var msg, stack = null;
			if (typeof err === 'object') {
				if (err.message !== undefined)
					msg = err.message;
				else
					msg = err.toString();
				if (err['stack'] !== undefined)
					stack = err['stack'];
			} else if (typeof err === 'string')
				msg = err;
			else
				msg = '[unknown error type] ' + err;
			this.error('Unexpected error: ' + msg, stack);
		}

		// --
		// -- Private
		// --

		private fireEvent(type: string, msg: string, errStack = null) {
			var i, len = this.listeners.length, listener, inConsole = true;
			for (i = 0; i < len; ++i) {
				listener = this.listeners[i];
				if (listener(type, msg, errStack) === true)
					inConsole = false;
			}
			if (this.hasConsole && inConsole) {
				console.log('[' + type + '] ' + msg);
				if (errStack !== null)
					console.log(errStack);
			}
		}
	}
}
