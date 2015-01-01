/// <reference path='../woc.d.ts' />

declare module WocTeam {
  enum LogType {
    Error, Info, Warning, Trace
  }
  interface Log {
    log(something: any): void;
    error(err: any): void;
    warn(msg: any): void;
    info(msg: any): void;
    debug(msg: any): void;
    wrap(cb: () => any): any;
    /**
     * @param cb This function must return TRUE if the message is successfully logged
     */
    addListener(cb: (type: LogType, msgStr: string, stack: string[]) => boolean): void;
  }
}
