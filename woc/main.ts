/// <reference path="definitions.ts" />
/// <reference path="loader.ts" />
'use strict';

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

  function strStartsWith(s: string, needle: string) {
    if (typeof String.prototype['startsWith'] !== 'undefined')
      return s['startsWith'](needle);
    var len = needle.length;
    if (s.length < len)
      return false;
    for (var i = 0; i < len; ++i) {
      if (s[i] !== needle[i])
        return false;
    }
    return true;
  }

  function startCore(): Promise<void> {
    // - Make the application context
    var baseUrl = document.documentElement.getAttribute('data-woc-base');
    if (!baseUrl)
      baseUrl = document.location.pathname + document.location.search; // Case of hash routes
    else {
      var prefix = window.location.protocol + '//' + window.location.host;
      if (strStartsWith(baseUrl, prefix))
        baseUrl = baseUrl.slice(prefix.length);
    }
    var wocUrl = document.documentElement.getAttribute('data-woc-url');
    if (!wocUrl) {
      var bases = document.getElementsByTagName('base');
      wocUrl = bases.length > 0 ? bases[0].href : null;
      if (!wocUrl)
        throw Error('An element "base" or a parameter "data-woc-url" is required');
    }
    if (wocUrl.length > 1 && wocUrl[wocUrl.length - 1] === '/')
      wocUrl = wocUrl.slice(0, -1);
    var ac = Woc.makeApplicationContext({
      'wocUrl': wocUrl,
      'baseUrl': baseUrl,
      'encoding': document.characterSet || document.charset || document.defaultCharset,
      'firstRelUrl': document.documentElement.getAttribute('data-woc-first') || null
    });
    // - Load bundles
    var load = document.documentElement.getAttribute('data-woc-load');
    var p = load ? loadBundles(ac, load) : Promise.resolve<void>();
    return p.then(() => startAll(ac));
  }

  // ext(w) shop-hep(2.3.5)
  function loadBundles(ac: Woc.ApplicationContext, preloadStr: string): Promise<void> {
    var arr = preloadStr.split(' '), // TODO accept spaces in parenthesis
      optList: Woc.BundleLoadingOptions[] = [];
    for (var i = 0, len = arr.length; i < len; ++i)
      optList.push(Woc.parseBundleLoadingOptions(arr[i]));
    return ac.loadBundles(optList);
  }

  function startAll(ac: Woc.ApplicationContext): Promise<void> {
    function startCaller(el: HTMLElement) {
      return () => ac.start(el, el.getAttribute('data-woc-start'));
    }
    var el, load, p, matches = document.querySelectorAll('[data-woc-start]'), pList = [];
    for (var i = 0, len = matches.length; i < len; ++i) {
      el = matches[i];
      load = el.getAttribute('data-woc-load');
      p = load ? loadBundles(ac, load) : Promise.resolve<void>();
      pList.push(p.then(startCaller(el)));
    }
    return <any>Promise.all(pList);
  }

  // - Wait until the DOM is ready
  function onReady() {
    try {
      startCore().catch((e) => {
        reportStartErr(e);
      });
    } catch (e) {
      reportStartErr(e);
    }
  }

  if (Woc && Woc['coreWUrlMaker']) {
    onReady();
  } else {
    if (document.addEventListener)
      document.addEventListener('DOMContentLoaded', onReady);
    else
      window.onload = onReady;
  }
})();
