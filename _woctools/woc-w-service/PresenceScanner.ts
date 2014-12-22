/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require("fs");
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsp = require('../lib/fsp');
import Thread = require('./Thread');
import WSyncFileMap = require('./WSyncFileMap');

function escRegExp(s: string): string {
  return s.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
}

class PresenceScanner {
  private thread: Thread;
  private isScanning = false;
  private includeFileRegExp: RegExp;
  private excludeRegExp: RegExp;

  constructor(private rootPath: string, private syncFiles: WSyncFileMap, includeFiles: string[], exclude: string[]) {
    if (includeFiles.length > 0) {
      var arr = [];
      for (var i = 0, len = includeFiles.length; i < len; ++i)
        arr.push('\\.' + escRegExp(includeFiles[i]));
      this.includeFileRegExp = new RegExp('(' + arr.join('|') + ')$', 'i');
    }
    if (exclude.length > 0) {
      for (var i = 0, len = exclude.length; i < len; ++i)
        arr.push(escRegExp(exclude[i]));
      this.excludeRegExp = new RegExp('^(' + arr.join('|') + ')$', 'i');
    }
    this.thread = new Thread(10000, () => {
      return this.scan();
    });
  }

  public run(): Promise<void> {
    return this.thread.run();
  }

  public stop() {
    return this.thread.stop();
  }

  private scan(): Promise<void> {
    if (this.isScanning)
      return Promise.resolve<void>();
    this.isScanning = true;
    var files = {};
    return this.scanRes(null, files).then(() => {
      this.isScanning = false;
      this.syncFiles.plainMap = files;
    });
  }

  private scanRes(relPath: string, out: {}): Promise<void> {
//console.log('scanRes "' + relPath + '"');
    var fullPath = relPath === null ? this.rootPath : path.join(this.rootPath, relPath);
    return fsp.stat(fullPath).then((st: fs.Stats) => {
      if (st.isDirectory()) {
        return fsp.readdir(fullPath).then((children: string[]) => {
          var promises = [];
          for (var i = 0, len = children.length; i < len; ++i) {
            if (!this.shouldExclude(children[i]))
              promises.push(this.scanRes(relPath === null ? children[i] : path.join(relPath, children[i]), out));
          }
          return <any>Promise.all(promises);
        });
      } else if (st.isFile() && relPath !== null && this.canInclude(relPath))
        out[relPath] = st.mtime.toISOString();
    });
  }

  private shouldExclude(baseName: string): boolean {
    return !this.excludeRegExp || this.excludeRegExp.test(baseName);
  }

  private canInclude(relPath: string): boolean {
    return !this.includeFileRegExp || this.includeFileRegExp.test(relPath);
  }
}

export = PresenceScanner;
