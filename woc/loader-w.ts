/// <reference path="loader.ts" />
'use strict';

module Woc {

  // ##
  // ## Interfaces
  // ##

  interface WBundleProp {
    path: string;
    embedPath: string;
    url: string;
    conf: {};
  }

  interface WThingProp {
    type: WEmbedType;
    name: string;
    path: string;
    url: string;
    confUrl: string;
    bundleProp: WBundleProp;
    conf: {}
  }

  enum WEmbedType {
    Library, Service, Initializer, Component, Theme
  }

  // ##
  // ## WLoader
  // ##

  export class WLoader {

    // --
    // -- Initialisation
    // --

    private ajax: Woc.Ajax;
    private embedBundleList: WBundleProp[] = [];
    private mergedBundleConf: {};
    private preloads: Promise<void>[] = [];
    private bundlePath: string;
    private bundleUrl: string;

    constructor(private libraries: Libraries, private services: Singletons, private initializers: Singletons,
                private components: Components, private loader: Loader, parentUrl: string, private opt: BundleLoadingOptions) {
      this.bundlePath = WLoader.toBundleDir(opt.name);
      this.bundleUrl = parentUrl + '/' + this.bundlePath;
      this.ajax = this.services.get('Woc.Ajax');
    }

    // --
    // -- Public
    // --

    public loadWBundle(): Promise<void> {
      return this.loadBundleConfRecursive(this.bundlePath, null, this.bundleUrl).then(() => {
        this.initMergedBundleConf();
        return Promise.all(this.preloads);
      }).then(() => {
        var thingLoader = new WThingLoader(this.libraries, this.services, this.initializers, this.components, this.ajax,
          this.bundlePath, this.bundleUrl, this.embedBundleList, this.mergedBundleConf, this.opt.name);
        return thingLoader.loadAll();
      }).then(() => {
        var conf = this.mergedBundleConf;
        if (conf['version'] && this.opt.version && conf['version'] !== this.opt.version)
          throw Error('Conflict in bundle version, attempted "' + this.opt.version + '" doesn\'t match with current "' + conf['version'] + '"');
      });
    }

    // --
    // -- Internal tools
    // --

    private static toBundleDir(name: string) {
      return name + '.wocb';
    }

    static cleanConf(conf: {}): void {
      var cleanArr = (arrName: string) => {
        if (conf[arrName] === undefined)
          return;
        if (conf[arrName] === null)
          delete conf[arrName];
        else if (!Array.isArray(conf[arrName]))
          conf[arrName] = [conf[arrName]];
      };
      cleanArr('preload');
      cleanArr('useLibraries');
      cleanArr('useServices');
      cleanArr('useComponents');
      cleanArr('script');
      cleanArr('theme');
      cleanArr('stylesheet');
      cleanArr('templates');
    }

    // --
    // -- Private - Embed bundles
    // --

    private loadBundleConfRecursive(bundlePath, bundleEmbedPath, bundleUrl): Promise<void> {
      return this.ajax.get(bundleUrl + '/bundle.json').then<void>((bundleConf) => {
        WLoader.cleanConf(bundleConf);
        if (bundleConf['preload']) {
          Array.prototype.push.apply(this.preloads, bundleConf['preload'].map((optStr) => {
            var opt = Woc.parseBundleLoadingOptions(optStr);
            if (opt.w)
              throw Error('Cannot preload bundle in working mode in bundle.json: "' + optStr + '"');
            return this.loader.loadBundle(opt);
          }));
        }
        this.embedBundleList.push({
          path: bundlePath,
          embedPath: bundleEmbedPath,
          url: bundleUrl,
          conf: bundleConf
        });
        if (bundleConf['bundles'] !== undefined) {
          return Promise.all(bundleConf['bundles'].map((optStr) => {
            var opt = Woc.parseBundleLoadingOptions(optStr);
            if (!opt.w)
              throw Error('The embed bundle should be in working mode: "' + optStr + '"');
            var dir = WLoader.toBundleDir(opt.name);
            var childEmbedPath = bundleEmbedPath === null ? dir : bundleEmbedPath + '/' + bundleEmbedPath;
            return this.loadBundleConfRecursive(bundlePath + '/' + dir, childEmbedPath, bundleUrl + '/' + dir);
          }));
        }
      });
    }

