/// <reference path="definitions.ts" />
/// <reference path="utils.ts" />
/// <reference path="contexts.ts" />
/// <reference path="loader-w.ts" />
'use strict';

module Woc {

  /**
   * examples: test(w,0.5,css) ext(w) ext2(0.432.43,css)
   */
  export function parseBundleLoadingOptions(s: string): Woc.BundleLoadingOptions {
    var cleanArgs = function (s) {
      var args = s.split(',');
      for (var i = 0, len = args.length; i < len; ++i)
        args[i] = args[i].trim();
      return args;
    };
    var iOpen = s.indexOf('(');
    if (iOpen === -1 || s[s.length - 1] !== ')')
      throw Error('Invalid bundle ref: "' + s + '"');
    var opt: Woc.BundleLoadingOptions = {
      name: s.slice(0, iOpen),
      version: null,
      autoLoadCss: false,
      w: false
    };
    var args = cleanArgs(s.slice(iOpen + 1, -1));
    var cur = 0;
    if (args[cur] === 'w') {
      opt.w = true;
      ++cur;
    }
    if (cur < args.length && /^[0-9]+(\.[0-9]+)*$/.test(args[cur]))
      opt.version = args[cur++];
    if (cur < args.length && args[cur] === 'css') {
      opt.autoLoadCss = true;
      ++cur;
    }
    if (cur < args.length || (!opt.w && opt.version === null))
      throw Error('Invalid bundle ref: "' + s + '"');
    return opt;
  }

  export class Loader {
    private wocUrl: string;
    private ajax: Woc.Ajax;
    private bundlePromMap: {[index:string]: Promise<void>} = {};

    public static WOC_VERSION = '0.12';

    constructor(private ac: ApplicationContext, private externLibs: ExternLibs, private services: Singletons,
                private initializers: Singletons, private components: Components) {
      this.wocUrl = ac.appConfig.wocUrl;
      this.ajax = this.services.get('Woc.Ajax');
    }

    public loadBundle(opt: BundleLoadingOptions): Promise<void> {
      // - Known bundle
      var p = this.bundlePromMap[opt.name];
      if (p !== undefined)
        return p;
      // - First call
      if (opt.w) {
        if (!WLoader)
          throw Error('Cannot load bundle "' + JSON.stringify(opt) + '" in working mode, please use woc-w.min.js');
        var wLoader = new WLoader(this.externLibs, this.services, this.initializers, this.components, this, this.wocUrl, opt);
        p = wLoader.loadWBundle();
      } else
        p = this.loadNormalBundle(this.wocUrl, opt);
      p = p.then(() => {
        this.initializers.init(opt.name);
      });
      this.bundlePromMap[opt.name] = p;
      return p;
    }

    // --
    // -- Public tools
    // --

    public static addCssLinkToDOM(url: string): Promise<void> {
      var elem = document.createElement('link');
      elem.rel = 'stylesheet';
      elem.type = 'text/css';
      elem.href = url;
      var head: HTMLHeadElement = document.head || document.getElementsByTagName('head')[0]; // IE8
      head.appendChild(elem);
      return Promise.resolve<void>();
    }

    // --
    // -- Private
    // --

    private loadNormalBundle(parentUrl: string, opt: BundleLoadingOptions): Promise<void> {
      var dir = opt.name;
      if (opt.version)
        dir += '-' + opt.version;
      var bundleUrl = parentUrl + '/' + dir;
      var mainProm = this.ajax.get(bundleUrl + '/' + opt.name + '.json').then((resp) => {
        var bundleData = resp.data,
          p;
        if (bundleData['woc'] !== Loader.WOC_VERSION)
          throw Error('Bad Woc version "' + bundleData['woc'] + '", required: ' + Loader.WOC_VERSION);
        if (bundleData['preload']) {
          p = Promise.all(bundleData['preload'].map((optStr) => {
            var opt = parseBundleLoadingOptions(optStr);
            if (opt.w)
              throw Error('Cannot preload bundle in working mode in bundle.json: "' + optStr + '"');
            return this.loadBundle(opt);
          })).then(() => {
            return this.registerNormalBundle(opt.name, bundleUrl, bundleData);
          });
        } else
          p = this.registerNormalBundle(opt.name, bundleUrl, bundleData);
        if (!opt.autoLoadCss && bundleData['css'])
          return Promise.all([p, Loader.addCssLinkToDOM(bundleUrl + '/' + opt.name + '.css')]);
        return p;
      });
      return opt.autoLoadCss ? <any>Promise.all([mainProm, Loader.addCssLinkToDOM(bundleUrl + '/' + opt.name + '.css')]) : mainProm;
    }

    private registerNormalBundle(bundleName: string, bundleUrl: string, bundleData: {}): Promise<void> {
      var name, data, promList = [];
      // - Register externLibs
      var libMap = bundleData['externLibs'];
      if (libMap) {
        for (name in libMap) {
          if (!libMap.hasOwnProperty(name))
            continue;
          data = libMap[name];
          this.externLibs.register(name, data['useExternLibs'], data['js']);
          if (data['css'])
            promList.push(Loader.addCssLinks(data['css'], bundleUrl));
        }
      }
      // - Register services
      var servMap = bundleData['services'];
      if (servMap) {
        for (name in servMap) {
          if (!servMap.hasOwnProperty(name))
            continue;
          data = servMap[name];
          this.services.register(name, bundleUrl, data['useApplication'], data['useExternLibs'], data['useServices'],
            data['useComponents'], data['js'], data['templates'], data['templateEngine'], data['alias']);
        }
      }
      // - Register initializers
      var initMap = bundleData['initializers'];
      if (initMap) {
        for (name in initMap) {
          if (!initMap.hasOwnProperty(name))
            continue;
          data = initMap[name];
          this.initializers.register(name, bundleUrl, data['useApplication'], data['useExternLibs'], data['useServices'],
            data['useComponents'], data['js'], data['templates'], data['templateEngine']);
          this.initializers.addForInit(bundleName, name);
        }
      }
      // - Register components
      var compMap = bundleData['components'];
      if (compMap) {
        for (name in compMap) {
          if (!compMap.hasOwnProperty(name))
            continue;
          data = compMap[name];
          this.components.register(name, bundleUrl, data['useApplication'], data['useExternLibs'], data['useServices'],
            data['useComponents'], data['js'], data['templates'], data['templateEngine']);
          if (data['css'])
            promList.push(Loader.addCssLinks(data['css'], bundleUrl));
        }
      }
      return <any>Promise.all(promList);
    }

    private static addCssLinks(list: string[], bundleUrl: string): Promise<void> {
      return <any>Promise.all(list.map((fileName) => {
        return Loader.addCssLinkToDOM(bundleUrl + '/' + fileName);
      }));
    }
  }
}
