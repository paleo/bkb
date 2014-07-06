/// <reference path='node.d.ts' />
/// <reference path='es6-promise.d.ts' />
'use strict';

import fs = require('fs');
import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import fsext = require('./fsext');
var fsp = fsext.fsp;
var fsl = fsext.fsl;
import minifiers = require('./minifiers');
import Project = require('./Project');

// ##
// ## BundleWriter
// ##

class BundleWriter {

	private bundleDirName: string;
	private bundlePath: string;
	private jsMinifier: minifiers.JsMinifier;
	private cssMinifier: minifiers.CssMinifier;
	private htmlMinifier: minifiers.HtmlMinifier;
	private bundleProp = {};
	private libraries = {};
	private services = {};
	private components = {};
	private css: string[] = [];
	private subDirCssMap = {};
	private otherFileSet = {};

	constructor(private project: Project, private bundleName: string, bundleVersion: string) {
		this.bundleDirName = bundleName + (bundleVersion ? '-' + bundleVersion : '');
		this.bundlePath = this.project.makeOutputFsPath(this.bundleDirName);
		this.jsMinifier = project.getJsMinifier();
		this.cssMinifier = project.getCssMinifier();
		this.htmlMinifier = project.getHtmlMinifier();
	}

	public putBundleVal(key: string, val: any) {
		this.bundleProp[key] = val;
	}

	public setBundleScript(script: {}[]): Promise<void> {
		var that = this;
		return BundleWriter.concatFiles('Bundle ' + this.bundleName, script, this.jsMinifier, 'js').then(function (content: string): void {
			that.putBundleVal('script', content);
		});
	}

	public setBundleCss(css: {}[]): Promise<void> {
		var that = this;
		return BundleWriter.concatFiles('Bundle ' + this.bundleName, css, this.cssMinifier, 'css').then(function (content: string): void {
			that.css.push(content);
		});
	}

	public addLibrary(name: string, requireLib: string[], script: {}[], css: {}[]): Promise<void> {
		if (this.libraries[name] !== undefined)
			throw new Error('Conflict in bundle "' + this.bundleName + '": several libraries "' + name + '"');
		var lib = {};
		if (requireLib !== null)
			lib['requireLib'] = requireLib;
		var that = this, p = Promise.resolve<void>();
		if (script) {
			p = BundleWriter.concatFiles('Library ' + name, script, this.jsMinifier, 'js').then(function (content: string): void {
				lib['script'] = content;
			});
		}
		if (css !== null) {
			css = this.keepSubdirCss(css, lib);
			if (css.length > 0) {
				p = p.then(function () {
					return BundleWriter.concatFiles('Library ' + name, css, that.cssMinifier, 'css').then(function (content: string): void {
						that.css.push(content);
					});
				});
			}
		}
		return p.then(function () {
			that.libraries[name] = lib;
		});
	}

	public addService(name: string, requireLib: string[], script: {}[], aliasStrOrArr: any): Promise<void> {
		if (this.services[name] !== undefined)
			throw new Error('Conflict in bundle "' + this.bundleName + '": several services "' + name + '"');
		var that = this;
		return BundleWriter.concatFiles('Service ' + name, script, this.jsMinifier, 'js').then(function (content: string): void {
			var serv = {
				'script': content
			};
			if (requireLib !== null)
				serv['requireLib'] = requireLib;
			if (aliasStrOrArr !== null)
				serv['alias'] = aliasStrOrArr;
			that.services[name] = serv;
		});
	}

	public addComponent(name: string, requireLib: string[], script: {}[], tpl: {}[], css: {}[]): Promise<void> {
		if (this.components[name] !== undefined)
			throw new Error('Conflict in bundle "' + this.bundleName + '": several components "' + name + '"');
		var comp = {}, pList = [], that = this;
		pList.push(BundleWriter.concatFiles('Component ' + name, script, this.jsMinifier, 'js').then(function (content: string): void {
			comp['script'] = content;
			if (requireLib !== null)
				comp['requireLib'] = requireLib;
		}));
		if (tpl !== null) {
			pList.push(BundleWriter.concatFiles('Component ' + name, tpl, this.htmlMinifier, 'html').then(function (content: string): void {
				comp['tpl'] = content;
			}));
		}
		if (css !== null) {
			css = this.keepSubdirCss(css, comp);
			if (css.length > 0) {
				pList.push(BundleWriter.concatFiles('Component ' + name, css, this.cssMinifier, 'css').then(function (content: string): void {
					that.css.push(content);
				}));
			}
		}
		return Promise.all(pList).then(function () {
			that.components[name] = comp;
		});
	}

