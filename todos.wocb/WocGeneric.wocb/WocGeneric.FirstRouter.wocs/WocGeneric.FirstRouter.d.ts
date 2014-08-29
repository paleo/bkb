/// <reference path='../d.ts/woc.d.ts' />

declare module WocGeneric {
	interface UrlProps {
		relUrl: string;
		args: {string: string};
		sel: string;
		title?: string;
	}
	interface UrlController {
		fillUrlProps(props: UrlProps): boolean;
	}
}
