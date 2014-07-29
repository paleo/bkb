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

enum EmbedType {
	Component, Library, Service, Bundle
}

class BundleWReader {

	private encoding: string;
	private bundleVersion: string;

	public static makeInstance(project: Project, dirName: string, parentRelPath: string = null): Promise<BundleWReader> {
		var bundleRelPath = parentRelPath === null ? dirName : path.join(parentRelPath, dirName);
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
		p = p.then(() => this.readThemeConf(writer, this.bundleRelPath, this.bundleRelPath, this.conf['theme'], this.conf['css']).
			then((cssList): any => {
				return writer.setBundleCss(this.makeFileArr(this.bundleRelPath, cssList));
			}));
		// - Embed things
		var dirList = this.conf['embed'];
		if (dirList) {
			p = dirList.reduce((sequence: Promise<void>, dirName: string) => {
				return sequence.then(() => {
					return this.processEmbedThing(writer, dirName);
				});
			}, p);
		}
		// - Other files
		var excludedSet: {[index: string]: boolean} = {'bundle.json': true};
		if (this.conf['embed']) {
			for (var i = 0, len = this.conf['embed'].length; i < len; ++i)
				excludedSet[this.conf['embed'][i]] = true;
		}
		BundleWReader.appendThemeDirectoriesToSet(excludedSet, this.conf['theme']);
		return p.then(() => {
			return this.includeOtherFiles(writer, this.bundleRelPath, excludedSet);
		});
	}

	// --
	// -- Private - Process embed
	// --

	private processEmbedThing(writer: BundleWriter, dirName: string): Promise<void> {
		switch (BundleWReader.toEmbedType(dirName)) {
			case EmbedType.Library:
				return this.processLibrary(writer, dirName);
				break;
			case EmbedType.Service:
				return this.processService(writer, dirName);
				break;
			case EmbedType.Component:
				return this.processComponent(writer, dirName);
				break;
			case EmbedType.Bundle:
				return BundleWReader.makeInstance(this.project, dirName, this.bundleRelPath).then<void>((embedReader: BundleWReader) => {
					this.checkEncoding(dirName, embedReader.getBundleEncoding());
					return embedReader.process(writer);
				});
				break;
			default:
				throw Error('Unknown embed type of "' + dirName + '"');
		}
	}

	private processLibrary(writer: BundleWriter, dirName: string): Promise<void> {
		// - Read the configuration
		var dirRelPath = path.join(this.bundleRelPath, dirName);
		var jsonPath = path.join(dirRelPath, 'lib.json');
		return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
			BundleWReader.cleanConf(conf);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			// - Read the theme configuration
			return this.readThemeConf(writer, conf['name'], dirRelPath, conf['theme'], conf['css']).then((cssList) => {
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
						BundleWReader.appendThemeDirectoriesToSet({'lib.json': true}, conf['theme'])
					)
				]);
			});
		});
	}

	private processService(writer: BundleWriter, dirName: string): Promise<void> {
		// - Read the configuration
		var dirRelPath = path.join(this.bundleRelPath, dirName);
		var jsonPath = path.join(dirRelPath, 'serv.json');
		return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
			BundleWReader.cleanConf(conf);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			if (Project.isEmpty(conf['script']))
				throw Error('Missing "scripts" in ' + jsonPath);
			// - alias
			var aliasStrOrArr: any = conf['alias'];
			if (!aliasStrOrArr || (typeof aliasStrOrArr === 'object' && aliasStrOrArr.length === 0))
				aliasStrOrArr = null;
			// - Add into the writer
			return Promise.all([
				writer.addService(
					conf['name'],
					conf['useApplication'] === true,
					BundleWReader.arrayOrNull(conf['useLibraries']),
					BundleWReader.arrayOrNull(conf['useServices']),
					BundleWReader.arrayOrNull(conf['useComponents']),
					this.makeFileArr(dirRelPath, conf['script']),
					aliasStrOrArr
				),
				this.includeOtherFiles(
					writer,
					dirRelPath,
					{'serv.json': true}
				)
			]);
		});
	}

	private processComponent(writer: BundleWriter, dirName: string): Promise<void> {
		// - Read the configuration
		var dirRelPath = path.join(this.bundleRelPath, dirName);
		var jsonPath = path.join(dirRelPath, 'comp.json');
		return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
			BundleWReader.cleanConf(conf);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			if (Project.isEmpty(conf['script']))
				throw Error('Missing "scripts" in ' + jsonPath);
			// - Read the theme configuration
			return this.readThemeConf(writer, conf['name'], dirRelPath, conf['theme'], conf['css']).then((cssList) => {
				// - Add into the writer
				return Promise.all([
					writer.addComponent(
						conf['name'],
						conf['useApplication'] === true,
						BundleWReader.arrayOrNull(conf['useLibraries']),
						BundleWReader.arrayOrNull(conf['useServices']),
						BundleWReader.arrayOrNull(conf['useComponents']),
						this.makeFileArr(dirRelPath, conf['script']),
						this.makeFileArr(dirRelPath, cssList),
						this.makeFileArr(dirRelPath, conf['templates']),
						conf['templateEngine']
					),
					this.includeOtherFiles(
						writer,
						dirRelPath,
						BundleWReader.appendThemeDirectoriesToSet({'comp.json': true}, conf['theme'])
					)
				]);
			});
		});
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

	private static toEmbedType(dir: string): EmbedType {
		var last = dir.length - 1;
		if (last <= 2 || dir[last - 1] !== '.')
			throw Error('Invalid embed "' + dir + '"');
		switch(dir[last]) {
			case 's':
				return EmbedType.Service;
			case 'c':
				return EmbedType.Component;
			case 'l':
				return EmbedType.Library;
			case 'w':
				return EmbedType.Bundle;
			default:
				throw Error('Invalid embed "' + dir + '"');
		}
	}

	private static cleanConf(conf: {}): void {
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
		cleanArr('css');
		cleanArr('templates');
	}
}

export = BundleWReader;
