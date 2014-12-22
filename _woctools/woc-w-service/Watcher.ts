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

class Watcher {
  private thread: Thread;
  private watchers = {};

  constructor(private rootPath: string, private syncFiles: WSyncFileMap) {
    this.thread = new Thread(1000, () => {
      this.process();
      return Promise.resolve<void>();
    });
  }

  public run(): Promise<void> {
    return this.thread.run();
  }

  public stop() {
    return this.thread.stop();
  }

  private process() {
    // - List added
    var added = {};
    for (var file in this.syncFiles.plainMap) {
      if (this.syncFiles.plainMap.hasOwnProperty(file) && this.watchers[file] === undefined)
        added[file] = true;
    }
    // - List removed
    var removed = {};
    for (var file in this.watchers) {
      if (this.watchers.hasOwnProperty(file) && this.syncFiles.plainMap[file] === undefined)
        removed[file] = this.watchers[file];
    }
    // - Unwatch removed
    var hasChange = false;
    for (var file in removed) {
      if (removed.hasOwnProperty(file)) {
        removed[file].close();
        delete this.watchers[file];
        hasChange = true;
//console.log('- Unwatch: ' + file);
      }
    }
    // - Watch added
    var makeWatchCb = (file: string) => {
      return (event) => {
        this.syncFiles.plainMap[file] = null;
        this.syncFiles.delayedWrite();
//console.log('... updated (' + event + '): ' + file);
      };
    };
    var watcher: fs.FSWatcher,
      fullPath: string;
    for (var file in added) {
      if (added.hasOwnProperty(file)) {
        fullPath = path.join(this.rootPath, file);
        watcher = fs.watch(fullPath, makeWatchCb(file));
        this.watchers[file] = watcher;
        hasChange = true;
//console.log('+ Watch: ' + file);
      }
    }
    // - End
    if (hasChange)
      this.syncFiles.delayedWrite();
  }
}

export = Watcher;
