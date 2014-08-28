/// <reference path="definitions.ts" />
/// <reference path="utils.ts" />
/// <reference path="contexts.ts" />
/// <reference path="loader-w.ts" />
'use strict';

module Woc {

  /**
   * examples: todos(w,0.5,css) ext(w) ext2(0.432.43,css)
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

    constructor(private ac: ApplicationContext, private libraries: Libraries, private services: Singletons,
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
        var wLoader = new WLoader(this.libraries, this.services, this.initializers, this.components, this, this.wocUrl, opt);
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
      document.head.appendChild(elem);
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
      var mainProm = this.ajax.get(bundleUrl + '/' + opt.name + '.json').then((bundleData) => {
        var p;
        if (bundleData['preload']) {
          p = Promise.all(bundleData['preload'].map((optStr) => {
            var opt = parseBundleLoadingOptions(optStr);
            if (opt.w)
              throw Error('Cannot preload bundle in working mode in bundle.json: "' + optStr + '"');
            return this.loadBundle(opt);
          })).then(() => {
            return this.registerNormalBundle(bundleUrl, bundleData);
          });
        } else
          p = this.registerNormalBundle(bundleUrl, bundleData);
        if (!opt.autoLoadCss && bundleData['css'])
          return Promise.all([p, Loader.addCssLinkToDOM(bundleUrl + '/' + opt.name + '.css')]);
        return p;
      });
      return opt.autoLoadCss ? <any>Promise.all([mainProm, Loader.addCssLinkToDOM(bundleUrl + '/' + opt.name + '.css')]) : mainProm;
    }

    private registerNormalBundle(bundleUrl, bundleData: {}): Promise<void> {
      var name, data, promList = [];
      // - Register libraries
      var libMap = bundleData['libraries'];
      if (libMap) {
        for (name in libMap) {
          if (!libMap.hasOwnProperty(name))
            continue;
          data = libMap[name];
          this.libraries.register(name, data['useLibraries'], data['js']);
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
          this.services.register(name, bundleUrl, data['useApplication'], data['useLibraries'], data['useServices'],
            data['useComponents'], data['js'], data['alias']);
        }
      }
      // - Register initializers
      var initMap = bundleData['initializers'];
      if (initMap) {
        for (name in initMap) {
          if (!initMap.hasOwnProperty(name))
            continue;
          data = initMap[name];
          this.initializers.register(name, bundleUrl, data['useApplication'], data['useLibraries'], data['useServices'],
            data['useComponents'], data['js']);
        }
      }
      // - Register components
      var compMap = bundleData['components'];
      if (compMap) {
        for (name in compMap) {
          if (!compMap.hasOwnProperty(name))
            continue;
          data = compMap[name];
          this.components.register(name, bundleUrl, data['useApplication'], data['useLibraries'], data['useServices'],
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
