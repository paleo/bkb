/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
var wotsingle;
(function (wotsingle) {
    'use strict';

    var Button = (function () {
        // --
        // -- Component
        // --
        function Button(cc, props) {
            this.cc = cc;
            this.manualDisabled = false;
            this.autoDisabled = false;
            this.withAjax = props['ajax'] ? true : false;
            this.autoDisableMode = this.withAjax || (props['autoDisable'] ? true : false);
            if (this.withAjax) {
                this.$btn = $(cc.getTemplate('.ajax-btn'));
                this.$ajaxFlag = $('<img class="ajax-flag" alt="">');
                this.$ajaxFlag.attr('src', cc.getComponentBaseUrl() + '/ajax-loader.gif');
                this.$ajaxFlag.hide();
                this.$ajaxFlag.appendTo(this.$btn);
            } else
                this.$btn = $(cc.getTemplate('.simple-btn'));
            if (props['cssClass'])
                this.$btn.addClass(props['cssClass']);
            if (props['label'] !== undefined)
                this.setLabel(props['label']);
        }
        Button.prototype.getElement = function () {
            return this.$btn[0];
        };

        Button.prototype.show = function () {
            this.$btn.show();
            return this;
        };

        Button.prototype.hide = function () {
            this.$btn.hide();
            return this;
        };

        Button.prototype.setEnabled = function (b) {
            this.manualDisabled = !b;
            if (!this.autoDisabled)
                this.$btn.prop('disabled', this.manualDisabled);
            return this;
        };

        Button.prototype.destroy = function () {
            this.$btn.off();
        };

        // --
        // -- Public
        // --
        Button.prototype.setSelected = function (b) {
            if (b)
                this.$btn.addClass('btn-cur');
            else
                this.$btn.removeClass('btn-cur');
        };

        Button.prototype.click = function (cb) {
            if (typeof cb === "undefined") { cb = null; }
            if (cb === null) {
                this.$btn.click();
                return this;
            }
            var that = this;
            this.$btn.click(function (e) {
                try  {
                    if (that.autoDisableMode) {
                        that.autoDisabled = true;
                        that.$btn.prop('disabled', true);
                    }
                    if (that.withAjax)
                        that.$ajaxFlag.show();
                    cb(e);
                } catch (err) {
                    that.cc.getService('wot.Log').unexpectedErr(err);
                }
            });
            return this;
        };

        Button.prototype.setLabel = function (text) {
            if (this.withAjax)
                this.$btn.find('.lbl').text(text);
            else
                this.$btn.text(text);
            return this;
        };

        Button.prototype.reset = function () {
            this.autoDisabled = false;
            if (this.withAjax)
                this.$ajaxFlag.hide();
            if (!this.manualDisabled)
                this.$btn.prop('disabled', false);
            return this;
        };
        return Button;
    })();
    wotsingle.Button = Button;
})(wotsingle || (wotsingle = {}));
//# sourceMappingURL=Button.js.map
