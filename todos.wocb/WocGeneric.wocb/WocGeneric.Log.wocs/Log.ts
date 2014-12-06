/// <reference path='../woc.d.ts' />

module WocGeneric {
  'use strict';

  export enum LogType {
    Error, Info, Warning, Trace
  }

  export class Log {

    // --
    // -- Fields, Initialisation
    // --

    private hasConsole: boolean;
    private listeners = [];

    constructor() {
      this.hasConsole = typeof console !== 'undefined';
    }

    // --
    // -- Public
    // --

    public error(err: any): void {
      this.fireEvent(LogType.Error, err);
    }

    public info(msg: any): void {
      this.fireEvent(LogType.Info, msg);
    }

    public warning(msg: any): void {
      this.fireEvent(LogType.Warning, msg);
    }

    public trace(msg: any): void {
      this.fireEvent(LogType.Trace, msg);
    }

    public wrap(cb: () => any): any {
      try {
        return cb();
      } catch (e) {
        this.error(e);
      }
    }

    /**
     * @param cb This function must return TRUE if the message is successfully logged
     */
    public addListener(cb: (type: LogType, msgStr: string, stack: string[]) => boolean): void {
      this.listeners.push(cb);
    }

    // --
    // -- Private
    // --

    private fireEvent(type: LogType, msg: string) {
console.log('log msg: ' + msg);
      var msgStr, stack = null;
      switch (typeof msg) {
        case 'string':
          msgStr = msg;
          break;
        case 'object':
          if (msg['message'] !== undefined)
            msgStr = msg['message'];
          else
            msgStr = msg.toString();
          if (msg['stack'] !== undefined)
            stack = msg['stack'];
          break;
        default:
          msgStr = '[unknown error type] ' + (typeof msg);
          try {
            msgStr += ': ' + msg;
          } catch (e) {
          }
      }
      var i, len = this.listeners.length, listener, inConsole = true;
      for (i = 0; i < len; ++i) {
        listener = this.listeners[i];
        if (listener(type, msgStr, stack) === true)
          inConsole = false;
      }
      if (this.hasConsole && inConsole) {
        console.log('[' + LogType[type] + '] ' + msgStr);
        if (stack !== null)
          console.log(stack);
      }
    }
  }
}
