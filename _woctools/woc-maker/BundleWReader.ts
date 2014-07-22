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
		if (!Project.isEmpty(this.conf['useLibrary']))
			writer.putBundleVal('useLibrary', Project.cloneData(this.conf['useLibrary']));
		if (!Project.isEmpty(this.conf['script'])) {
			p = p.then(() => {
				return writer.setBundleScript(this.makeFileArr(this.bundleRelPath, this.conf['script']));
			});
			if (this.conf['main'])
				writer.putBundleVal('main', this.conf['main']);
		}
		if (!Project.isEmpty(this.conf['css'])) {
			p = p.then(() => {
				return writer.setBundleCss(this.makeFileArr(this.bundleRelPath, this.conf['css']));
			});
		}
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
		var excludeSet = {'bundle.json': true};
		if (this.conf['embed']) {
			for (var i = 0, len = this.conf['embed'].length; i < len; ++i)
				excludeSet[this.conf['embed'][i]] = true;
		}
		return p.then(() => {
			return this.includeOtherFiles(writer, null, excludeSet);
		});
	}

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
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			// - Read files
			var script = this.makeFileArr(dirRelPath, conf['script']);
			var css = this.makeFileArr(dirRelPath, conf['css']);
			// - Add into the writer
			return Promise.all([
				writer.addLibrary(conf['name'], BundleWReader.arrayOrNull(conf['useLibrary']), script, css),
				this.includeOtherFiles(writer, dirName, {'lib.json': true})
			]);
		});
	}

	private processService(writer: BundleWriter, dirName: string): Promise<void> {
		// - Read the configuration
		var dirRelPath = path.join(this.bundleRelPath, dirName);
		var jsonPath = path.join(dirRelPath, 'serv.json');
		return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			// - Read files
			if (Project.isEmpty(conf['script']))
				throw Error('Missing "scripts" in ' + jsonPath);
			var script = this.makeFileArr(dirRelPath, conf['script']);
			// - alias
			var aliasStrOrArr: any = conf['alias'];
			if (!aliasStrOrArr || (typeof aliasStrOrArr === 'object' && aliasStrOrArr.length === 0))
				aliasStrOrArr = null;
			// - Add into the writer
			return Promise.all([
				writer.addService(conf['name'], BundleWReader.arrayOrNull(conf['useLibrary']),
					BundleWReader.arrayOrNull(conf['useService']), BundleWReader.arrayOrNull(conf['useComponent']), script, aliasStrOrArr),
				this.includeOtherFiles(writer, dirName, {'serv.json': true})
			]);
		});
	}

	private processComponent(writer: BundleWriter, dirName: string): Promise<void> {
		// - Read the configuration
		var dirRelPath = path.join(this.bundleRelPath, dirName);
		var jsonPath = path.join(dirRelPath, 'comp.json');
		return this.project.readInputJsonFile(jsonPath, this.encoding).then<void>((conf: {}) => {
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw Error('Missing "name" in ' + jsonPath);
			// - Read files
			if (Project.isEmpty(conf['script']))
				throw Error('Missing "scripts" in ' + jsonPath);
			var script = this.makeFileArr(dirRelPath, conf['script']);
			var templates = this.makeFileArr(dirRelPath, conf['templates']);
			var css = this.makeFileArr(dirRelPath, conf['css']);
			// - Add into the writer
			return Promise.all([
				writer.addComponent(conf['name'], BundleWReader.arrayOrNull(conf['useLibrary']),
					BundleWReader.arrayOrNull(conf['useService']), BundleWReader.arrayOrNull(conf['useComponent']), script, css, templates,
					conf['templateEngine']),
				this.includeOtherFiles(writer, dirName, {'comp.json': true})
			]);
		});
	}

	private makeFileArr(dirRelPath: string, fileList: any): {}[] {
		if (typeof fileList === 'string')
			fileList = [fileList];
		else if (Project.isEmpty(fileList))
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

	private includeOtherFiles(writer: BundleWriter, dirName: string, excludeFileNames: {}): Promise<void> {
		var relPathDir = dirName ? path.join(this.bundleRelPath, dirName) : this.bundleRelPath;
		var dir = this.project.makeInputFsPath(relPathDir);
		return fsp.readdir(dir).then<void>((list) => {
			return list.reduce((sequence: Promise<void>, childName: string) => {
				if (childName === '.' || childName === '..' || excludeFileNames[childName])
					return sequence;
				return sequence.then(() => {
					var fullPath = path.join(dir, childName),
						relPath = path.join(relPathDir, childName);
					return fsp.stat(fullPath).then<void>((st: fs.Stats): void => {
						if (st.isDirectory() || (st.isFile() && this.project.canIncludeOtherFile(childName)))
							writer.addOtherFileOrDir(childName, relPath, fullPath, st);
					});
				});
			}, Promise.resolve());
		});
	}

	private checkEncoding(name: string, encoding: string) {
		if (encoding && encoding !== this.encoding)
			throw Error('Encoding conflict in bundle "' + this.bundleRelPath + '" (' + this.encoding + '): ' + name + ' has "' + encoding + '"');
	}

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
}

export = BundleWReader;
