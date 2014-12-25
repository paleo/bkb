/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import WSync = require('./WSync');

class WocWService {
  private opt: {};
  private wSync: WSync;

  /**
   * @param opt object
   *
   * <pre><code>opt: {
   *  projectPath: string
   * }</code></pre>
  */
  constructor(opt: {}) {
    this.opt = WocWService.formatOptions(opt);
    Object.freeze(this.opt);
    this.wSync = new WSync(this.opt['projectPath'], this.opt['outSyncFilePath'], this.opt['includeFiles'], this.opt['exclude'],
      this.opt['excludePattern']);
  }

  public run(): Promise<void> {
    return this.wSync.run();
  }

  public close(): Promise<void> {
    return this.wSync.close();
  }

  private static formatOptions(opt: {}): {} {
    if (!opt['projectPath'])
      throw Error('Parameter "' + 'projectPath' + '" is required');
    return {
      'projectPath': opt['projectPath'],
      'outSyncFilePath': opt['outSyncFilePath'] || opt['projectPath'] + '/w-sync.json',
      'includeFiles': opt['includeFiles'] ? opt['includeFiles'].split(' ') : [],
      'exclude': opt['exclude'] ? opt['exclude'].split(' ') : [],
      'excludePattern': opt['excludePattern'] || ''
    };
  }
}

export = WocWService;
