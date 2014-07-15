/// <reference path="loader.ts" />

(function () {
	'use strict';

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

	function startCore() {
		// - Make the application context
		var baseUrl = document.documentElement.getAttribute('data-woc-base');
		if (!baseUrl) {
			var bases = document.getElementsByTagName('base');
			baseUrl = bases.length > 0 ? bases[0].href : null;
			if (!baseUrl)
				throw new Error('An element "base" or a parameter "data-woc-base" is required');
			if (baseUrl.length > 1 && baseUrl[baseUrl.length -1] === '/')
				baseUrl = baseUrl.slice(0, baseUrl.length -1);
			var prefix = window.location.protocol + '//' + window.location.host;
			if (strStartsWith(baseUrl, prefix))
				baseUrl = baseUrl.slice(prefix.length);
		}
		var appUrl = document.documentElement.getAttribute('data-woc-app');
		if (!appUrl)
			appUrl = baseUrl;
		var firstRelUrl = document.documentElement.getAttribute('data-woc-first');
		if (firstRelUrl === '')
			firstRelUrl = null;
		var ac = woc.makeApplicationContext({
			'appUrl': appUrl,
			'baseUrl': baseUrl,
			'firstRelUrl': firstRelUrl
		});
		// - Load bundles
		var preload = document.documentElement.getAttribute('data-woc-preload');
		if (preload)
			preloadBundles(ac, preload);
		else
			autoStartBundles(ac);
	}

	// ext(w) shop-hep-2.3.5.w
	function preloadBundles(ac: woc.ApplicationContext, preloadStr: string) {
		var arr = preloadStr.split(' '), waited = arr.length, started = false;
		var onBundleLoaded = function () {
			if (--waited > 0 || started)
				return;
			started = true;
			autoStartBundles(ac);
		};
		var tokens, name;
		for (var i = 0, len = waited; i < len; ++i) {
			tokens = /(?:-([0-9]+(?:\.[0-9])*))?(\.w)?(?:\(([^\)]+)\))?$/.exec(arr[i]);
			if (tokens === null) {
				reportStartErr('Invalid preload "' + arr[i] + '"');
				return;
			}
			name = arr[i].slice(0, arr[i].length - tokens[0].length);
			ac.loadBundle(name, {
				'autoLoadCss': tokens[3] === 'css',
				'w': tokens[2] !== undefined,
				'version': tokens[1],
				'done': onBundleLoaded
			});
		}
	}

	function autoStartBundles(ac: woc.ApplicationContext) {
		var el, matches = document.querySelectorAll('[data-woc-exec]');
		for (var i = 0, len = matches.length; i < len; ++i) {
			el = matches[i];
			ac.loadBundle(el.getAttribute('data-woc-exec'), {
				'start': el
			});
		}
	}

	// - Wait until the DOM is ready
	function onReady() {
		try {
			startCore();
		} catch (e) {
			reportStartErr(e);
		}
	}

	if (woc && woc['CORE_W_READY'])
		onReady();
	else {
		if (document.addEventListener)
			document.addEventListener('DOMContentLoaded', onReady);
		else
			window.onload = onReady;
	}
})();
