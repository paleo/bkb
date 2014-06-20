/// <reference path='node.d.ts' />

var fs = require('fs');
var path = require("path");

module wott {

	// ##
	// ## WotTool
	// ##

	export class WotTool {
		private opt: {};

		constructor(opt: {}) {
			this.opt = WotTool.cleanOptions(opt);
			Object.freeze(this.opt);
		}

		public processBundles(bundleNames: string[], rmDestination: boolean) {
			var prj = new Project(this.opt);
			var writer, reader;
			for (var i = 0, len = bundleNames.length; i < len; ++i) {
				reader = new BundleWReader(prj, prj.makeDirW(bundleNames[i]));
				writer = new BundleWriter(prj, bundleNames[i], reader.getBundleVersion());
				reader.process(writer);
				writer.write(rmDestination);
			}
		}

/*
{
	'inProjectPath': dir,
	'outProjectPath': dir,
	'defaultEncoding': 'utf8',
	'outEncoding': 'utf8',
	'includeFiles': 'png gif',
	'minifyJs': true,
	'minifyCss': true,
	'minifyHtml': true
}
*/
		private static cleanOptions(opt: {}): {} {
			if (!opt['inProjectPath'])
				throw new Error('Parameter "' + 'inProjectPath' + '" is required');
			return {
				'inProjectPath': opt['inProjectPath'],
				'outProjectPath': opt['outProjectPath'] || opt['inProjectPath'],
				'defaultEncoding': opt['defaultEncoding'] || 'utf8',
				'outEncoding': opt['outEncoding'] || opt['defaultEncoding'] || 'utf8',
				'includeFiles': opt['includeFiles'] ? opt['includeFiles'].split(' ') : [],
				'minifyJs': opt['minifyJs'] === undefined ? true : (opt['minifyJs'] ? true : false),
				'minifyCss': opt['minifyCss'] === undefined ? true : (opt['minifyCss'] ? true : false),
				'minifyHtml': opt['minifyHtml'] === undefined ? true : (opt['minifyHtml'] ? true : false)
			};
		}
	}

	// ##
	// ## Project
	// ##

	class Project {
		private static WOT_VERSION = '0.5';
		private jsMinifier: JsMinifier;
		private cssMinifier: CssMinifier;
		private htmlMinifier: HtmlMinifier;
		private includeFileRegExp: RegExp;

		constructor(private opt: {}) {
			this.jsMinifier = new JsMinifier(this.opt['minifyJs']);
			this.cssMinifier = new CssMinifier(this.opt['minifyCss']);
			this.htmlMinifier = new HtmlMinifier(this.opt['minifyHtml']);
			if (!fs.existsSync(this.opt['inProjectPath']))
				throw new Error('Cannot open input project directory: ' + this.opt['inProjectPath']);
			if (this.opt['outProjectPath'] !== this.opt['inProjectPath'] && !fs.existsSync(this.opt['outProjectPath']))
				fs.mkdir(this.opt['outProjectPath']);
		}

		public getWotVersion(): string {
			return '0.1';
		}

		public canIncludeOtherFile(fileName: string): boolean {
			if (this.includeFileRegExp === undefined) {
				if (this.opt['includeFiles'].length === 0)
					this.includeFileRegExp = null;
				else {
					var arr = [];
					for (var i = 0, len = this.opt['includeFiles'].length; i < len; ++i)
						arr.push('\\.' + Project.escRegExp(this.opt['includeFiles'][i]));
					this.includeFileRegExp = new RegExp('(' + arr.join('|') + ')$', 'i');
				}
			}
			return this.includeFileRegExp.test(fileName);
		}

		public getDefaultEncoding(): string {
			return this.opt['defaultEncoding'];
		}

		public getJsMinifier(): JsMinifier {
			return this.jsMinifier;
		}

		public getCssMinifier(): CssMinifier {
			return this.cssMinifier;
		}

		public getHtmlMinifier(): HtmlMinifier {
			return this.htmlMinifier;
		}

