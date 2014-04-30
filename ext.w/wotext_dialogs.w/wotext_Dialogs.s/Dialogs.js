/// <reference path='../../../wot.d.ts' />
/// <reference path='../../wotext_helpers.l/helpers.ts' />
/// <reference path='../wotext_DialogsComp.c/DialogsComp.ts' />
var wotext;
(function (wotext) {
    'use strict';

    var Dialogs = (function () {
        // --
        // -- Initialisation
        // --
        function Dialogs(sc) {
            this.comp = sc.getApplicationContext().createComponent('wotext.DialogsComp', null, new wotext.helpers.GenericLiveState(true));
            $('body').append(this.comp.getElement());
            var router = sc.getService('wot.Router');
            var that = this;
            router.addChangeListener(function () {
                that.clearDialogs();
            });
        }
        // --
        // -- Public - Dialogs
        // --
        /**
        * @param dialog wot.Dialog
        * @param forcedOpen boolean
        * @param hideBelow boolean
        * @returns {number} The dialog ID
        */
        Dialogs.prototype.addDialog = function (dialog, forcedOpen, hideBelow) {
            if (typeof forcedOpen === "undefined") { forcedOpen = false; }
            if (typeof hideBelow === "undefined") { hideBelow = false; }
            return this.comp.addDialog(dialog, forcedOpen, hideBelow);
        };

        Dialogs.prototype.openDialog = function (dialogId) {
            this.comp.openDialog(dialogId);
        };

        Dialogs.prototype.closeDialog = function (dialogId) {
            return this.comp.closeDialog(dialogId);
        };

        Dialogs.prototype.removeDialog = function (dialogId) {
            this.comp.removeDialog(dialogId);
        };

        /**
        *
        * @param dialogElem
        * @param setClosedCallback
        * @param forcedOpen boolean
        * @param hideBelow boolean
        * @returns Function A callback for closing the dialog (the callback returns TRUE when dialog is closed, FALSE when the dialog remains)
        */
        Dialogs.prototype.openDisposableDialog = function (dialogElem, setClosedCallback, forcedOpen, hideBelow) {
            if (typeof setClosedCallback === "undefined") { setClosedCallback = null; }
            if (typeof forcedOpen === "undefined") { forcedOpen = false; }
            if (typeof hideBelow === "undefined") { hideBelow = false; }
            return this.comp.openDisposableDialog(dialogElem, setClosedCallback, forcedOpen, hideBelow);
        };

        Dialogs.prototype.clearDialogs = function () {
            return this.comp.clearDialogs();
        };

        Dialogs.prototype.showInfo = function (msgHtml) {
            this.comp.showInfo(msgHtml);
        };

        Dialogs.prototype.showWarning = function (msgHtml) {
            this.comp.showWarning(msgHtml);
        };

        Dialogs.prototype.reportError = function (e) {
            this.comp.reportError(e);
        };

        /**
        * @param msgHtml
        * @param buttonList [{'label': string, 'callback': Function}]
        */
        Dialogs.prototype.showConfirm = function (msgHtml, buttonList) {
            this.comp.showConfirm(msgHtml, buttonList);
        };
        return Dialogs;
    })();
    wotext.Dialogs = Dialogs;
})(wotext || (wotext = {}));
//# sourceMappingURL=Dialogs.js.map
