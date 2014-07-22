/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
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
		return BundleWriter.concatFiles('Bundle ' + this.bundleName, script, this.jsMinifier, 'js').then((content: string): void => {
			this.putBundleVal('script', content);
		});
	}

	public setBundleCss(css: {}[]): Promise<void> {
		return BundleWriter.concatFiles('Bundle ' + this.bundleName, css, this.cssMinifier, 'css').then((content: string): void => {
			this.css.push(content);
		});
	}

	public addLibrary(name: string, useLibrary: string[], script: {}[], css: {}[]): Promise<void> {
		if (this.libraries[name] !== undefined)
			throw Error('Conflict in bundle "' + this.bundleName + '": several libraries "' + name + '"');
		var lib = {};
		if (useLibrary !== null)
			lib['useLibrary'] = useLibrary;
		var p = Promise.resolve<void>();
		if (script) {
			p = BundleWriter.concatFiles('Library ' + name, script, this.jsMinifier, 'js').then((content: string): void => {
				lib['script'] = content;
			});
		}
		if (css !== null) {
			css = this.keepSubdirCss(css, lib);
			if (css.length > 0) {
				p = p.then(() => {
					return BundleWriter.concatFiles('Library ' + name, css, this.cssMinifier, 'css').then((content: string): void => {
						this.css.push(content);
					});
				});
			}
		}
		return p.then(() => {
			this.libraries[name] = lib;
		});
	}

	public addService(name: string, useLibrary: string[], script: {}[], aliasStrOrArr: any): Promise<void> {
		if (this.services[name] !== undefined)
			throw Error('Conflict in bundle "' + this.bundleName + '": several services "' + name + '"');
		return BundleWriter.concatFiles('Service ' + name, script, this.jsMinifier, 'js').then((content: string): void => {
			var serv = {
				'script': content
			};
			if (useLibrary !== null)
				serv['useLibrary'] = useLibrary;
			if (aliasStrOrArr !== null)
				serv['alias'] = aliasStrOrArr;
			this.services[name] = serv;
		});
	}

	public addComponent(name: string, useLibrary: string[], script: {}[], css: {}[], tpl: {}[], templateEngine: string): Promise<void> {
		if (this.components[name] !== undefined)
			throw Error('Conflict in bundle "' + this.bundleName + '": several components "' + name + '"');
		var comp = {}, pList = [];
		if (useLibrary !== null)
			comp['useLibrary'] = useLibrary;
		if (templateEngine)
			comp['templateEngine'] = templateEngine;
		pList.push(BundleWriter.concatFiles('Component ' + name, script, this.jsMinifier, 'js').then((content: string): void => {
			comp['script'] = content;
		}));
		if (tpl !== null) {
			if (!templateEngine)
				console.log('[Warning] Component "' + name + '" has templates without template engine');
			pList.push(BundleWriter.concatFiles('Component ' + name, tpl, this.htmlMinifier, 'html').then((content: string): void => {
				comp['templates'] = content;
			}));
		}
		if (css !== null) {
			css = this.keepSubdirCss(css, comp);
			if (css.length > 0) {
				pList.push(BundleWriter.concatFiles('Component ' + name, css, this.cssMinifier, 'css').then((content: string): void => {
					this.css.push(content);
				}));
			}
		}
		return Promise.all(pList).then(() => {
			this.components[name] = comp;
		});
	}

	public addOtherFileOrDir(fileName: string, relPath: string, fullPath: string, st: fs.Stats): void {
		if (this.otherFileSet[fileName])
			throw Error('Conflict, several files "' + fileName + '", please rename one');
		this.otherFileSet[fileName] = {
			'relPath': relPath,
			'fullPath': fullPath,
			'stat': st
		};
	}

	public write(rmDestination: boolean): Promise<boolean> {
		return this.cleanOutputDir(rmDestination).then((ready: boolean): any => {
			if (!ready)
				return false;
			var p: Promise<any> = this.writeFile(this.bundleName + '.json', JSON.stringify(this.makeData()));
			if (this.hasCss())
				p = Promise.all([p, this.writeFile(this.bundleName + '.css', this.css.join('\n'))]);
			return p.then(() => {
				return this.copyOtherFiles();
			}).then(() => {
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
		return fsp.exists(this.bundlePath).then((b): any => {
			var p: Promise<any>;
			if (b) {
				if (!rmDestination) {
					console.log('[Warning] The bundle directory already exists: ' + this.bundleName + ' (skip)');
					return false;
				}
				p = this.project.clearOutputDir(this.bundleDirName);
			} else
				p = fsp.mkdir(this.bundlePath);
			return p.then(() => {
				return true;
			});
		});
	}

	private hasCss(): boolean {
		return this.css.length > 0;
	}

	private makeData() {
		var data = {
			'woc': this.project.getWocVersion(),
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
		var makeP = (inputRelPath, inputFullPath, st: fs.Stats, outputRelPath, outputFullPath): Promise<void> => {
			return fsp.exists(outputFullPath).then((b): any => {
				if (b)
					throw Error('Name conflict: cannot overwrite file "' + outputRelPath + '" with other file "' + inputRelPath + '"');
				if (st.isDirectory())
					return this.copyOtherDir(inputRelPath, inputFullPath, outputFullPath, this.project);
				else
					return fsl.copyFile(inputFullPath, outputFullPath);
			});
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
		return this.otherDirContainsSomething(inputRelPath, inputDirPath, project).then((b): any => {
			if (!b)
				return false;
			var makeStatSb = (inRelChildPath, inChildPath, outChildPath, childName) => {
				return (st: fs.Stats): any => {
					if (st.isDirectory())
						return this.copyOtherDir(inRelChildPath, inChildPath, outChildPath, project);
					else if (this.isSubDirCss(inRelChildPath))
						return fsl.copyFile(inChildPath, outChildPath);
					else if (project.canIncludeOtherFile(childName))
						return fsl.copyFile(inChildPath, outChildPath);
				};
			};
			fsp.mkdir(outputDirPath).then(() => {
				return fsp.readdir(inputDirPath).then((list: string[]) => {
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
			}).then(() => {
				return true;
			});
		});
	}

	private otherDirContainsSomething(inputRelPath, inputDirPath: string, project: Project): Promise<boolean> {
		return fsp.readdir(inputDirPath).then((list: string[]) => {
			return list.reduce((sequence: Promise<boolean>, childName: string) => {
				if (childName === '.' || childName === '..')
					return sequence;
				return sequence.then((hasSomeThing: boolean): any => {
					if (hasSomeThing)
						return true;
					var inRelChildPath = path.join(inputRelPath, childName);
					var inChildPath = path.join(inputDirPath, childName);
					return fsp.stat(inChildPath).then<boolean>((st: fs.Stats): any => {
						if (st.isDirectory())
							return this.otherDirContainsSomething(inRelChildPath, inChildPath, project);
						else if (this.isSubDirCss(inRelChildPath))
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
		return files.map((fileProp: {}, index: number) => {
			var p: Promise<string>;
			if (fileProp['minified'])
				p = fileProp['contentPromise'];
			else
				p = fileProp['contentPromise'].then((content: string) => {
					return minifier.minify(content, fileProp['path']);
				});
			if (syntax === 'css') {
				p = p.then((content: string) => {
					if (index < 0)
						return content;
					return BundleWriter.makeFilePrefix(index === 0 ? title : title + ' - ' + fileProp['name'], syntax) + '\n' + content;
				});
			}
			return p;
		}).reduce((sequence: Promise<any>, filePromise: Promise<string>) => {
			return sequence.then(() => {
				return filePromise;
			}).then((content: string) => {
				arr.push(content);
			});
		}, Promise.resolve()).then(() => {
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