		// --
		// -- Work in progress (input) files
		// --

		public makeDirW(dirName: string): string {
			return dirName + '.w';
		}

		public makeInputFsPath(relPath: string): string {
			return path.join(this.opt['inProjectPath'], relPath);
		}

		public readInputFile(relFilePath: string, encoding: string): string {
			try {
				return fs.readFileSync(path.join(this.opt['inProjectPath'], relFilePath), encoding);
			} catch (e) {
				throw new Error('Cannot open the file: ' + relFilePath);
			}
		}

		public readInputJsonFile(relFilePath: string, encoding: string): {} {
			var obj;
			try {
				obj = JSON.parse(fs.readFileSync(path.join(this.opt['inProjectPath'], relFilePath), encoding));
			} catch (e) {
				throw new Error('Cannot open the JSON file: ' + relFilePath);
			}
			if (obj['wot'] !== Project.WOT_VERSION)
				throw new Error('Bad WOT version "' + obj['wot'] + '", required: ' + Project.WOT_VERSION);
			return obj;
		}

		// --
		// -- Output files
		// --

		public getOutputEncoding(): string {
			return this.opt['outEncoding'];
		}

		public makeOutputFsPath(relPath: string): string {
			return path.join(this.opt['outProjectPath'], relPath);
		}

		public writeOutputFile(relFilePath: string, data: string) {
			fs.writeFileSync(path.join(this.opt['outProjectPath'], relFilePath), data, {'encoding': this.opt['outEncoding']});
		}

		public clearOutputDir(relDirPath) {
			Project.recursiveRmdir(path.join(this.opt['outProjectPath'], relDirPath), false);
		}

		// --
		// -- Tools
		// --

		public static isEmpty(obj: any) {
			if (!obj)
				return true;
			for (var k in obj) {
				if (obj.hasOwnProperty(k))
					return false;
			}
			return true;
		}

		public static cloneData(o) {
			return JSON.parse(JSON.stringify(o));
		}

		// --
		// -- Private
		// --

		private static escRegExp(s: string): string {
			return s.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
		}

		private static recursiveRmdir(dir, includingThis: boolean) {
			var list = fs.readdirSync(dir), filePath, stat;
			for(var i = 0; i < list.length; i++) {
				if (list[i] === '.' || list[i] === '..')
					continue;
				filePath = path.join(dir, list[i]);
				stat = fs.statSync(filePath);
				if (stat.isDirectory())
					Project.recursiveRmdir(filePath, true);
				else
					fs.unlinkSync(filePath);
			}
			if (includingThis)
				fs.rmdirSync(dir);
		}
	}

	// ##
	// ## BundleWriter
	// ##

	class BundleWriter {

		private bundleDirName: string;
		private bundlePath: string;
		private jsMinifier: JsMinifier;
		private cssMinifier: CssMinifier;
		private htmlMinifier: HtmlMinifier;
		private bundleProp = {};
		private libraries = {};
		private services = {};
		private components = {};
		private css: string[] = [];
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

		public setBundleScript(script: {}[]) {
			this.putBundleVal('script', BundleWriter.concatFiles('Bundle ' + this.bundleName, script, this.jsMinifier, 'js'));
		}

		public setBundleCss(css: {}[]) {
			this.css.push(BundleWriter.concatFiles('Bundle ' + this.bundleName, css, this.cssMinifier, 'css'));
		}

		public addLibrary(name: string, requireLib: string[], script: {}[], css: {}[]) {
			if (this.libraries[name] !== undefined)
				throw new Error('Conflict in bundle "' + this.bundleName + '": several libraries "' + name + '"');
			var lib = {};
			if (requireLib !== null)
				lib['requireLib'] = requireLib;
			if (script)
				lib['script'] = BundleWriter.concatFiles('Service ' + name, script, this.jsMinifier, 'js');
			this.libraries[name] = lib;
			if (css !== null)
				this.css.push(BundleWriter.concatFiles('Library ' + name, css, this.cssMinifier, 'css'));
		}

