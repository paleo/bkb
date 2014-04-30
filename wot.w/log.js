/// <reference path='loader.ts' />
var wot;
(function (wot) {
    'use strict';

    var Log = (function () {
        function Log(sc) {
            this.listeners = [];
            this.hasConsole = typeof console !== 'undefined';
            this.debug = sc.getApplicationContext().isDebug();
        }
        /**
        *
        * @param cb This function must return TRUE if the message is successfully logged
        */
        Log.prototype.addListener = function (cb) {
            this.listeners.push(cb);
        };

        // --
        // -- Public
        // --
        Log.prototype.error = function (msg, stack) {
            if (typeof stack === "undefined") { stack = null; }
            this.fireEvent('error', msg, stack);
        };

        Log.prototype.info = function (msg) {
            this.fireEvent('info', msg);
        };

        Log.prototype.warning = function (msg) {
            this.fireEvent('warning', msg);
        };

        Log.prototype.trace = function (msg) {
            if (this.debug)
                this.fireEvent('trace', msg);
        };

        Log.prototype.unexpectedErr = function (err) {
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
        };

        // --
        // -- Private
        // --
        Log.prototype.fireEvent = function (type, msg, errStack) {
            if (typeof errStack === "undefined") { errStack = null; }
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
        };
        return Log;
    })();
    wot.Log = Log;
})(wot || (wot = {}));
//# sourceMappingURL=log.js.map
