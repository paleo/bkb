'use strict';

interface WUrlMaker {
  toUrl(relUrl: string): string;
  toAbsUrl(relUrl: string): string;
}

module Woc {
  export var coreWUrlMaker: WUrlMaker;
}

(function () {
  // - Reports
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

  // - WUrlMaker
  function makeWUrlMaker(wocUrl: string, defNoCache: string, hasCache: boolean, map): WUrlMaker {
    return { // Common code with loader-w.ts
      toUrl: (relUrl: string) => {
        if (map[relUrl])
          return wocUrl + '/' + relUrl + '?_=' + encodeURIComponent(map[relUrl]);
        if (hasCache)
          reportStartErr('Unsynchronized resource: ' + relUrl);
        return wocUrl + '/' + relUrl + '?_=' + defNoCache;
      },
      toAbsUrl: (relUrl: string) => {
        return wocUrl + '/' + relUrl;
      }
    };
  }

  function loadWUrlMaker(wocUrl: string, wSyncUrl: string, cb: (urlMaker: WUrlMaker) => void) {
    var defNoCache = encodeURIComponent((new Date()).toISOString());
    var req = new XMLHttpRequest();
    req.open('GET', wSyncUrl + '?_=' + defNoCache, true);
    // - Handlers
    req.onload = () => {
      var map = {},
        hasCache = false;
      if (req.status < 200 || req.status >= 400) {
        reportStartErr('[Cache disabled] Cannot load the working sync file "' + wSyncUrl + '", please run "node _woctools/woc-w-service" on the server.');
        map = {};
      } else {
        var resp = req.responseText;
        try {
          map = JSON.parse(resp);
        } catch (e) {
          reportStartErr(Error('Invalid JSON, loaded from: ' + wSyncUrl + '\n' + resp));
        }
      }
      cb(makeWUrlMaker(wocUrl, defNoCache, hasCache, map));
    };
    req.onerror = () => {
      reportStartErr(Error('Network error when loading "' + wSyncUrl + '", error ' + req.status + ' (' + req.statusText + ')'));
    };
    // - Send
    req.send();
  }

  // - Parameters
  var scripts = ['lib/promise-1.0.0.min.js', 'utils.js', 'comptree.js', 'contexts.js', 'loader.js', 'loader-w.js', 'log.js', 'ajax.js'];

  // - Check if ready then start
  var waitedLoads = scripts.length, started = false;
  function tryToStart(urlMaker: WUrlMaker) {
    if (started || waitedLoads !== 0)
      return;
    started = true;
    Woc.coreWUrlMaker = urlMaker;
    start(urlMaker);
  }
  function start(urlMaker: WUrlMaker) {
    addScript(urlMaker.toUrl('woc/main.js'));
  }
  // - Add scripts in head
  function addScript(url, cb: Function = null) {
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
  }
  function preload() {
    try {
      var wocUrl = document.documentElement.getAttribute('data-woc-url');
      if (!wocUrl) {
        var bases = document.getElementsByTagName('base');
        wocUrl = bases.length > 0 ? bases[0].href : null;
        if (!wocUrl)
          throw Error('An element "base" or a parameter "data-woc-url" is required');
      }
      if (wocUrl.length > 1 && wocUrl[wocUrl.length - 1] === '/')
        wocUrl = wocUrl.slice(0, -1);
      loadWUrlMaker(wocUrl, wocUrl + '/w-sync.json', loadCore);
    } catch (e) {
      reportStartErr(e);
    }
  }
  function loadCore(urlMaker: WUrlMaker) {
    try {
      for (var i = 0; i < scripts.length; ++i) {
        addScript(urlMaker.toUrl('woc/' + scripts[i]), function () {
          --waitedLoads;
          tryToStart(urlMaker);
        });
      }
    } catch (e) {
      reportStartErr(e);
    }
  }
  // - Starting point
  if (document.addEventListener)
    document.addEventListener('DOMContentLoaded', preload);
  else
    window.onload = preload;
})();
