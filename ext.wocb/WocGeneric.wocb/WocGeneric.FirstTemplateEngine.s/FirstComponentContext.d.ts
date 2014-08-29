/// <reference path='../d.ts/woc.d.ts' />

declare module Woc {
  interface FirstComponentContext extends ComponentContext {
    getTemplate(sel: string, elMap?: {[index: string]: HTMLElement}): HTMLElement;
  }
}
