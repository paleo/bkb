/// <reference path='../../wot.d.ts' />
var wotext;
(function (wotext) {
    (function (helpers) {
        'use strict';

        // ##
        // ## Listeners
        // ##
        var Listeners = (function () {
            function Listeners() {
                this.listeners = {};
            }
            Listeners.prototype.add = function (type, cb) {
                if (this.listeners[type] === undefined)
                    this.listeners[type] = [];
                var id = this.listeners[type].length;
                this.listeners[type][id] = cb;
                var that = this;
                return function () {
                    delete that.listeners[type][id];
                };
            };

            Listeners.prototype.fire = function (type, param) {
                if (typeof param === "undefined") { param = undefined; }
                var list = this.listeners[type];
                if (!list)
                    return;
                for (var i = 0, len = list.length; i < len; ++i)
                    list[i](param);
            };

            Listeners.prototype.destroy = function () {
                this.listeners = undefined;
            };
            return Listeners;
        })();
        helpers.Listeners = Listeners;

        // ##
        // ## GenericLiveState
        // ##
        var GenericLiveState = (function () {
            function GenericLiveState(live) {
                this.live = live;
                this.listeners = null;
            }
            // --
            // -- wot.LiveState
            // --
            GenericLiveState.prototype.isLive = function () {
                return this.live;
            };

            GenericLiveState.prototype.addLiveListener = function (cb) {
                if (!this.listeners)
                    this.listeners = new Listeners();
                return this.listeners.add('live', cb);
            };

            // --
            // -- Public
            // --
            GenericLiveState.prototype.setLive = function (b) {
                if (this.live === b)
                    return;
                this.live = b;
                if (this.listeners)
                    this.listeners.fire('live', b);
            };

            GenericLiveState.prototype.reset = function () {
                if (this.listeners) {
                    this.listeners.destroy();
                    this.listeners = null;
                }
            };
            return GenericLiveState;
        })();
        helpers.GenericLiveState = GenericLiveState;
    })(wotext.helpers || (wotext.helpers = {}));
    var helpers = wotext.helpers;
})(wotext || (wotext = {}));
//# sourceMappingURL=helpers.js.map
