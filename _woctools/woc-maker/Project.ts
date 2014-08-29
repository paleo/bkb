/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsext = require('./fsext');
var fsp = fsext.fsp;
var fsl = fsext.fsl;
import minifiers = require('./minifiers');

class Project {
  private static WOC_VERSION = '0.8';
  private jsMinifier: minifiers.JsMinifier;
  private cssMinifier: minifiers.CssMinifier;
  private htmlMinifier: minifiers.HtmlMinifier;
  private includeFileRegExp: RegExp;

  public static makeInstance(opt: {}): Promise<Project> {
    var p = fsp.exists(opt['inProjectPath']).then((b) => {
      if (!b)
        throw Error('Cannot open input project directory: ' + opt['inProjectPath']);
    });
    if (opt['outProjectPath'] !== opt['inProjectPath']) {
      p = Promise.all<any>([p, fsp.exists(opt['outProjectPath'])]).then((arr): any => {
        if (!arr[1])
          return fsp.mkdir(opt['outProjectPath'])
      });
    }
    return p.then(() => {
      return new Project(opt);
    });
  }

  constructor(private opt: {}) {
    this.jsMinifier = new minifiers.JsMinifier(this.opt['minifyJs']);
    this.cssMinifier = new minifiers.CssMinifier(this.opt['minifyCss']);
    this.htmlMinifier = new minifiers.HtmlMinifier(this.opt['minifyHtml']);
  }

  public getWocVersion(): string {
    return Project.WOC_VERSION;
  }

  public canIncludeOtherFile(fileName: string): boolean {
    if (this.includeFileRegExp === undefined) {
      if (this.opt['includeFiles'].length === 0)
        this.includeFileRegExp = null;
      else {
        var arr = [];
        for (var i = 0, len = this.opt['includeFiles'].length; i < len; ++i)
          arr.push('\\.' + Project.escRegExp(this.opt['includeFiles'][i]));
        this.includeFileRegExp = new RegExp('(' + arr.join('|') + ')$', 'i');
      }
    }
    return this.includeFileRegExp.test(fileName);
  }

  public getDefaultEncoding(): string {
    return this.opt['defaultEncoding'];
  }

  public getJsMinifier(): minifiers.JsMinifier {
    return this.jsMinifier;
  }

  public getCssMinifier(): minifiers.CssMinifier {
    return this.cssMinifier;
  }

  public getHtmlMinifier(): minifiers.HtmlMinifier {
    return this.htmlMinifier;
  }

  // --
  // -- Work in progress (input) files
  // --

  public makeInputFsPath(relPath: string): string {
    return path.join(this.opt['inProjectPath'], relPath);
  }

  public readInputFile(relPath: string, encoding: string): Promise<string> {
    var p: Promise<string> = fsp.readFile(path.join(this.opt['inProjectPath'], relPath), {'encoding': encoding});
    p = p.catch<string>(() => {
      throw Error('Cannot read the file: ' + relPath);
    });
    return p;
  }

  public readInputJsonFile(relFilePath: string, encoding: string): Promise<{}> {
    return this.readInputFile(relFilePath, encoding).then((data) => {
      var obj;
      try {
        obj = JSON.parse(data);
      } catch (e) {
        throw Error('Bad JSON in file: ' + relFilePath);
      }
      if (obj['woc'] !== Project.WOC_VERSION)
        throw Error('Bad Woc version "' + obj['woc'] + '", required: ' + Project.WOC_VERSION);
      return obj;
    });
  }

  // --
  // -- Output files
  // --

  public getOutputEncoding(): string {
    return this.opt['outEncoding'];
  }

  public makeOutputFsPath(relPath: string): string {
    return path.join(this.opt['outProjectPath'], relPath);
  }

  public writeOutputFile(relPath: string, data: string): Promise<void> {
    return fsp.writeFile(path.join(this.opt['outProjectPath'], relPath), data, {'encoding': this.opt['outEncoding']})
      .catch<void>(() => {
        throw Error('Cannot write the file: ' + relPath);
      });
  }

  public clearOutputDir(relDirPath): Promise<void> {
    var fullPath = path.join(this.opt['outProjectPath'], relDirPath);
    return fsl.rmRecursive(fullPath, false).catch<void>(() => {
      throw Error('Cannot clear the directory: ' + relDirPath);
    });
  }

  // --
  // -- Tools
  // --

  public static isEmpty(obj: any) {
    if (!obj)
      return true;
    for (var k in obj) {
      if (obj.hasOwnProperty(k))
        return false;
    }
    return true;
  }

  public static cloneData(o) {
    return JSON.parse(JSON.stringify(o));
  }

  // --
  // -- Private
  // --

  private static escRegExp(s: string): string {
    return s.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
  }
}

export = Project;