		public addService(name: string, requireLib: string[], script: {}[], aliasStrOrArr: any) {
			if (this.services[name] !== undefined)
				throw new Error('Conflict in bundle "' + this.bundleName + '": several services "' + name + '"');
			var serv = {
				'script': BundleWriter.concatFiles('Service ' + name, script, this.jsMinifier, 'js')
			};
			if (requireLib !== null)
				serv['requireLib'] = requireLib;
			if (aliasStrOrArr !== null)
				serv['alias'] = aliasStrOrArr;
			this.services[name] = serv;
		}

		public addComponent(name: string, requireLib: string[], script: {}[], tpl: {}[], css: {}[]) {
			if (this.components[name] !== undefined)
				throw new Error('Conflict in bundle "' + this.bundleName + '": several components "' + name + '"');
			var comp = {
				'script': BundleWriter.concatFiles('Component ' + name, script, this.jsMinifier, 'js')
			};
			if (requireLib !== null)
				comp['requireLib'] = requireLib;
			if (tpl !== null)
				comp['tpl'] = BundleWriter.concatFiles('Component ' + name, tpl, this.htmlMinifier, 'html');
			this.components[name] = comp;
			if (css !== null)
				this.css.push(BundleWriter.concatFiles('Component ' + name, css, this.cssMinifier, 'css'));
		}

		public addOtherFileOrDir(fileName: string, fullPath: string, stat: any) {
			if (this.otherFileSet[fileName])
				throw new Error('Conflict, several files "' + fileName + '", please rename one');
			this.otherFileSet[fileName] = {
				'fullPath': fullPath,
				'stat': stat
			};
		}

		public write(rmDestination: boolean): boolean {
			// - Clean the output directory
			if (fs.existsSync(this.bundlePath)) {
				if (!rmDestination) {
					console.log('[Warning] The bundle directory already exists: ' + this.bundleName + ' (skip)');
					return false;
				}
				this.project.clearOutputDir(this.bundleDirName);
			} else
				fs.mkdirSync(this.bundlePath);
			// - Make the CSS file
			var cssFileName;
			if (this.css.length > 0) {
				cssFileName = this.bundleName + '.css';
				this.writeFile(cssFileName, this.css.join('\n'));
			} else
				cssFileName = null;
			// - Make the main JSON file
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
			if (cssFileName !== null)
				data['css'] = true;
			this.writeFile(this.bundleName + '.json', JSON.stringify(data));
			// - Copy the other files
			this.copyOtherFiles();
			return true;
		}

		private writeFile(fileName: string, data: string) {
			this.project.writeOutputFile(path.join(this.bundleDirName, fileName), data);
		}

		private copyOtherFiles() {
			var inputPath, stat, outputPath;
			for (var fileName in this.otherFileSet) {
				if (!this.otherFileSet.hasOwnProperty(fileName))
					continue;
				inputPath = this.otherFileSet[fileName]['fullPath'];
				stat = this.otherFileSet[fileName]['stat'];
				outputPath = path.join(this.bundleDirName, fileName);
				if (fs.existsSync(outputPath))
					throw new Error('Name conflict: cannot overwrite file "' + outputPath + '" with other file "' + inputPath + '"');
				if (stat.isDirectory())
					BundleWriter.copyOtherDirSync(inputPath, outputPath, this.project);
				else
					BundleWriter.copyFileSync(inputPath, outputPath);
			}
		}

		private static copyOtherDirSync(inputDirPath: string, outputDirPath: string, project: Project): boolean {
			if (!BundleWriter.otherDirContainsSomething(inputDirPath, project))
				return false;
			fs.mkdirSync(outputDirPath);
			var list = fs.readdirSync(inputDirPath), inChildPath, outChildPath, stat;
			for(var i = 0; i < list.length; i++) {
				if (list[i] === '.' || list[i] === '..')
					continue;
				inChildPath = path.join(inputDirPath, list[i]);
				outChildPath = path.join(outputDirPath, list[i]);
				stat = fs.statSync(inChildPath);
				if (stat.isDirectory())
					BundleWriter.copyOtherDirSync(inChildPath, outChildPath, project);
				else if (project.canIncludeOtherFile(list[i]))
					BundleWriter.copyFileSync(inChildPath, outChildPath);
			}
			return true;
		}

