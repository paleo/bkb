/// <reference path='../d.ts/woc.d.ts' />

declare module Woc {
	interface HBComponentContext extends ComponentContext {
		render(name: string, context?: {}): string;
    renderIn(el: HTMLElement, name: string, context?: {}): void;
	}
}
