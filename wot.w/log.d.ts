/// <reference path="loader.d.ts" />
declare module wot {
    class Log {
        private hasConsole;
        private debug;
        private listeners;
        constructor(sc: ServiceContext);
        /**
        *
        * @param cb This function must return TRUE if the message is successfully logged
        */
        public addListener(cb: Function): void;
        public error(msg: string, stack?: any): void;
        public info(msg: any): void;
        public warning(msg: any): void;
        public trace(msg: string): void;
        public unexpectedErr(err: any): void;
        private fireEvent(type, msg, errStack?);
    }
}