		private static otherDirContainsSomething(inputDirPath: string, project: Project): boolean {
			var list = fs.readdirSync(inputDirPath), inChildPath, stat;
			for(var i = 0; i < list.length; i++) {
				if (list[i] === '.' || list[i] === '..')
					continue;
				inChildPath = path.join(inputDirPath, list[i]);
				stat = fs.statSync(inChildPath);
				if (stat.isDirectory()) {
					if (BundleWriter.otherDirContainsSomething(inChildPath, project))
						return true;
				} else if (project.canIncludeOtherFile(list[i]))
					return true;
			}
			return false;
		}

		private static concatFiles(title: string, files: {}[], minifier: StringMinifier, syntax: string): string {
			var arr = [];
			for (var i = 0, len = files.length; i < len; ++i) {
				if (syntax === 'css') {
					if (i === 0)
						arr.push(BundleWriter.makeFilePrefix(title, syntax));
					else if (i > 0)
						arr.push(BundleWriter.makeFilePrefix(title + ' - ' + files[i]['name'], syntax));
				}
				arr.push(files[i]['minified'] ? files[i]['content'] : minifier.minify(files[i]['content'], files[i]['path']));
			}
			return arr.join('\n');
		}

		private static makeFilePrefix(title: string, syntax: string) {
			switch (syntax) {
				case 'js':
					return '// == ' + title + ' ==';
				case 'css':
					return '/*! == ' + title + ' == */';
				default:
					return '';
			}
		}

		private static copyFileSync(inputPath: string, outputPath: string) {
			var BUF_LENGTH = 64 * 1024, buff = new Buffer(BUF_LENGTH);
			var fdr = fs.openSync(inputPath, 'r'), fdw = fs.openSync(outputPath, 'w');
			var pos = 0, bytesRead;
			while (true) {
				bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
				if (bytesRead === 0)
					break;
				fs.writeSync(fdw, buff, 0, bytesRead, pos);
				pos += bytesRead;
			}
			fs.closeSync(fdr);
			return fs.closeSync(fdw);
		}
	}

	// ##
	// ## BundleWReader
	// ##

	class BundleWReader {

		private bundleRelPath: string;
		private conf: {};
		private encoding: string;
		private bundleVersion: string;

		constructor(private project: Project, private dirName: string, parentRelPath: string = null) {
			if (parentRelPath === null)
				this.bundleRelPath = dirName;
			else
				this.bundleRelPath = path.join(parentRelPath, dirName);
			if (!fs.existsSync(project.makeInputFsPath(this.bundleRelPath)))
				throw new Error('Cannot open bundle "' + dirName + '": ' + this.bundleRelPath);
			this.conf = this.project.readInputJsonFile(path.join(this.bundleRelPath, 'bundle.json'), this.project.getDefaultEncoding());
			this.encoding = this.conf['encoding'] || project.getDefaultEncoding();
			this.bundleVersion = this.conf['version'] || null;
		}

		public getBundleEncoding(): string {
			return this.encoding;
		}

		public getBundleVersion(): string {
			return this.bundleVersion;
		}

		public process(writer: BundleWriter) {
			// - Bundle
			if (!Project.isEmpty(this.conf['preload']))
				writer.putBundleVal('preload', Project.cloneData(this.conf['preload']));
			if (!Project.isEmpty(this.conf['requireLib']))
				writer.putBundleVal('requireLib', Project.cloneData(this.conf['requireLib']));
			if (!Project.isEmpty(this.conf['script'])) {
				writer.setBundleScript(this.makeFileArr(this.bundleRelPath, this.conf['script']));
				if (this.conf['main'])
					writer.putBundleVal('main', this.conf['main']);
			}
			if (!Project.isEmpty(this.conf['css']))
				writer.setBundleCss(this.makeFileArr(this.bundleRelPath, this.conf['css']));
			// - Embed things
			if (this.conf['embed']) {
				var dirList = this.conf['embed'];
				for (var i = 0, len = dirList.length; i < len; ++i)
					this.processEmbedThing(writer, dirList[i]);
			}
			// - Other files
			var excludeSet = {'bundle.json': true};
			if (this.conf['embed']) {
				for (var i = 0, len = this.conf['embed'].length; i < len; ++i)
					excludeSet[this.conf['embed'][i]] = true;
			}
			this.includeOtherFiles(writer, null, excludeSet);
		}