	public addOtherFileOrDir(fileName: string, relPath: string, fullPath: string, st: fs.Stats): void {
		if (this.otherFileSet[fileName])
			throw new Error('Conflict, several files "' + fileName + '", please rename one');
		this.otherFileSet[fileName] = {
			'relPath': relPath,
			'fullPath': fullPath,
			'stat': st
		};
	}

	public write(rmDestination: boolean): Promise<boolean> {
		var that = this;
		return this.cleanOutputDir(rmDestination).then(function (ready: boolean): any {
			if (!ready)
				return false;
			var p: Promise<any> = that.writeFile(that.bundleName + '.json', JSON.stringify(that.makeData()));
			if (that.hasCss())
				p = Promise.all([p, that.writeFile(that.bundleName + '.css', that.css.join('\n'))]);
			return p.then(function () {
				return that.copyOtherFiles();
			}).then(function () {
				return true;
			});
		});
	}

	private keepSubdirCss(css: {}[], prop: {}): {}[] {
		var newCss = [], kept = [];
		for (var i = 0, len = css.length; i < len; ++i) {
			if (css[i]['name'].indexOf(path.sep) === -1)
				newCss.push(css[i]);
			else {
				kept.push(css[i]['name']);
				this.subDirCssMap[css[i]['path']] = css[i];
			}
		}
		if (kept.length > 0)
			prop['css'] = kept;
		return newCss;
	}

	private cleanOutputDir(rmDestination: boolean): Promise<boolean> {
		var that = this;
		return fsp.exists(that.bundlePath).then(function (b): any {
			var p: Promise<any>;
			if (b) {
				if (!rmDestination) {
					console.log('[Warning] The bundle directory already exists: ' + that.bundleName + ' (skip)');
					return false;
				}
				p = that.project.clearOutputDir(that.bundleDirName);
			} else
				p = fsp.mkdir(that.bundlePath);
			return p.then(function () {
				return true;
			});
		});
	}

	private hasCss(): boolean {
		return this.css.length > 0;
	}

	private makeData() {
		var data = {
			'wot': this.project.getWotVersion(),
			'encoding': this.project.getOutputEncoding()
		};
		for (var k in this.bundleProp) {
			if (this.bundleProp.hasOwnProperty(k) && this.bundleProp[k])
				data[k] = this.bundleProp[k];
		}
		if (!Project.isEmpty(this.libraries))
			data['libraries'] = this.libraries;
		if (!Project.isEmpty(this.services))
			data['services'] = this.services;
		if (!Project.isEmpty(this.components))
			data['components'] = this.components;
		if (this.hasCss())
			data['css'] = true;
		return data;
	}

	private writeFile(fileName: string, data: string): Promise<void> {
		return this.project.writeOutputFile(path.join(this.bundleDirName, fileName), data);
	}

	private copyOtherFiles(): Promise<void> {
		var that = this;
		var makeP = function (inputRelPath, inputFullPath, st: fs.Stats, outputRelPath, outputFullPath): Promise<void> {
			return fsp.exists(outputFullPath).then(function (b): any {
				if (b)
					throw new Error('Name conflict: cannot overwrite file "' + outputRelPath + '" with other file "' + inputRelPath + '"');
				if (st.isDirectory())
					return that.copyOtherDir(inputRelPath, inputFullPath, outputFullPath, that.project);
				else
					return fsl.copyFile(inputFullPath, outputFullPath);
			})
		};
		var allP: Promise<void>[] = [];
		for (var fileName in this.otherFileSet) {
			if (!this.otherFileSet.hasOwnProperty(fileName))
				continue;
			allP.push(makeP(
				this.otherFileSet[fileName]['relPath'],
				this.otherFileSet[fileName]['fullPath'],
				this.otherFileSet[fileName]['stat'],
				path.join(this.bundleDirName, fileName),
				path.join(this.bundlePath, fileName)
			));
		}
		return <any>Promise.all(allP);
	}

