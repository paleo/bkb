/// <reference path='../defs/Woc.d.ts' />

declare module Tarh {
  interface FirstComponentContext extends Woc.ComponentContext {
    getTemplate(sel: string, elMap?: {[index: string]: HTMLElement}): HTMLElement;
  }
}
