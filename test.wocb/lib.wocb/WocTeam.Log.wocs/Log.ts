/// <reference path='../defs/Woc.d.ts' />

module WocTeam {
  'use strict';

  export enum LogType {
    Log, Error, Info, Warning, Trace
  }

  export class Log implements Woc.Log {

    // --
    // -- Initialisation
    // --

    private hasConsole: boolean;
    private listeners = [];

    constructor() {
      this.hasConsole = typeof console !== 'undefined';
    }

    // --
    // -- Public
    // --

    /**
     * @param cb This function must return TRUE if the message is successfully logged
     */
    public addListener(cb: (type: LogType, msg: any, stack: string[]) => boolean): void {
      this.listeners.push(cb);
    }

    // --
    // -- Woc.Log
    // --

    public log(something: any): void {
      this.fireEvent(LogType.Log, something);
    }

    public error(err: any): void {
      this.fireEvent(LogType.Error, err);
    }

    public warn(msg: any): void {
      this.fireEvent(LogType.Warning, msg);
    }

    public info(msg: any): void {
      this.fireEvent(LogType.Info, msg);
    }

    public debug(msg: any): void {
      this.fireEvent(LogType.Trace, msg);
    }

    // --
    // -- Private
    // --

    private fireEvent(type: LogType, something: any) {
      if (type === LogType.Log)
        this.fireEventLogSomething(type, something);
      else
        this.fireEventStringMsg(type, something);
    }

    private fireEventLogSomething(type: LogType, something: any) {
      var inConsole = this.hasConsole;
      for (var i = 0, len = this.listeners.length; i < len; ++i) {
        if (this.listeners[i](type, something, null) === true)
          inConsole = false;
      }
      if (inConsole)
        console.log(something);
    }

    private fireEventStringMsg(type: LogType, something: any) {
      var msgStr,
        stack = null;
      switch (typeof something) {
        case 'string':
          msgStr = something;
          break;
        case 'object':
          if (something['message'] !== undefined)
            msgStr = something['message'];
          else
            msgStr = something.toString();
          if (something['stack'] !== undefined)
            stack = something['stack'];
          break;
        default:
          msgStr = '[unknown error type] ' + (typeof something);
          try {
            msgStr += ': ' + something;
          } catch (e) {
          }
      }
      var inConsole = this.hasConsole;
      for (var i = 0, len = this.listeners.length; i < len; ++i) {
        if (this.listeners[i](type, msgStr, stack) === true)
          inConsole = false;
      }
      if (inConsole) {
        console.log('[' + LogType[type] + '] ' + msgStr);
        if (stack !== null)
          console.log(stack);
      }
    }
  }
}
