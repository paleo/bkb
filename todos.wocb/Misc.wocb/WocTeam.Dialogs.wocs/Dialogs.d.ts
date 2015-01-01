/// <reference path='../woc.d.ts' />

declare module WocTeam {
  interface Dialogs {
    showInfo(msgHtml: string): void;
    showWarning(msgHtml: string): void;
    showError(msgHtml: string): Promise<void>;
    confirm(msgHtml: string, buttons: {
      label: string;
      returnValue: any;
      isDefault?: boolean;
    }[]): Promise<any>;
    register(handle: string, makeDialog: () => HTMLElement): void;
    unregister(handle: string): void;
    showModal(handle: string): Promise<any>;
    showModal(dialog: HTMLElement): Promise<any>;
  }
}
