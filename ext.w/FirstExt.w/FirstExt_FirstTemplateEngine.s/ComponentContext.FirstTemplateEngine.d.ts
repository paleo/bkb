declare module woc {
	interface ComponentContext {
		getTemplate(sel: string, elMap?: {[index: string]: HTMLElement}): HTMLElement;
	}
}