		private processEmbedThing(writer: BundleWriter, dirName: string) {
			switch (BundleWReader.getType(dirName)) {
				case 'L':
					this.processLibrary(writer, dirName);
					break;
				case 'S':
					this.processService(writer, dirName);
					break;
				case 'C':
					this.processComponent(writer, dirName);
					break;
				case 'BW':
					var embedReader = new BundleWReader(this.project, dirName, this.bundleRelPath);
					this.checkEncoding(dirName, embedReader.getBundleEncoding());
					embedReader.process(writer);
					break;
				default:
					throw new Error('Unknown embed type of "' + dirName + '"');
			}
		}

		private processLibrary(writer: BundleWriter, dirName: string) {
			// - Read the configuration
			var dirRelPath = path.join(this.bundleRelPath, dirName);
			var jsonPath = path.join(dirRelPath, 'lib.json');
			var conf = this.project.readInputJsonFile(jsonPath, this.encoding);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw new Error('Missing "name" in ' + jsonPath);
			// - Read files
			var script = this.makeFileArr(dirRelPath, conf['script']);
			var css = this.makeFileArr(dirRelPath, conf['css']);
			// - Add into the writer
			writer.addLibrary(conf['name'], BundleWReader.arrayOrNull(conf['requireLib']), script, css);
			this.includeOtherFiles(writer, dirName, {'lib.json': true});
		}

		private processService(writer: BundleWriter, dirName: string) {
			// - Read the configuration
			var dirRelPath = path.join(this.bundleRelPath, dirName);
			var jsonPath = path.join(dirRelPath, 'serv.json');
			var conf = this.project.readInputJsonFile(jsonPath, this.encoding);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw new Error('Missing "name" in ' + jsonPath);
			// - Read files
			if (Project.isEmpty(conf['script']))
				throw new Error('Missing "scripts" in ' + jsonPath);
			var script = this.makeFileArr(dirRelPath, conf['script']);
			// - alias
			var aliasStrOrArr: any = conf['alias'];
			if (!aliasStrOrArr || (typeof aliasStrOrArr === 'object' && aliasStrOrArr.length === 0))
				aliasStrOrArr = null;
			// - Add into the writer
			writer.addService(conf['name'], BundleWReader.arrayOrNull(conf['requireLib']), script, aliasStrOrArr);
			this.includeOtherFiles(writer, dirName, {'serv.json': true});
		}

