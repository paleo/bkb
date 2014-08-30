/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require("fs");
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsext = require('./fsext');
var fsp = fsext.fsp;
import minifiers = require('./minifiers');
import Project = require('./Project');
import BundleWriter = require('./BundleWriter');
import Common = require('./Common');

interface BundleLoadingOptions {
  name: string;
  version: string;
  autoLoadCss: boolean;
  w: boolean;
}

class BundleWReader {

  private encoding: string;
  private bundleVersion: string;

  public static makeInstance(project: Project, bundleName: string, parentRelPath: string = null): Promise<BundleWReader> {
    var dirName = BundleWReader.toDir(bundleName, Common.EmbedType.Bundle),
      bundleRelPath = parentRelPath === null ? dirName : path.join(parentRelPath, dirName);
    return fsp.exists(project.makeInputFsPath(bundleRelPath)).then((b) => {
      if (!b)
        throw Error('Cannot open bundle "' + bundleRelPath);
      return project.readInputJsonFile(path.join(bundleRelPath, 'bundle.json'), project.getDefaultEncoding());
    }).then((conf: {}) => {
      BundleWReader.cleanConf(conf);
      return new BundleWReader(project, bundleRelPath, conf);
    });
  }

  constructor(private project: Project, private bundleRelPath: string, private conf: {}) {
    this.encoding = this.conf['encoding'] || project.getDefaultEncoding();
    this.bundleVersion = this.conf['version'] || null;
  }

  public getBundleEncoding(): string {
    return this.encoding;
  }

  public getBundleVersion(): string {
    return this.bundleVersion;
  }

  public process(writer: BundleWriter): Promise<void> {
    var p = Promise.resolve<void>();
    // - Bundle
    if (!Project.isEmpty(this.conf['preload']))
      writer.putBundleVal('preload', Project.cloneData(this.conf['preload']));
    p = p.then(() => this.readThemeConf(writer, this.bundleRelPath, this.bundleRelPath, this.conf['theme'], this.conf['stylesheet']).
      then((cssList): any => {
        return writer.setBundleCss(this.makeFileArr(this.bundleRelPath, cssList));
      }));
    // - Embed bundles
    p = p.then<void>(() => {
      return this.processEmbedBundles(writer);
    });
    // - Embed things
    p = p.then<void>(() => {
      return Promise.all([
        this.processEmbedThings(writer, Common.EmbedType.Library),
        this.processEmbedThings(writer, Common.EmbedType.Service),
        this.processEmbedThings(writer, Common.EmbedType.Initializer),
        this.processEmbedThings(writer, Common.EmbedType.Component)
      ]);
    });
    // - Other files: exclude embed things
    var excludedSet: {[index: string]: boolean} = {'bundle.json': true},
      list, dir;
    for (var type = 0; Common.EmbedType[type] !== undefined; ++type) {
      list = this.conf[BundleWReader.toBundleConfKey(type)];
      if (list) {
        for (var j = 0, lenJ = list.length; j < lenJ; ++j) {
          dir = BundleWReader.toDir(list[j], type);
          excludedSet[dir] = true;
        }
      }
    }
    // - Append other files
    BundleWReader.appendThemeDirectoriesToSet(excludedSet, this.conf['theme']);
    return p.then(() => {
      return this.includeOtherFiles(writer, this.bundleRelPath, excludedSet);
    });
  }

  // --
  // -- Private - Process embed
  // --

  private processEmbedBundles(writer: BundleWriter): Promise<void> {
    var optStrList = this.conf[BundleWReader.toBundleConfKey(Common.EmbedType.Bundle)];
    if (!optStrList)
      return Promise.resolve<void>();
    return optStrList.reduce((sequence: Promise<void>, optStr: string) => {
      var opt = BundleWReader.parseBundleLoadingOptions(optStr);
      if (!opt.w)
        throw Error('The embed bundle should be in working mode: "' + optStr + '"');
      return sequence.then(() => {
        return BundleWReader.makeInstance(this.project, opt.name, this.bundleRelPath).then<void>((embedReader: BundleWReader) => {
          this.checkEncoding(opt.name, embedReader.getBundleEncoding());
          return embedReader.process(writer);
        });
      });
    }, Promise.resolve());
  }

  private processEmbedThings(writer: BundleWriter, type: Common.EmbedType): Promise<void> {
    var names = this.conf[BundleWReader.toBundleConfKey(type)];
    if (!names)
      return Promise.resolve<void>();
    return names.reduce((sequence: Promise<void>, name: string) => {
      return sequence.then(() => {
        return this.processEmbedThing(writer, name, type);
      });
    }, Promise.resolve());
  }

