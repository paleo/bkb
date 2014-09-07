/// <reference path='../woc.d.ts' />

declare module WocGeneric {
  enum LogType {
    Error, Info, Warning, Trace
  }
  interface Log {
    error(err: any): void;
    info(msg: any): void;
    warning(msg: any): void;
    trace(msg: any): void;
    wrap(cb: () => any): any;
    /**
     * @param cb This function must return TRUE if the message is successfully logged
     */
    addListener(cb: (type: LogType, msgStr: string, stack: string[]) => boolean): void;
  }
}
