/// <reference path='definitions.ts' />
/// <reference path='contexts.ts' />
'use strict';

module Woc {
  export class CoreLog implements Log {

    // --
    // -- Initialisation
    // --

    private hasConsole: boolean;
    private logNames: string[] = [];
    private logs: Woc.Log[] = [];

    constructor(private services: Singletons) {
      this.hasConsole = typeof console !== 'undefined';
    }

    public add(logName: string) {
      this.logNames.push(logName);
    }

    // --
    // -- Woc.Log
    // --

    public log(something: any): void {
      this.propagate('log', something);
    }

    public error(err: any): void {
      this.propagate('error', err);
    }

    public warn(msg: any): void {
      this.propagate('warn', msg);
    }

    public info(msg: any): void {
      this.propagate('info', msg);
    }

    public debug(msg: any): void {
      this.propagate('debug', msg);
    }

    // --
    // -- Private
    // --

    private propagate(methodName: string, something: any) {
      if (this.logNames.length > 0) {
        for (var i = 0, len = this.logNames.length; i < len; ++i)
          this.logs.push(this.services.get(this.logNames[i]));
        this.logNames = [];
      }
      if (this.logs.length === 0) {
        if (this.hasConsole)
          console.log(something);
      } else {
        for (var i = 0, len = this.logs.length; i < len; ++i)
          this.logs[i][methodName](something);
      }
    }
  }
}
