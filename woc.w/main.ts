/// <reference path="definitions.ts" />
/// <reference path="loader.ts" />
'use strict';

(function () {
  function reportStartingError(err: any) {
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
    if (!baseUrl) {
      var bases = document.getElementsByTagName('base');
      baseUrl = bases.length > 0 ? bases[0].href : null;
      if (!baseUrl)
        throw Error('An element "base" or a parameter "data-woc-base" is required');
      if (baseUrl.length > 1 && baseUrl[baseUrl.length -1] === '/')
        baseUrl = baseUrl.slice(0, baseUrl.length -1);
      var prefix = window.location.protocol + '//' + window.location.host;
      if (strStartsWith(baseUrl, prefix))
        baseUrl = baseUrl.slice(prefix.length);
    }
    var ac = Woc.makeApplicationContext({
      'wocUrl': document.documentElement.getAttribute('data-woc-url') || baseUrl,
      'baseUrl': baseUrl,
      'firstRelUrl': document.documentElement.getAttribute('data-woc-first') || null
    });
    // - Load bundles
    var preload = document.documentElement.getAttribute('data-woc-preload');
    var p = preload ? preloadBundles(ac, preload) : Promise.resolve<void>();
    return p.then(() => startAll(ac));
  }

  // ext(w) shop-hep-2.3.5.w
  function preloadBundles(ac: Woc.ApplicationContext, preloadStr: string): Promise<void> {
    var arr = preloadStr.split(' '), tokens, name, optList: Woc.BundleLoadingOptions[] = [];
    for (var i = 0, len = arr.length; i < len; ++i) {
      tokens = /(?:-([0-9]+(?:\.[0-9])*))?(\.w)?(?:\(([^\)]+)\))?$/.exec(arr[i]);
      if (tokens === null) {
        reportStartingError('Invalid preload "' + arr[i] + '"');
        return;
      }
      name = arr[i].slice(0, arr[i].length - tokens[0].length);
      optList.push({
        bundlePath: name,
        autoLoadCss: tokens[3] === 'css',
        version: tokens[1],
        w: tokens[2] !== undefined
      });
    }
    return ac.loadBundles(optList);
  }

  function startAll(ac: Woc.ApplicationContext): Promise<void> {
    function startCaller(el: HTMLElement) {
      return () => ac.start(el, el.getAttribute('data-woc-start'));
    }
    var el, preload, p, matches = document.querySelectorAll('[data-woc-start]'), pList = [];
    for (var i = 0, len = matches.length; i < len; ++i) {
      el = matches[i];
      preload = el.getAttribute('data-woc-preload');
      p = preload ? preloadBundles(ac, preload) : Promise.resolve<void>();
      pList.push(p.then(startCaller(el)));
    }
    return <any>Promise.all(pList);
  }

  // - Wait until the DOM is ready
  function onReady() {
    try {
      startCore().catch((e) => {
        reportStartingError(e);
      });
    } catch (e) {
      reportStartingError(e);
    }
  }

  if (Woc && Woc['CORE_W_READY']) {
    delete Woc['CORE_W_READY'];
    onReady();
  } else {
    if (document.addEventListener)
      document.addEventListener('DOMContentLoaded', onReady);
    else
      window.onload = onReady;
  }
})();
