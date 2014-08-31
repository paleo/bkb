/// <reference path='../d.ts/woc.d.ts' />

declare module WocGeneric {
  interface UrlProperties {
    relUrl: string;
    args: {string: string};
    sel: string;
    title?: string;
  }
  interface UrlController {
    fillUrlProperties(props: UrlProperties): boolean;
  }
}