    private initMergedBundleConf() {
      var i, len, bundleProp, themes = [], encoding = null;
      for (i = 0, len = this.embedBundleList.length; i < len; ++i) {
        bundleProp = this.embedBundleList[i];
        if (!encoding)
          encoding = bundleProp.conf['encoding'];
        else if (bundleProp.conf['encoding'] && encoding !== bundleProp.conf['encoding'])
          throw Error('Encoding conflict with embed bundles: "' + encoding + '" doesn\'t match with "' + bundleProp.conf['encoding'] + '"');
        if (bundleProp.conf['theme'] !== undefined)
          themes.push(WThingLoader.toResList(bundleProp.conf['theme'], bundleProp.embedPath));
      }
      var mainConf = len > 0 ? this.embedBundleList[0].conf : null;
      var flatThemeList = [];
      for (var j = themes.length - 1; j >= 0; --j)
        Array.prototype.push.apply(flatThemeList, themes[j]);
      this.mergedBundleConf = {
        'version': mainConf ? mainConf['version'] : undefined,
        'encoding': encoding,
        'theme': flatThemeList
      };
    }
  }

  // ##
  // ## WThingLoader
  // ##

  class WThingLoader {

    private thingList: WThingProp[];

    constructor(private libraries: Libraries, private services: Singletons, private initializers: Singletons,
                private components: Components, private ajax: Woc.Ajax, private bundlePath: string, private bundleUrl: string,
                private embedBundleList: WBundleProp[], private mergedBundleConf: {}, private mergedBundleName: string) {
      this.initThingList();
    }

    public loadAll(): Promise<void> {
      return Promise.all(this.thingList.map((prop) => {
        return this.ajax.get(prop.confUrl);
      })).then((confList) => {
        for (var i = 0, len = this.thingList.length; i < len; ++i) {
          WLoader.cleanConf(confList[i]);
          if (this.thingList[i].name !== confList[i]['name']) {
            throw Error('In bundle "' + this.mergedBundleName + '", inconsistent names "' + this.thingList[i].name + '" and' +
              ' "' + confList[i]['name'] + '"');
          }
          this.thingList[i].conf = confList[i];
        }
        return this.fillFileLoaders();
      }).then((tplMap) => {
        this.registerAll(tplMap);
      });
    }

    /**
     * @returns A promise which returns the map of templates
     */
    private fillFileLoaders(): Promise<{[index: string]: string}> {
      var scriptLoader = new WScriptLoader(this.libraries);
      var tplLoader = new WTplLoader(this.ajax);
      var cssLoader = new WCssLoader();
      var themePromises: Promise<void>[] = [];
      // - Libraries, Services, Components
      var prop: WThingProp;
      for (var i = 0, len = this.thingList.length; i < len; ++i) {
        prop = this.thingList[i];
        switch(prop.type) {
          case WEmbedType.Library:
            scriptLoader.addLib(prop.conf['name'], prop.url, WThingLoader.toResList(prop.conf['script']), prop.conf['useLibraries']);
            themePromises.push(this.loadTheme(
              cssLoader,
              prop.conf['name'],
              prop.url,
              prop.conf['theme'],
              WThingLoader.toResList(prop.conf['stylesheet'])
            ));
            break;
          case WEmbedType.Service:
          case WEmbedType.Initializer:
            scriptLoader.add(prop.conf['name'], prop.url, WThingLoader.toResList(prop.conf['script']), prop.conf['useLibraries']);
            break;
          case WEmbedType.Component:
            scriptLoader.add(prop.conf['name'], prop.url, WThingLoader.toResList(prop.conf['script']), prop.conf['useLibraries']);
            tplLoader.add(prop.conf['name'], prop.url, WThingLoader.toResList(prop.conf['templates']));
            themePromises.push(this.loadTheme(
              cssLoader,
              prop.conf['name'],
              prop.url,
              prop.conf['theme'],
              WThingLoader.toResList(prop.conf['stylesheet']))
            );
            break;
          default:
            throw Error('Bad thing type: ' + prop.type);
        }
      }
      // - Bundle
      var allThemesP = Promise.all(themePromises).then(() => this.loadTheme(
        cssLoader, this.bundlePath, this.bundleUrl, this.mergedBundleConf['theme']
      )).then(() => cssLoader.getPromise());
      // - Promises
      return Promise.all<any>([
        scriptLoader.getPromise(),
        tplLoader.getPromise(),
        allThemesP
      ]).then((arr) => {
        return arr[1];
      });
    }

