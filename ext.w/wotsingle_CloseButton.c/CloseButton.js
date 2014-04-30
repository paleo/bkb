/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
var wotsingle;
(function (wotsingle) {
    'use strict';

    var CloseButton = (function () {
        // --
        // -- Component
        // --
        function CloseButton(cc, props) {
            this.cc = cc;
            this.disabled = false;
            this.$btn = $(this.cc.getTemplate('.close-btn'));
            if (props['cssClass'])
                this.$btn.addClass(props['cssClass']);
        }
        CloseButton.prototype.getElement = function () {
            return this.$btn[0];
        };

        CloseButton.prototype.show = function () {
            this.$btn.show();
            return this;
        };

        CloseButton.prototype.hide = function () {
            this.$btn.hide();
            return this;
        };

        CloseButton.prototype.setEnabled = function (b) {
            this.disabled = !b;
            this.$btn.prop('disabled', this.disabled);
            return this;
        };

        CloseButton.prototype.destroy = function () {
            this.$btn.off();
        };

        // --
        // -- Public
        // --
        CloseButton.prototype.setSelected = function (b) {
            if (b)
                this.$btn.addClass('btn-cur');
            else
                this.$btn.removeClass('btn-cur');
        };

        CloseButton.prototype.click = function (cb) {
            if (typeof cb === "undefined") { cb = null; }
            if (cb === null) {
                this.$btn.click();
                return this;
            }
            var that = this;
            this.$btn.click(function (e) {
                try  {
                    cb(e);
                } catch (err) {
                    that.cc.getService('wot.Log').unexpectedErr(err);
                }
            });
            return this;
        };
        return CloseButton;
    })();
    wotsingle.CloseButton = CloseButton;
})(wotsingle || (wotsingle = {}));
//# sourceMappingURL=CloseButton.js.map
