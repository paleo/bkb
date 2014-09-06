/// <reference path='../woc.d.ts' />

declare var dialogPolyfill;

module WocGeneric {
  'use strict';

  enum SmallDialogType {
    Info, Warning, Error, Confirm
  }

  export class Dialogs {

    // --
    // -- Initialisation
    // --

    private smallDialogMap = {};
    private smallMsgQueue = [];
    private curSmallProp: {} = null;
    private smallDialogCount = 0;

    private registeredMap = {};
    private regOpenedStack = [];

    constructor() {
      this.initShortDialogs();
    }

    // --
    // -- Public
    // --

    public showInfo(msgHtml: string): void {
      this.smallMsgQueue.push({
        'msgHtml': msgHtml,
        'type': SmallDialogType.Info,
        'delayInMs': 1600
      });
      this.pleaseProcessShortDialogs();
    }

    public showWarning(msgHtml: string): void {
      this.smallMsgQueue.push({
        'msgHtml': msgHtml,
        'type': SmallDialogType.Warning,
        'delayInMs': 2000
      });
      this.pleaseProcessShortDialogs();
    }

    public showError(msgHtml: string): Promise<void> {
      return new Promise<void>((resolve) => {
        this.smallMsgQueue.push({
          'msgHtml': msgHtml,
          'type': SmallDialogType.Error,
          'resolve': resolve
        });
        this.pleaseProcessShortDialogs();
      });
    }

    public confirm(msgHtml: string, buttons: {
      label: string;
      returnValue: any;
      isDefault?: boolean;
    }[]): Promise<any> {
      return new Promise<any>((resolve) => {
        this.smallMsgQueue.push({
          'msgHtml': msgHtml,
          'type': SmallDialogType.Confirm,
          'buttons': buttons,
          'resolve': resolve
        });
        this.pleaseProcessShortDialogs();
      });
    }

    public register(handle: string, makeDialog: () => HTMLElement): void {
      if (this.registeredMap[handle])
        throw Error('The dialog "' + handle + '" is already registered');
      this.registeredMap[handle] = {
        'maker': makeDialog,
        'dialog': null,
        'rmDialog': null
      };
    }

    public unregister(handle: string): void {
      if (!this.registeredMap[handle])
        return;
      this.registeredMap[handle]['rmDialog']();
      delete this.registeredMap[handle];
    }

    public showModal(dialog: any): Promise<any> {
      var handle: string,
        onClose: (event) => void,
        rmDialog: Function = null;
      if (typeof dialog === 'string') {
        handle = dialog;
        if (!this.registeredMap[handle])
          throw Error('Unknown dialog "' + handle + '"');
        if (this.registeredMap[handle]['dialog'] === null) {
          dialog = this.registeredMap[handle]['maker']();
          onClose = () => {
            this.closeRegistered(dialog.returnValue, handle);
          };
          this.registeredMap[handle]['dialog'] = Dialogs.appendDialog(dialog, onClose);
          this.registeredMap[handle]['rmDialog'] = Dialogs.makeRmDialogCb(dialog, onClose);
          this.registeredMap[handle]['maker'] = null;
        } else
          dialog = this.registeredMap[handle]['dialog'];
      } else {
        onClose = () => {
          handle = null;
          this.closeRegistered(dialog.returnValue, handle);
        };
        Dialogs.appendDialog(dialog, onClose);
        rmDialog = Dialogs.makeRmDialogCb(dialog, onClose);
      }
      return new Promise<any>((resolve, reject) => {
        this.regOpenedStack.push({
          'handle': handle,
          'rmDialog': rmDialog,
          'resolve': resolve,
          'reject': reject
        });
        dialog.showModal();
      });
    }

    // --
    // -- Private
    // --

    private closeRegistered(val: any, handle: string) {
      var prop = this.regOpenedStack.pop();
      if (!prop)
        return;
      if (prop['rmDialog'])
        prop['rmDialog']();
      if (prop['handle'] !== handle)
        prop['reject'](Error('Current dialog handle "' + handle + '" should match with "' + prop['handle'] + '"'));
      else
        prop['resolve'](val);
    }

    private static appendDialog(dialog: HTMLElement, onClose: (event) => void = null): HTMLElement {
      document.body.appendChild(dialog);
      if (!dialog['show'])
        dialogPolyfill.registerDialog(dialog, true);
      if (onClose)
        dialog.addEventListener('close', onClose);
      return dialog;
    }