		private processComponent(writer: BundleWriter, dirName: string) {
			// - Read the configuration
			var dirRelPath = path.join(this.bundleRelPath, dirName);
			var jsonPath = path.join(dirRelPath, 'comp.json');
			var conf = this.project.readInputJsonFile(jsonPath, this.encoding);
			this.checkEncoding(dirName, conf['encoding']);
			if (conf['name'] === undefined)
				throw new Error('Missing "name" in ' + jsonPath);
			// - Read files
			if (Project.isEmpty(conf['script']))
				throw new Error('Missing "scripts" in ' + jsonPath);
			var script = this.makeFileArr(dirRelPath, conf['script']);
			var templates = this.makeFileArr(dirRelPath, conf['tpl']);
			var css = this.makeFileArr(dirRelPath, conf['css']);
			// - Add into the writer
			writer.addComponent(conf['name'], BundleWReader.arrayOrNull(conf['requireLib']), script, templates, css);
			this.includeOtherFiles(writer, dirName, {'comp.json': true});
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
					'minified': /\.min\.([a-z0-9]+)$/.test(name),
					'content': this.project.readInputFile(fPath, this.encoding)
				});
			}
			return arr;
		}

		private includeOtherFiles(writer: BundleWriter, dirName: string, excludeFileNames: {}) {
			var dir = this.project.makeInputFsPath(dirName ? path.join(this.bundleRelPath, dirName) : this.bundleRelPath);
			var list = fs.readdirSync(dir), filePath, stat;
			for(var i = 0; i < list.length; i++) {
				if (list[i] === '.' || list[i] === '..' || excludeFileNames[list[i]])
					continue;
				filePath = path.join(dir, list[i]);
				stat = fs.statSync(filePath);
				if (stat.isDirectory() || (stat.isFile() && this.project.canIncludeOtherFile(list[i])))
					writer.addOtherFileOrDir(list[i], filePath, stat);
			}
		}

		private checkEncoding(name: string, encoding: string) {
			if (encoding && encoding !== this.encoding)
				throw new Error('Encoding conflict in bundle "' + this.dirName + '" (' + this.encoding + '): ' + name + ' has "' + encoding + '"');
		}

		private static arrayOrNull(arr: string[]): string[] {
			return !arr || arr.length === 0 ? null : arr;
		}

		private static getType(dir: string) {
			var last = dir.length - 1;
			if (last <= 2 || dir[last - 1] !== '.')
				throw new Error('Invalid embed "' + dir + '"');
			switch(dir[last]) {
				case 's':
					return 'S';
				case 'c':
					return 'C';
				case 'l':
					return 'L';
				case 'w':
					return 'BW';
				default:
					throw new Error('Invalid embed "' + dir + '"');
			}
		}
	}

	// ##
	// ## StringMinifier
	// ##

	interface StringMinifier {
		minify(s: string, filePath: string): string;
	}

	// ##
	// ## JsMinifier
	// ##

	class JsMinifier implements StringMinifier {

		private uglifyJs: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string, filePath: string): string {
			if (!this.enabled)
				return s;
			if (this.uglifyJs === undefined) {
				try {
					this.uglifyJs = require('uglify-js');
				} catch (e) {
					this.uglifyJs = null;
					console.log('[Warning] Uglify-js is not available; JS won\'t be minified.');
				}
			}
			if (this.uglifyJs === null)
				return s;
			var ast1: any = this.uglifyJs.parse(s, {'filename': filePath});
			ast1.figure_out_scope();
			var compressor = this.uglifyJs.Compressor();
			var ast2: any = ast1.transform(compressor);
			ast2.figure_out_scope();
			ast2.compute_char_frequency();
			ast2.mangle_names();
			return ast2.print_to_string();
		}
	}

	// ##
	// ## CssMinifier
	// ##

	class CssMinifier implements StringMinifier {

		private uglifyCss: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string): string {
			if (!this.enabled)
				return s;
			if (this.uglifyCss === undefined) {
				try {
					this.uglifyCss = require('uglifycss');
				} catch (e) {
					this.uglifyCss = null;
					console.log('[Warning] UglifyCSS is not available; CSS won\'t be minified.');
				}
			}
			if (this.uglifyCss === null)
				return s;
			return this.uglifyCss.processString(s);
		}
	}

	// ##
	// ## HtmlMinifier
	// ##

	class HtmlMinifier implements StringMinifier {

		private minifier: any;

		constructor(private enabled: boolean) {
		}

		public minify(s: string): string {
			if (!this.enabled)
				return s;
			if (this.minifier === undefined) {
				try {
					this.minifier = require('html-minifier');
				} catch (e) {
					this.minifier = null;
					console.log('[Warning] HtmlMinifier is not available; HTML won\'t be minified.');
				}
			}
			if (this.minifier === null)
				return s;
			return this.minifier.minify(s);
		}
	}
}

// ##
// ## Main
// ##

exports['WotTool'] = wott.WotTool;
