/// <reference path='node.d.ts' />
/// <reference path='es6-promise.d.ts' />
'use strict';

import fs = require('fs');
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

module minifiers {

	// ##
	// ## StringMinifier
	// ##

	export interface StringMinifier {
		minify(s: string, filePath: string): Promise<string>;
	}

	// ##
	// ## JsMinifier
	// ##

	export class JsMinifier implements StringMinifier {

		private uglifyJs: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string, filePath: string): Promise<string> {
			var that = this;
			return new Promise(function(resolve) {
				if (!that.enabled) {
					resolve(s);
					return;
				}
				if (that.uglifyJs === undefined) {
					try {
						that.uglifyJs = require('uglify-js');
					} catch (e) {
						that.uglifyJs = null;
						console.log('[Warning] Uglify-js is not available; JS won\'t be minified.');
					}
				}
				if (that.uglifyJs === null) {
					resolve(s);
					return;
				}
				var ast1: any = that.uglifyJs.parse(s, {'filename': filePath});
				ast1.figure_out_scope();
				var compressor = that.uglifyJs.Compressor();
				var ast2: any = ast1.transform(compressor);
				ast2.figure_out_scope();
				ast2.compute_char_frequency();
				ast2.mangle_names();
				resolve(ast2.print_to_string());
			});
		}
	}

	// ##
	// ## CssMinifier
	// ##

	export class CssMinifier implements StringMinifier {

		private uglifyCss: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string): Promise<string> {
			var that = this;
			return new Promise(function(resolve) {
				if (!that.enabled) {
					resolve(s);
					return;
				}
				if (that.uglifyCss === undefined) {
					try {
						that.uglifyCss = require('uglifycss');
					} catch (e) {
						that.uglifyCss = null;
						console.log('[Warning] UglifyCSS is not available; CSS won\'t be minified.');
					}
				}
				resolve(that.uglifyCss === null ? s : that.uglifyCss.processString(s));
			});
		}
	}

	// ##
	// ## HtmlMinifier
	// ##

	export class HtmlMinifier implements StringMinifier {

		private minifier: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string): Promise<string> {
			var that = this;
			return new Promise(function(resolve) {
				if (!that.enabled) {
					resolve(s);
					return;
				}
				if (that.minifier === undefined) {
					try {
						that.minifier = require('html-minifier');
					} catch (e) {
						that.minifier = null;
						console.log('[Warning] HtmlMinifier is not available; HTML won\'t be minified.');
					}
				}
				resolve(that.minifier === null ? s : that.minifier.minify(s));
			});
		}
	}
}

export = minifiers;
