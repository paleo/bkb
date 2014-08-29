/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
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
      return new Promise((resolve) => {
        if (!this.enabled) {
          resolve(s);
          return;
        }
        if (this.uglifyJs === undefined) {
          try {
            this.uglifyJs = require('uglify-js');
          } catch (e) {
            this.uglifyJs = null;
            console.log('[Warning] Uglify-js is not available; JS won\'t be minified.');
          }
        }
        if (this.uglifyJs === null) {
          resolve(s);
          return;
        }
        var ast1: any = this.uglifyJs.parse(s, {'filename': filePath});
        ast1.figure_out_scope();
        var compressor = this.uglifyJs.Compressor();
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
      return new Promise((resolve) => {
        if (!this.enabled) {
          resolve(s);
          return;
        }
        if (this.uglifyCss === undefined) {
          try {
            this.uglifyCss = require('uglifycss');
          } catch (e) {
            this.uglifyCss = null;
            console.log('[Warning] UglifyCSS is not available; CSS won\'t be minified.');
          }
        }
        resolve(this.uglifyCss === null ? s : this.uglifyCss.processString(s));
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
      return new Promise((resolve) => {
        if (!this.enabled) {
          resolve(s);
          return;
        }
        if (this.minifier === undefined) {
          try {
            this.minifier = require('html-minifier');
          } catch (e) {
            this.minifier = null;
            console.log('[Warning] HtmlMinifier is not available; HTML won\'t be minified.');
          }
        }
        resolve(this.minifier === null ? s : this.minifier.minify(s));
      });
    }
  }
}

export = minifiers;