    private loadTheme(cssLoader: WCssLoader, thingName: string, baseUrl: string, themeVal: any, cssList: string[] = []): Promise<void> {
      if (!themeVal) {
        cssLoader.add(thingName, baseUrl, cssList);
        return Promise.resolve<void>();
      }
      return this.loadThemeRecursive(baseUrl, null, themeVal).then((list: string[]) => {
        Array.prototype.push.apply(list, cssList);
        cssLoader.add(thingName, baseUrl, list);
      });
    }

    private loadThemeRecursive(thingUrl: string, relThemeUrl: string, themeVal: any[]): Promise<string[]> {
      return Promise.all(themeVal.map((dirOrObj: any): any => {
        // - Case of short syntax
        if (typeof dirOrObj === 'object')
          return WThingLoader.toResList(dirOrObj['stylesheet'], dirOrObj['theme']);
        // - Normal case
        var dirUrl = relThemeUrl ? relThemeUrl + '/' + dirOrObj : dirOrObj;
        return this.ajax.get(thingUrl + '/' + dirUrl + '/theme.json').then((conf): any => {
          WLoader.cleanConf(conf);
          if (!conf['theme'])
            return WThingLoader.toResList(conf['stylesheet'], dirUrl);
          return this.loadThemeRecursive(thingUrl, dirUrl, conf['theme']).then((list: string[]) => {
            Array.prototype.push.apply(list, WThingLoader.toResList(conf['stylesheet'], dirUrl));
            return list;
          });
        });
      })).then((arr) => {
        var list = [];
        for (var i = 0, len = arr.length; i < len; ++i)
          Array.prototype.push.apply(list, arr[i]);
        return list;
      });
    }

    private initThingList() {
      this.thingList = [];
      var bundleProp;
      for (var i = 0, len = this.embedBundleList.length; i < len; ++i) {
        bundleProp = this.embedBundleList[i];
        this.addThing(bundleProp, WEmbedType.Library, 'libraries');
        this.addThing(bundleProp, WEmbedType.Service, 'services');
        this.addThing(bundleProp, WEmbedType.Initializer, 'initializers');
        this.addThing(bundleProp, WEmbedType.Component, 'components');
      }
    }

    private addThing(bundleProp, type: WEmbedType, listKey) {
      var embed: string[] = bundleProp.conf[listKey];
      if (embed === undefined)
        return;
      var name, dir, url;
      for (var i = 0, len = embed.length; i < len; ++i) {
        name = embed[i];
        dir = WThingLoader.toDir(name, type);
        url = bundleProp.url + '/' + dir;
        this.thingList.push({
          type: type,
          name: name,
          path: dir,
          url: url,
          confUrl: url + '/' + WThingLoader.getConfFileName(type),
          bundleProp: bundleProp,
          conf: null
        });
      }
    }

    private static toDir(name: string, type: WEmbedType) {
      switch (type) {
        case WEmbedType.Library:
          return name + '.wocl';
        case WEmbedType.Service:
          return name + '.wocs';
        case WEmbedType.Initializer:
          return name + '.woci';
        case WEmbedType.Component:
          return name + '.wocc';
        default:
          throw Error('Invalid type "' + type + '"');
      }
    }

