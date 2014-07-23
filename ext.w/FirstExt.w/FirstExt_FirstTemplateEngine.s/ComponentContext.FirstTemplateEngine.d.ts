/// <reference path='../d.ts/Woc.d.ts' />

declare module Woc {
	interface ComponentContextWithFirstTemplate extends ComponentContext {
		getTemplate(sel: string, elMap?: {[index: string]: HTMLElement}): HTMLElement;
	}
}