    private static makeRmDialogCb(dialog: HTMLElement, onClose: (event) => void = null): () => void {
      return function () {
        document.body.removeChild(dialog);
        if (onClose !== null)
          dialog.removeEventListener('close', onClose);
      };
    }

    // --
    // -- Private - Short dialogs
    // --

    private initShortDialogs() {
      var el = document.createElement('div');
      el.innerHTML = '<dialog class="SmallDialog info ob-dialog">\
  <p class="SmallDialog-msg"></p>\
</dialog>\
<dialog class="SmallDialog warn ob-dialog">\
  <p class="SmallDialog-msg"></p>\
</dialog>\
<dialog class="SmallDialog err ob-dialog">\
  <form method="dialog">\
    <p class="SmallDialog-msg"></p>\
    <div class="SmallDialog-action">\
      <button type="submit" value="ok" autofocus>OK</button>\
    </div>\
  </form>\
</dialog>\
<dialog class="SmallDialog confirm ob-dialog">\
  <form method="dialog">\
    <p class="SmallDialog-msg"></p>\
    <div class="SmallDialog-action">\
      <button type="submit" value="0" style="display: none"></button>\
      <button type="submit" value="1" style="display: none"></button>\
      <button type="submit" value="2" style="display: none"></button>\
      <button type="submit" value="3" style="display: none"></button>\
      <button type="submit" value="4" style="display: none"></button>\
    </div>\
  </form>\
</dialog>';
      this.smallDialogMap[SmallDialogType.Info] = Dialogs.appendDialog(<HTMLElement>el.firstChild, () => {
        this.smallDialogClose();
      });
      this.smallDialogMap[SmallDialogType.Warning] = Dialogs.appendDialog(<HTMLElement>el.firstChild, () => {
        this.smallDialogClose();
      });
      this.smallDialogMap[SmallDialogType.Error] = Dialogs.appendDialog(<HTMLElement>el.firstChild, () => {
        this.smallDialogClose();
      });
      var that = this;
      this.smallDialogMap[SmallDialogType.Confirm] = Dialogs.appendDialog(<HTMLElement>el.firstChild, function () {
        that.smallDialogClose(this.returnValue);
      });
    }

    private smallDialogClose(val: string = null) {
      if (this.curSmallProp === null)
        return;
      var cb = this.curSmallProp['resolve'];
      var buttons = this.curSmallProp['buttons'];
      this.curSmallProp = null;
      if (cb) {
        if (val === null)
          cb();
        else if (buttons) {
          var btnProp = buttons[val];
          if (btnProp)
            cb(btnProp['returnValue']);
        }
      }
      this.pleaseProcessShortDialogs();
    }

    private pleaseProcessShortDialogs() {
      if (this.curSmallProp !== null)
        return;
      var props = this.smallMsgQueue.shift();
      if (props === undefined)
        return;
      // - Show the dialog
      var cur = ++this.smallDialogCount;
      this.curSmallProp = props;
      var dialog: any = this.smallDialogMap[props['type']];
      if (props['type'] === SmallDialogType.Confirm)
        this.setConfirmButtons(props['buttons']);
      dialog.querySelector('.SmallDialog-msg').innerHTML = props['msgHtml'];
      dialog.showModal();
      if (props['delayInMs'] !== undefined) {
        window.setTimeout(() => {
          if (cur !== this.smallDialogCount)
            return;
          dialog.close();
          if (cur !== this.smallDialogCount)
            return;
          this.curSmallProp = null;
          this.pleaseProcessShortDialogs();
        }, props['delayInMs']);
      }
    }

    private setConfirmButtons(buttons: {}[]): HTMLElement {
      var dialog: any = this.smallDialogMap[SmallDialogType.Confirm];
      var action = <HTMLElement>dialog.querySelector('.SmallDialog-action'),
        btnProp,
        btn: any,
        hasDefault = false,
        maxBtn = 5,
        i = 0;
      for (var len = buttons.length; i < len && i < maxBtn; ++i) {
        btnProp = buttons[i];
        btn = action.children[i];
        btn.style.display = 'block';
        btn.innerHTML = btnProp['label'];
        if (btnProp['isDefault'] && !hasDefault) {
          btn.setAttribute('autofocus', 'autofocus');
          hasDefault = true;
        } else {
          btn.removeAttribute('autofocus');
        }
      }
      for (; i < maxBtn; ++i) {
        btn = action.children[i];
        btn.style.display = 'none';
        btn.removeAttribute('autofocus');
      }
      return dialog;
    }
  }
}