    private registerAll(tplMap: {}): void {
      // - Make lists
      var libList: WThingProp[] = [],
        servList: WThingProp[] = [],
        initList: WThingProp[] = [],
        compList: WThingProp[] = [];
      var prop: WThingProp;
      for (var i = 0, len = this.thingList.length; i < len; ++i) {
        prop = this.thingList[i];
        switch (prop.type) {
          case WEmbedType.Library:
            libList.push(prop);
            break;
          case WEmbedType.Service:
            servList.push(prop);
            break;
          case WEmbedType.Initializer:
            initList.push(prop);
            break;
          case WEmbedType.Component:
            compList.push(prop);
            break;
          default:
            throw Error('Invalid type "' + prop.type + '"');
        }
      }
      var conf;
      // - Libraries
      for (var i = 0, len = libList.length; i < len; ++i)
        this.libraries.register(libList[i].conf['name'], null, null);
      // - Services
      for (var i = 0, len = servList.length; i < len; ++i) {
        conf = servList[i].conf;
        this.services.register(conf['name'], servList[i].url, conf['useApplication'], null, conf['useServices'],
          conf['useComponents'], null, conf['alias']);
      }
      // - Initializers
      for (var i = 0, len = initList.length; i < len; ++i) {
        conf = initList[i].conf;
        this.initializers.register(conf['name'], initList[i].url, conf['useApplication'], null, conf['useServices'],
          conf['useComponents'], null);
        this.initializers.addForInit(this.mergedBundleName, conf['name']);
      }
      // - Components
      for (var i = 0, len = compList.length; i < len; ++i) {
        conf = compList[i].conf;
        this.components.register(conf['name'], compList[i].url, null, conf['useApplication'], conf['useServices'],
          conf['useComponents'], null, tplMap[conf['name']], conf['templateEngine']);
      }
    }

    // --
    // -- Private - Static tools
    // --

    private static getConfFileName(type: WEmbedType) {
      switch(type) {
        case WEmbedType.Library:
          return 'library.json';
        case WEmbedType.Service:
          return 'service.json';
        case WEmbedType.Initializer:
          return 'initializer.json';
        case WEmbedType.Component:
          return 'component.json';
        default:
          throw Error('Invalid conf file type "' + type + '"');
      }
    }

    public static toResList(nameOrArr: any, pathPrefix: string = null): string[] {
      nameOrArr = nameOrArr ? (typeof nameOrArr === 'string' ? [nameOrArr] : nameOrArr) : [];
      if (pathPrefix) {
        for (var i = 0, len = nameOrArr.length; i < len; ++i)
          nameOrArr[i] = pathPrefix + '/' + nameOrArr[i];
      }
      return nameOrArr;
    }
  }

  // ##
  // ## WScriptLoader
  // ##

  class WScriptLoader {
    private urlValidator = new WUniqueUrlValidator();
    private libMap = {};
    private waitList = [];
    private mainError: Error;
    private mainResolve: Function;
    private mainReject: Function;
    private promises = [];
    private withMainPromise = false;
    private runCount = 0;

    constructor(private libraries: Libraries) {
    }

    public add(thingName: string, baseUrl: string, relUrls: string[], useLibraries: string[] = []) {
      this.doAdd(thingName, baseUrl, relUrls, useLibraries, null);
    }

    public addLib(libName: string, baseUrl: string, relUrls: string[], useLibraries: string[] = []) {
      if (this.libMap[libName] === true || (this.libMap[libName] === undefined && this.libraries.load(name, false)))
        throw Error('Library "' + libName + '" is already defined');
      this.libMap[libName] = false;
      this.doAdd(libName, baseUrl, relUrls, useLibraries, libName);
    }

    public getPromise(): Promise<void> {
      this.withMainPromise = true;
      return new Promise<void>((resolve, reject) => {
        if (this.mainError)
          reject(this.mainError);
        else if (this.runCount === 0) {
          if (this.waitList.length === 0)
            resolve();
          else
            reject(Error('Fail to load scripts for: ' + this.toDebugStringWait()));
        } else {
          this.mainResolve = resolve;
          this.mainReject = reject;
        }
      });
    }

    private doAdd(thingName: string, baseUrl: string, relUrls: string[], useLibraries: string[], libName: string) {
      this.urlValidator.add(baseUrl, relUrls);
      this.fillLibMap(useLibraries);
      this.waitList.push({
        'thingName': thingName,
        'libName': libName,
        'baseUrl': baseUrl,
        'relUrls': relUrls,
        'useLibraries': useLibraries
      });
      this.runWaited();
    }

    private fillLibMap(useLibraries: string[]) {
      var name: string;
      for (var i = 0, len = useLibraries.length; i < len; ++i) {
        name = useLibraries[i];
        if (this.libMap[name] === undefined)
          this.libMap[name] = this.libraries.load(name, false);
      }
    }

