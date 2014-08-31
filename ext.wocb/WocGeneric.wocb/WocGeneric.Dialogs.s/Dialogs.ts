/// <reference path='../d.ts/woc.d.ts' />
/// <reference path='../WocGeneric.DialogsComp.c/DialogsComp.ts' />

module WocGeneric {
  'use strict';

  export class Dialogs {

    // --
    // -- Fields
    // --

    // --
    // -- Initialisation
    // --


    constructor(sc: Woc.ServiceContext) {
      var dialog = document.createElement('dialog');
      dialog.createAttribute('')

      document.body.appendChild()
      $('body').append(this.comp.getElement());
      var router = <WocGeneric.FirstRouter>sc.getService('WocGeneric.FirstRouter');
      router.addChangeListener(() => {
        this.clearDialogs();
      });
    }

    // --
    // -- Public
    // --

    public showInfo(msgHtml: string): void {

    }

    public showWarning(msgHtml: string): void {

    }

    public confirm(msgHtml: string, buttons: {
      label: string;
      arg: any;
      isDefault?: boolean;
    }[], cb: (buttonArg: any) => void): void {

    }

    public register(handle: string, makeDialog: () => HTMLElement): void {

    }

    public showModal(handle: string, onClose?: (event) => void): void {

    }

    public showModal(dialog: HTMLElement, onClose?: (event) => void): void {

    }



    /**
     * @param dialog Woc.Dialog
     * @param forcedOpen boolean
     * @param hideBelow boolean
     * @returns {number} The dialog ID
     */
    public addDialog(dialog: Woc.Dialog, forcedOpen = false, hideBelow = false): number {
      return this.comp.addDialog(dialog, forcedOpen, hideBelow);
    }

    public openDialog(dialogId: number) {
      this.comp.openDialog(dialogId);
    }

    public closeDialog(dialogId: number): boolean {
      return this.comp.closeDialog(dialogId);
    }

    public removeDialog(dialogId: number) {
      this.comp.removeDialog(dialogId);
    }

    /**
     *
     * @param dialogElem
     * @param setClosedCallback
     * @param forcedOpen boolean
     * @param hideBelow boolean
     * @returns Function A callback for closing the dialog (the callback returns TRUE when dialog is closed, FALSE when the dialog remains)
     */
    public openDisposableDialog(dialogElem, setClosedCallback: Function = null, forcedOpen = false, hideBelow = false): Function {
      return this.comp.openDisposableDialog(dialogElem, setClosedCallback, forcedOpen, hideBelow);
    }

    public clearDialogs(): boolean {
      return this.comp.clearDialogs();
    }

    public showInfo(msgHtml: string) {
      this.comp.showInfo(msgHtml);
    }

    public showWarning(msgHtml: string) {
      this.comp.showWarning(msgHtml);
    }

    public reportError(e) {
      this.comp.reportError(e);
    }

    /**
     * @param msgHtml
     * @param buttonList [{'label': string, 'callback': Function}]
     */
    public showConfirm(msgHtml: string, buttonList: any[]) {
      this.comp.showConfirm(msgHtml, buttonList);
    }
  }
}