  private processEmbedThing(writer: BundleWriter, name: string, type: Common.EmbedType): Promise<void> {
    var dirName = BundleWReader.toDir(name, type);
    switch (type) {
      case Common.EmbedType.Library:
        return this.processLibrary(writer, dirName);
        break;
      case Common.EmbedType.Service:
        return this.processContextThing(writer, type, dirName, 'service.json');
        break;
      case Common.EmbedType.Initializer:
        return this.processContextThing(writer, type, dirName, 'initializer.json');
        break;
      case Common.EmbedType.Component:
        return this.processContextThing(writer, type, dirName, 'component.json');
        break;
      default:
        throw Error('Unknown embed type of "' + dirName + '"');
    }
  }

  private processLibrary(writer: BundleWriter, dirName: string): Promise<void> {
    // - Read the configuration
    var dirRelPath = path.join(this.bundleRelPath, dirName);
    var jsonPath = path.join(dirRelPath, 'library.json');
    return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
      BundleWReader.cleanConf(conf);
      this.checkEncoding(dirName, conf['encoding']);
      if (conf['name'] === undefined)
        throw Error('Missing "name" in ' + jsonPath);
      // - Read the theme configuration
      return this.readThemeConf(writer, conf['name'], dirRelPath, conf['theme'], conf['stylesheet']).then((cssList) => {
        // - Add into the writer
        return Promise.all([
          writer.addLibrary(
            conf['name'],
            BundleWReader.arrayOrNull(conf['useLibraries']),
            this.makeFileArr(dirRelPath, conf['script']),
            this.makeFileArr(dirRelPath, cssList)
          ),
          this.includeOtherFiles(
            writer,
            dirRelPath,
            BundleWReader.appendThemeDirectoriesToSet({'library.json': true}, conf['theme'])
          )
        ]);
      });
    });
  }

  private processContextThing(writer: BundleWriter, type: Common.EmbedType, dirName: string, confFileName: string): Promise<void> {
    // - Read the configuration
    var dirRelPath = path.join(this.bundleRelPath, dirName);
    var jsonPath = path.join(dirRelPath, confFileName);
    return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
      BundleWReader.cleanConf(conf);
      this.checkEncoding(dirName, conf['encoding']);
      if (conf['name'] === undefined)
        throw Error('Missing "name" in ' + jsonPath);
      if (Project.isEmpty(conf['script']))
        throw Error('Missing "script" in ' + jsonPath);
      // - Read the theme configuration
      return this.readThemeConf(writer, conf['name'], dirRelPath, conf['theme'], conf['stylesheet']).then((cssList) => {
        // - Add into the writer
        return Promise.all([
          writer.addContextThing(
            type,
            conf['name'],
            conf['useApplication'] === true,
            BundleWReader.arrayOrNull(conf['useLibraries']),
            BundleWReader.arrayOrNull(conf['useServices']),
            BundleWReader.arrayOrNull(conf['useComponents']),
            this.makeFileArr(dirRelPath, conf['script']),
            this.makeFileArr(dirRelPath, cssList),
            this.makeFileArr(dirRelPath, conf['templates']),
            conf['templateEngine'],
            type === Common.EmbedType.Service ? conf['alias'] : null
          ),
          this.includeOtherFiles(
            writer,
            dirRelPath,
            BundleWReader.appendThemeDirectoriesToSet({confFileName: true}, conf['theme'])
          )
        ]);
      });
    });
  }

  // --
  // -- Private - Tools
  // --

  private static toDir(name: string, type: Common.EmbedType): string {
    switch (type) {
      case Common.EmbedType.Library:
        return name + '.wocl';
      case Common.EmbedType.Service:
        return name + '.wocs';
      case Common.EmbedType.Initializer:
        return name + '.woci';
      case Common.EmbedType.Component:
        return name + '.wocc';
      case Common.EmbedType.Bundle:
        return name + '.wocb';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }

  private static toBundleConfKey(type: Common.EmbedType): string {
    switch (type) {
      case Common.EmbedType.Library:
        return 'libraries';
      case Common.EmbedType.Service:
        return 'services';
      case Common.EmbedType.Initializer:
        return 'initializers';
      case Common.EmbedType.Component:
        return 'components';
      case Common.EmbedType.Bundle:
        return 'bundles';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }

  /**
   * examples: todos(w,0.5,css) ext(w) ext2(0.432.43,css)
   */
  private static parseBundleLoadingOptions(s: string): BundleLoadingOptions {
    var cleanArgs = function (s) {
      var args = s.split(',');
      for (var i = 0, len = args.length; i < len; ++i)
        args[i] = args[i].trim();
      return args;
    };
    var iOpen = s.indexOf('(');
    if (iOpen === -1 || s[s.length - 1] !== ')')
      throw Error('Invalid bundle ref: "' + s + '"');
    var opt: BundleLoadingOptions = {
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

  // --
  // -- Private - Read theme configuration
  // --

  private readThemeConf(writer: BundleWriter, thingName: string, thingRelPath: string, themeVal: any[], cssList: string[] = []): Promise<string[]> {
    if (!themeVal) {
      return Promise.resolve<string[]>(cssList);
    }
    return this.readThemeConfRecursive(writer, thingRelPath, null, themeVal).then((list: string[]) => {
      Array.prototype.push.apply(list, cssList);
      return list;
    });
  }

  private readThemeConfRecursive(writer: BundleWriter, thingRelPath: string, relPath: string, themeVal: any[]): Promise<string[]> {
    var makeCopyPromise = (completePath, themeVal) => {
      var excludeNames = themeVal ? BundleWReader.appendThemeDirectoriesToSet({'theme.json': true}, themeVal) : {};
      return this.includeOtherFiles(writer, completePath, excludeNames);
    };
    return Promise.all(themeVal.map((dirOrObj: any): any => {
      // - Case of short syntax
      if (typeof dirOrObj === 'object') {
        var subDirPath = relPath ? path.join(thingRelPath, relPath, dirOrObj['theme']) : path.join(thingRelPath, dirOrObj['theme']);
        return makeCopyPromise(subDirPath, null).then(() =>
          BundleWReader.prependPathToFileList(dirOrObj['stylesheet'], dirOrObj['theme']));
      }
      // - Normal case
      var itemRelPath = relPath ? path.join(relPath, dirOrObj) : dirOrObj;
      var completePath = path.join(thingRelPath, itemRelPath);
      return this.project.readInputJsonFile(path.join(completePath, 'theme.json'), this.encoding).then((conf): any => {
        BundleWReader.cleanConf(conf);
        return makeCopyPromise(completePath, conf['theme']).then((): any => {
          if (!conf['theme'])
            return BundleWReader.prependPathToFileList(conf['stylesheet'], itemRelPath);
          return this.readThemeConfRecursive(writer, thingRelPath, itemRelPath, conf['theme']).then((list: string[]) => {
            Array.prototype.push.apply(list, BundleWReader.prependPathToFileList(conf['stylesheet'], itemRelPath));
            return list;
          });
        });
      });
    })).then((arr) => {
      var list = [];
      for (var i = 0, len = arr.length; i < len; ++i)
        Array.prototype.push.apply(list, arr[i]);
      return list;
    });
  }

  private static prependPathToFileList(nameOrArr: any, pathPrefix: string): string[] {
    if (!nameOrArr)
      return [];
    for (var i = 0, len = nameOrArr.length; i < len; ++i)
      nameOrArr[i] = path.join(pathPrefix, nameOrArr[i]);
    return nameOrArr;
  }

  private static appendThemeDirectoriesToSet(fileSet: {[index: string]: boolean}, themeVal: any[]): {[index: string]: boolean} {
    if (!themeVal)
      return fileSet;
    var item: any;
    for (var i = 0, len = themeVal.length; i < len; ++i) {
      item = themeVal[i];
      if (typeof item === 'string')
        fileSet[item] = true;
      else
        fileSet[item['theme']] = true;
    }
    return fileSet;
  }

  // --
  // -- Private - Common
  // --

  private makeFileArr(dirRelPath: string, fileList: string[]): {}[] {
    if (Project.isEmpty(fileList))
      return null;
    var arr = [], name, fPath;
    for (var i = 0, len = fileList.length; i < len; ++i) {
      name = fileList[i];
      fPath = path.join(dirRelPath, name);
      arr.push({
        'name': name,
        'path': fPath,
        'minified': /[\.\-]min\.([a-z0-9]+)$/.test(name),
        'contentPromise': this.project.readInputFile(fPath, this.encoding)
      });
    }
    return arr;
  }

  private includeOtherFiles(writer: BundleWriter, dirRelPath: string, excludeNames: {}): Promise<void> {
    var dir = this.project.makeInputFsPath(dirRelPath);
    return fsp.readdir(dir).then<void>((list) => {
      return list.reduce((sequence: Promise<void>, childName: string) => {
        if (childName === '.' || childName === '..' || excludeNames[childName])
          return sequence;
        return sequence.then(() => {
          var fullPath = path.join(dir, childName),
            relPath = path.join(dirRelPath, childName);
          return fsp.stat(fullPath).then<void>((st: fs.Stats): void => {
            if (st.isDirectory() || (st.isFile() && this.project.canIncludeOtherFile(childName))) {
              writer.addOtherFileOrDir(childName, relPath, fullPath, st);
            }
          });
        });
      }, Promise.resolve());
    });
  }

  private checkEncoding(name: string, encoding: string) {
    if (encoding && encoding !== this.encoding)
      throw Error('Encoding conflict in bundle "' + this.bundleRelPath + '" (' + this.encoding + '): ' + name + ' has "' + encoding + '"');
  }

  // --
  // -- Private tools
  // --

  private static arrayOrNull(arr: string[]): string[] {
    return !arr || arr.length === 0 ? null : arr;
  }

  private static cleanConf(conf: {}): void {
    var cleanArr = (arrName: string) => {
      if (conf[arrName] === undefined)
        return;
      if (conf[arrName] === null || (Array.isArray(conf[arrName]) && conf[arrName].length === 0))
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
    cleanArr('alias');
  }
}

export = BundleWReader;