    private runWaited() {
      if (this.mainError)
        return;
      var prop, withStarted = false, hasWaited = false;
      for (var k in this.waitList) {
        if (!this.waitList.hasOwnProperty(k))
          continue;
        prop = this.waitList[k];
        if (this.areLibReady(prop['useLibraries'])) {
          withStarted = true;
          this.loadUrls(prop['baseUrl'], prop['relUrls'], prop['libName']);
          delete this.waitList[k];
        } else
          hasWaited = true;
      }
      if (this.withMainPromise && this.runCount === 0 && !withStarted) {
        if (hasWaited)
          throw Error('Fail to load scripts for: ' + this.toDebugStringWait());
        if (this.mainResolve)
          this.mainResolve();
      }
    }

    private areLibReady(useLibraries: string[]) {
      for (var i = 0, len = useLibraries.length; i < len; ++i) {
        if (!this.libMap[useLibraries[i]])
          return false;
      }
      return true;
    }

    private loadUrls(baseUrl: string, relUrls: string[], libName: string) {
      ++this.runCount;
      this.promises.push(relUrls.reduce((sequence: Promise<void>, relUrl) => {
        return sequence.then(() => {
          return WScriptLoader.addScriptToDOM(baseUrl + '/' + relUrl);
        });
      }, Promise.resolve<void>()).then(() => {
        if (libName)
          this.libMap[libName] = true;
        --this.runCount;
        this.runWaited();
      }).catch((err) => {
        this.mainError = err;
        if (this.mainReject)
          this.mainReject(err);
        else
          throw err;
      }));
    }

    private toDebugStringWait() {
      var list = [];
      for (var k in this.waitList) {
        if (!this.waitList.hasOwnProperty(k))
          continue;
        list.push(this.waitList[k]['thingName']);
      }
      return list.join(', ');
    }

    private static addScriptToDOM(url): Promise<void> {
      return new Promise<void>(function (resolve, reject) {
        var script = document.createElement('script');
        if (script.onreadystatechange) { // IE8
          script.onreadystatechange = function () {
            if (script.readyState === 'complete')
              resolve();
            else
              reject(Error('Fail to load script: ' + url));
          };
        } else {
          script.onload = () => {
            resolve();
          };
          script.onerror = () => {
            reject(Error('Fail to load script: ' + url));
          };
        }
        script.src = url;
        var head: HTMLHeadElement = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(script);
      });
    }
  }

  // ##
  // ## WCssLoader
  // ##

  class WCssLoader {
    private urlValidator = new WUniqueUrlValidator();
    private promises = [];

    constructor() {
    }

    public add(thingName: string, baseUrl: string, relUrls: string[]) {
      this.urlValidator.add(baseUrl, relUrls);
      this.promises.push(Promise.all(relUrls.map((relUrl) => {
        return Loader.addCssLinkToDOM(baseUrl + '/' + relUrl);
      })).catch((e: Error) => {
        throw Error('Fail to load CSS of "' + thingName + '": ' + e.message);
      }));
    }

    public getPromise(): Promise<void> {
      return <any>Promise.all(this.promises);
    }
  }

  // ##
  // ## WTplLoader
  // ##

  class WTplLoader {
    private urlValidator = new WUniqueUrlValidator();
    private compNames = [];
    private promises = [];

    constructor(private ajax: Woc.Ajax) {
    }

    public add(compName: string, baseUrl: string, relUrls: string[]) {
      this.urlValidator.add(baseUrl, relUrls);
      this.compNames.push(compName);
      this.promises.push(Promise.all(relUrls.map((relUrl) => {
        return this.ajax.get(baseUrl + '/' + relUrl, {'rDataType': 'text'});
      })).then((arr: string[]) => {
        return arr.join('\n');
      }, (e: Error) => {
        throw Error('Fail to load templates in "' + compName + '": ' + e.message);
      }));
    }

    public getPromise(): Promise<{[index: string]: string}> {
      return Promise.all(this.promises).then((arr: string[]) => {
        var map = {};
        for (var i = 0, len = arr.length; i < len; ++i)
          map[this.compNames[i]] = arr[i];
        return map;
      });
    }
  }

  // ##
  // ## WUniqueUrlValidator
  // ##

  class WUniqueUrlValidator {
    private urlSet = {};

    public add(baseUrl: string, relUrls: string[]) {
      var url;
      for (var i = 0, len = relUrls.length; i < len; ++i) {
        url = baseUrl + '/' + relUrls[i];
        if (this.urlSet[url])
          throw Error('URL "' + url + '" cannot be included twice');
        this.urlSet[url] = true;
      }
    }
  }
}
