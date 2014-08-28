'use strict';
var Woc;
(Woc || {}).CORE_W_READY = false;

(function () {
  // - Parameters
  var scripts = ['lib/promise-1.0.0.min.js', 'utils.js', 'comptree.js', 'contexts.js', 'loader.js', 'loader-w.js', 'serv-log.js',
    'serv-ajax.js', 'serv-router.js'];
  function reportStartErr(err: any) {
    var errStr, stack;
    if (typeof err === 'object') {
      if (err.message !== undefined)
        errStr = err.message;
      else
        errStr = err.toString();
      if (err['stack'] !== undefined)
        stack = err['stack'];
    } else if (typeof err === 'string')
      errStr = err;
    else
      errStr = '[unknown error type] ' + err;
    if (typeof console === 'undefined')
      alert(errStr);
    else {
      console.log(errStr);
      if (stack !== undefined)
        console.log(stack);
    }
  }
  // - Check if ready then start
  var waitedLoads = scripts.length, started = false;
  var tryToStart = function (wocUrl: string) {
    if (started || waitedLoads !== 0)
      return;
    started = true;
    Woc.CORE_W_READY = true;
    start(wocUrl);
  };
  var start = function (wocUrl: string) {
    addScript(wocUrl + '/woc/main.js');
  };
  // - Add scripts in head
  var addScript = function (url, cb: Function = null) {
    var loaded = false;
    var done = function () {
      if (loaded)
        return;
      loaded = true;
      if (cb !== null) {
        try {
          cb();
        } catch (e) {
          reportStartErr(e);
        }
      }
    };
    var head = document.head || document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.onreadystatechange = function () {
      if (script.readyState === 'complete')
        done();
    };
    script.onload = done;
    script.src = url;
    head.appendChild(script);
  };
  var loadCore = function () {
    try {
      var wocUrl = document.documentElement.getAttribute('data-woc-url');
      if (!wocUrl) {
        var baseUrl = document.documentElement.getAttribute('data-woc-base');
        if (!baseUrl) {
          var bases = document.getElementsByTagName('base');
          baseUrl = bases.length > 0 ? bases[0].href : null;
          if (!baseUrl)
            throw Error('An element "base" or a parameter "data-woc-base" is required');
          if (baseUrl.length > 1 && baseUrl[baseUrl.length -1] === '/')
            baseUrl = baseUrl.slice(0, baseUrl.length -1);
        }
        wocUrl = baseUrl;
      }
      for (var i = 0; i < scripts.length; ++i) {
        addScript(wocUrl + '/woc/' + scripts[i], function () {
          --waitedLoads;
          tryToStart(wocUrl);
        });
      }
    } catch (e) {
      reportStartErr(e);
    }
  };
  // - Wait until the DOM is ready
  if (document.addEventListener)
    document.addEventListener('DOMContentLoaded', loadCore);
  else
    window.onload = loadCore;
})();
