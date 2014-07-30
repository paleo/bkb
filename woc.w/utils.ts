/// <reference path="definitions.ts" />
'use strict';

module Woc {
  export function globalEval(script: string): void {
    // - Check 'use strict'
    var needle = ' use strict', len = needle.length;
    var strict = script.length > len;
    if (strict) {
      for (var i = 1; i < len; ++i) {
        if (script[i] !== needle[i]) {
          strict = false;
          break;
        }
      }
    }
    // - Eval
    if (strict) {
      var tag = document.createElement('script');
      tag.text = script;
      document.head.appendChild(tag);
      document.head.removeChild(tag);
    } else {
      // Thanks to https://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
      var glo = window || this;
      if (glo.execScript) {
        glo.execScript(script); // IE
        return;
      }
      var fn = function () {
        glo['eval']['call'](glo, script);
      };
      fn();
    }
  }

  export function toClass(s: string): any {
    var arr = s.split('.');
    var fn: any = window || this;
    for (var i = 0, len = arr.length; i < len; ++i) {
      if (fn === undefined)
        throw Error('Class not found: "' + s + '"');
      fn = fn[arr[i]];
    }
    if (typeof fn !== 'function')
      throw Error('Class not found: "' + s + '"');
    return fn;
  }
}
