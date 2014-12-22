/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require("fs");
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsp = require('../lib/fsp');
import Common = require('./Common');

class Thread {
  private resolve = null;
  private reject = null;
  private runId = null;
  private isProcessing = false;

  constructor(private intervalMs: number, private processCb: () => Promise<void>) {
  }

  public run(): Promise<void> {
    if (this.runId !== null)
      return Promise.reject(Error('Thread is already running'));
    this.runId = setInterval(() => {
      if (this.runId === null) {
        this.doStop(Error('Already stopped!'));
        return;
      }
      this.process();
    }, this.intervalMs);
    return new Promise<void>((resolve, reject) => {
      if (this.runId === null) {
        this.resolve = null;
        this.reject = null;
        reject(Error('Thread is already stopped'));
        return;
      }
      if (this.reject) {
        reject(Error('Already started'));
        return;
      }
      this.resolve = resolve;
      this.reject = reject;
      this.process();
    });
  }

  public stop() {
    this.doStop(null);
  }

  private process() {
    if (this.isProcessing)
      return Promise.resolve<void>();
    this.isProcessing = true;
    return this.processCb().catch((err) => {
      this.doStop(err);
    }).then(() => {
      this.isProcessing = false;
    });
  }

  private doStop(err) {
    if (this.runId === null && !this.reject)
      return;
    var id = this.runId,
      reject = this.reject,
      resolve = this.resolve;
    this.resolve = null;
    this.reject = null;
    this.runId = null;
    if (id !== null)
      clearInterval(id);
    if (err) {
      if (reject !== null)
        reject(err);
      else
        Common.logError(err);
    } else if (resolve)
      resolve();
  }
}

export = Thread;