	private copyOtherDir(inputRelPath, inputDirPath: string, outputDirPath: string, project: Project): Promise<boolean> {
		var that = this;
		return this.otherDirContainsSomething(inputRelPath, inputDirPath, project).then(function (b): any {
			if (!b)
				return false;
			var makeStatSb = function (inRelChildPath, inChildPath, outChildPath, childName) {
				return function (st: fs.Stats): any {
					if (st.isDirectory())
						return that.copyOtherDir(inRelChildPath, inChildPath, outChildPath, project);
					else if (that.isSubDirCss(inRelChildPath))
						return fsl.copyFile(inChildPath, outChildPath);
					else if (project.canIncludeOtherFile(childName))
						return fsl.copyFile(inChildPath, outChildPath);
				};
			};
			fsp.mkdir(outputDirPath).then(function () {
				return fsp.readdir(inputDirPath).then(function (list: string[]) {
					var inRelChildPath, inChildPath, outChildPath, allP: Promise<any>[] = [];
					for(var i = 0; i < list.length; i++) {
						if (list[i] === '.' || list[i] === '..')
							continue;
						inRelChildPath = path.join(inputRelPath, list[i]);
						inChildPath = path.join(inputDirPath, list[i]);
						outChildPath = path.join(outputDirPath, list[i]);
						allP.push(fsp.stat(inChildPath).then<boolean>(makeStatSb(inRelChildPath, inChildPath, outChildPath, list[i])));
					}
					return Promise.all(allP);
				});
			}).then(function () {
				return true;
			});
		});
	}

	private otherDirContainsSomething(inputRelPath, inputDirPath: string, project: Project): Promise<boolean> {
		var that = this;
		return fsp.readdir(inputDirPath).then(function (list: string[]) {
			return list.reduce(function (sequence: Promise<boolean>, childName: string) {
				if (childName === '.' || childName === '..')
					return sequence;
				return sequence.then(function (hasSomeThing: boolean): any {
					if (hasSomeThing)
						return true;
					var inRelChildPath = path.join(inputRelPath, childName);
					var inChildPath = path.join(inputDirPath, childName);
					return fsp.stat(inChildPath).then<boolean>(function (st: fs.Stats): any {
						if (st.isDirectory())
							return that.otherDirContainsSomething(inRelChildPath, inChildPath, project);
						else if (that.isSubDirCss(inRelChildPath))
							return true;
						else
							return project.canIncludeOtherFile(childName);
					});
				});
			}, Promise.resolve(false));
		});
	}

	private isSubDirCss(relPath: string): boolean {
		return this.subDirCssMap[relPath] !== undefined;
	}

	private static concatFiles(title: string, files: {}[], minifier: minifiers.StringMinifier, syntax: string): Promise<string> {
		var arr = [];
		return files.map(function (fileProp: {}, index: number) {
			var p: Promise<string>;
			if (fileProp['minified'])
				p = fileProp['contentPromise'];
			else
				p = fileProp['contentPromise'].then(function (content: string) {
					return minifier.minify(content, fileProp['path']);
				});
			if (syntax === 'css') {
				p = p.then(function (content: string) {
					if (index < 0)
						return content;
					return BundleWriter.makeFilePrefix(index === 0 ? title : title + ' - ' + fileProp['name'], syntax) + '\n' + content;
				});
			}
			return p;
		}).reduce(function (sequence: Promise<any>, filePromise: Promise<string>) {
			return sequence.then(function() {
				return filePromise;
			}).then(function(content: string) {
				arr.push(content);
			});
		}, Promise.resolve()).then(function () {
			return arr.join('\n');
		});
	}

	private static makeFilePrefix(title: string, syntax: string): string {
		switch (syntax) {
			case 'js':
				return '// == ' + title + ' ==';
			case 'css':
				return '/*! == ' + title + ' == */';
			default:
				return '';
		}
	}
}

export = BundleWriter;
