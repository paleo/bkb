/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require("fs");
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsp = require('../lib/fsp');
import Common = require('./Common');
import WSyncFileMap = require('./WSyncFileMap');
import PresenceScanner = require('./PresenceScanner');
import Watcher = require('./Watcher');

class WSync {
  private syncFiles: WSyncFileMap;
  private scanner: PresenceScanner;
  private watcher: Watcher;
  private isRunning = false;
  private resolve = null;
  private reject = null;

  constructor(rootPath: string, syncFilePath: string, includeFiles: string[], exclude: string[]) {
console.log('Init; Work on: ' + rootPath + '; output: ' + syncFilePath);
    this.syncFiles = new WSyncFileMap(rootPath, syncFilePath);
    this.scanner = new PresenceScanner(rootPath, this.syncFiles, includeFiles, exclude);
    this.watcher = new Watcher(rootPath, this.syncFiles);
  }

  public run(): Promise<void> {
    if (this.isRunning)
      return Promise.reject(Error('WSync is already running'));
    this.isRunning = true;
    return this.syncFiles.load().then(() => {
      return this.doRun();
    });
  }

  public close(): Promise<void> {
    this.stop();
    return this.syncFiles.remove();
  }

  private doRun(): Promise<void> {
    this.scanner.run().then(() => {
      this.stop();
    }, (err) => {
      this.stop(err);
    });
    this.watcher.run().then(() => {
      this.stop();
    }, (err) => {
      this.stop(err);
    });
    return new Promise<void>((resolve, reject) => {
      if (!this.isRunning) {
        this.resolve = null;
        this.reject = null;
        reject(Error('WSync is already stopped'));
        return;
      }
      if (this.reject) {
        reject(Error('Already started'));
        return;
      }
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private stop(err = null) {
    if (!this.isRunning)
      return;
    this.isRunning = false;
    this.watcher.stop();
    this.scanner.stop();
    var reject = this.reject,
      resolve = this.resolve;
    this.resolve = null;
    this.reject = null;
    if (err) {
      if (reject !== null)
        reject(err);
      else
        Common.logError(err);
    } else if (resolve)
      resolve();
  }
}

export = WSync;
