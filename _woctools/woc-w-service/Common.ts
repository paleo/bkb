/// <reference path='../lib/node.d.ts' />
'use strict';

module Common {
  export function logError(err) {
    if (!err) {
      console.log('Unexpected error');
      return;
    }
    if (typeof err === 'string')
      console.log('Error: ' + err);
    else {
      if (err['message'])
        console.log('Error: ' + err['message']);
      if (err['stack'])
        console.log(err['stack']);
    }
  }
}

export = Common;
