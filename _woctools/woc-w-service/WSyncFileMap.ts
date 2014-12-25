/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require("fs");
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsp = require('../lib/fsp');

class WSyncFileMap {
  private serialized;
  private waitDelayedWritePromise: Promise<void> = null;
  private isWriting = false;
  private isRemoved = false;
  public plainMap = {};

  constructor(private rootPath: string, private filePath: string) {
  }

  public write(): Promise<void> {
    if (this.isRemoved)
      return Promise.resolve<void>();
    this.waitDelayedWritePromise = null;
    if (this.isSync())
      return Promise.resolve<void>();
    if (this.isWriting)
      return this.delayedWrite();
    this.isWriting = true;
    var ser = WSyncFileMap.copy(this.plainMap);
//console.log('## Write!');
    return fsp.writeFile(this.filePath, JSON.stringify(ser), {encoding: 'UTF-8'}).then(() => {
      this.serialized = ser;
      this.isWriting = false;
    });
  }

  public delayedWrite(): Promise<void> {
    if (this.isRemoved)
      return Promise.resolve<void>();
    if (this.waitDelayedWritePromise)
      return this.waitDelayedWritePromise;
    return this.waitDelayedWritePromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.write().then(() => {
          resolve();
        });
      }, 500);
    });
  }

  public load(): Promise<void> {
    if (this.isRemoved)
      return Promise.resolve<void>();
    return fsp.readFile(this.filePath, {encoding: 'UTF-8'}).then((data: string) => {
      try {
        this.plainMap = WSyncFileMap.copy(this.serialized = JSON.parse(data));
      } catch (err) {
        this.plainMap = {};
        this.serialized = {};
      }
    }, (err) => {
      if (err.code === 'ENOENT') {
        this.plainMap = {};
        this.serialized = {};
      } else
        throw err;
    });
  }

  public remove(): Promise<void> {
    if (this.isRemoved)
      return Promise.resolve<void>();
    this.isRemoved = true;
    return fsp.unlink(this.filePath);
  }

  private isSync(): boolean {
    if (!this.serialized)
      return false;
    var count = 0;
    for (var k in this.serialized) {
      if (!this.serialized.hasOwnProperty(k))
        continue;
      if (this.serialized[k] !== this.plainMap[k]) {
        return false;
      }
      ++count;
    }
    for (var k in this.plainMap) {
      if (!this.plainMap.hasOwnProperty(k))
        continue;
      if (--count < 0) {
        return false;
      }
    }
    return true;
  }

  private static copy(obj) {
    var copy = {};
    for (var k in obj) {
      if (obj.hasOwnProperty(k))
        copy[k] = obj[k];
    }
    return copy;
  }
}

export = WSyncFileMap;
