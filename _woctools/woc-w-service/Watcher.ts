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

  constructor(private rootPath: string, private syncFiles: WSyncFileMap) {
    this.thread = new Thread(500, () => {
      return this.controlAll();
    });
  }

  public run(): Promise<void> {
    return this.thread.run();
  }

  public stop() {
    return this.thread.stop();
  }

  private controlAll(): Promise<void> {
    var hasChange = false;
    var updFileTimeCb = (file: string) => {
      return (st: fs.Stats) => {
        var serTime = st.mtime.toISOString();
        if (this.syncFiles.plainMap[file] !== serTime) {
          this.syncFiles.plainMap[file] = serTime;
          hasChange = true;
        }
      }
    };
    var promises = [],
      fullPath: string;
    for (var file in this.syncFiles.plainMap) {
      if (!this.syncFiles.plainMap.hasOwnProperty(file))
        continue;
      fullPath = path.join(this.rootPath, file);
      promises.push(fsp.stat(fullPath).then(updFileTimeCb(file)));
    }
    return Promise.all(promises).then<void>(() => {
      if (hasChange)
        return this.syncFiles.write();
    });
  }
}

export = Watcher;
