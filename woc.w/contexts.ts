/// <reference path="definitions.ts" />
/// <reference path="tplparser.ts" />
/// <reference path="comptree.ts" />
/// <reference path="loader.ts" />
'use strict';

module woc {

	// ##
	// ## Functions
	// ##

	export function makeApplicationContext(properties: {}, debug = false): ApplicationContext {
		return new ImplApplicationContext(properties, debug);
	}

	// ##
	// ## ImplApplicationContext
	// ##

	export class ImplApplicationContext implements ApplicationContext {

		private libraries: Libraries;
		private services: Services;
		private components: Components;
		private bundles: Bundles;
		private loader: Loader;

		constructor(public properties: {}, private debug = false) {
			if (Object.freeze)
				Object.freeze(properties);
			this.libraries = new Libraries(this);
			this.services = new Services(this);
			this.components = new Components(this);
			this.bundles = new Bundles(this);
			this.loader = new Loader(this, this.libraries, this.services, this.components, this.bundles);
		}

		// --
		// -- ApplicationContext
		// --

		public isDebug(): boolean {
			return this.debug;
		}

		public getService(serviceName): any {
			return this.services.get(serviceName);
		}

		public createComponent(componentName: string, props: {}, st: LiveState): any {
			return this.components.create(componentName, props, st, {'from': 'A'});
		}

		public removeComponent(c: any, fromDOM = false): void {
			if (LoaderHelper.isArray(c)) {
				var compTree = this.components.getComponentTree();
				for (var i = 0, len = c.length; i < len; ++i)
					compTree.destruct(c[i], fromDOM);
			} else
				this.components.getComponentTree().destruct(c, fromDOM);
		}

		public getServiceContext(serviceName: string): ServiceContext {
			return this.services.getServiceContext(serviceName);
		}

		public getComponentTypeContext(componentName: string): ComponentTypeContext {
			return this.components.getComponentTypeContext(componentName);
		}

		/**
		 * Available options:
		 * <pre>{
		 * 	'autoLoadCss': boolean,
		 * 	'version': string,
		 * 	'w': boolean,
		 * 	'start': -DOM-element-,
		 * 	'done': Function,
		 * 	'fail': Function
		 * }</pre>
		 * @param bundlePath
		 * @param opt
		 */
		public loadBundle(bundlePath: string, opt = {}): void {
			this.loader.loadBundle(bundlePath, opt['done'], opt['fail'], opt['start'], opt['version'], opt['autoLoadCss'], opt['w']);
		}

		public hasLib(libName): boolean {
			return this.libraries.has(libName);
		}

		public includeLib(libName): boolean {
			return this.libraries.load(libName, false);
		}

		public requireLib(libName: any): void {
			if (typeof libName === 'string')
				this.libraries.load(libName, true);
			else {
				for (var i = 0, len = libName.length; i < len; ++i)
					this.libraries.load(libName[i], true);
			}
		}

		public requireService(serviceName): void {
			this.services.getServiceContext(serviceName);
		}

		public requireComponent(componentName): void {
			this.components.getComponentTypeContext(componentName);
		}

		public getDebugTree(): {} {
			return this.components.getComponentTree().getTreeCopy();
		}

		// --
		// -- Internal
		// --

		public createComponentFromServ(componentName: string, props: {}, st: LiveState, sc: ImplServiceContext): any {
			return this.components.create(componentName, props, st, {'from': 'S', 'sc': sc});
		}

		public createComponentFromComp(componentName: string, props: {}, st: LiveState, compId: number): any {
			return this.components.create(componentName, props, st, {'from': 'C', 'id': compId});
		}

		public removeComponentFromId(compId: number, fromDOM = false): void {
			this.components.getComponentTree().destructFromId(compId, fromDOM);
		}
	}

	// ##
	// ## ImplServiceContext
	// ##

	export class ImplServiceContext implements ServiceContext {
		private service: any;

		constructor(private ac: ImplApplicationContext, private serviceName: string, private serviceBaseUrl: string, cl: any) {
			this.service = new cl(this);
		}

		public getApplicationContext(): ApplicationContext {
			return this.ac;
		}

		public getServiceName(): string {
			return this.serviceName;
		}

		public getServiceBaseUrl(): string {
			return this.serviceBaseUrl;
		}

		public getOwnService(): any {
			return this.service;
		}

		public getService(serviceName): any {
			return this.ac.getService(serviceName);
		}

		public createComponent(componentName: string, props: {}, st: LiveState): any {
			return this.ac.createComponentFromServ(componentName, props, st, this);
		}

		public removeComponent(c: any, fromDOM = false): void {
			this.ac.removeComponent(c, fromDOM);
		}

		public hasLib(libName): boolean {
			return this.ac.hasLib(libName);
		}

		public includeLib(libName): boolean {
			return this.ac.includeLib(libName);
		}

		public requireLib(libName): void {
			this.ac.requireLib(libName);
		}

		public requireService(serviceName): void {
			this.ac.requireService(serviceName);
		}

		public requireComponent(componentName): void {
			this.ac.requireComponent(componentName);
		}
	}

	// ##
	// ## ImplComponentContext
	// ##

	export class ImplComponentContext implements ComponentContext {
		constructor(private ac: ImplApplicationContext, private ctc: ImplComponentTypeContext, private st: LiveState, private compId: number) {
		}

		public getApplicationContext(): ApplicationContext {
			return this.ac;
		}

		public getLiveState(): LiveState {
			return this.st;
		}

		public getComponentName(): string {
			return this.ctc.getComponentName();
		}

		public getComponentBaseUrl(): string {
			return this.ctc.getComponentBaseUrl();
		}

		public getTemplate(sel: string, elMap = {}): HTMLElement {
			return this.ctc.getTemplate(sel, elMap);
		}

		public createOwnComponent(props: {} = null, st: LiveState = null): any {
			return this.ctc.createOwnComponent(props, st ? st : this.st);
		}

		public createComponent(componentName: string, props: {} = null, st: LiveState = null): any {
			return this.ac.createComponentFromComp(componentName, props, st ? st : this.st, this.compId);
		}

		public removeComponent(c: any, fromDOM = false): void {
			this.ac.removeComponent(c, fromDOM);
		}

		public removeOwnComponent(fromDOM = false): void {
			this.ac.removeComponentFromId(this.compId, fromDOM);
		}

		public getService(serviceName): any {
			return this.ac.getService(serviceName);
		}

		public hasLib(libName): boolean {
			return this.ac.hasLib(libName);
		}

		public includeLib(libName): boolean {
			return this.ac.includeLib(libName);
		}

		public requireLib(libName): void {
			this.ac.requireLib(libName);
		}

		public requireService(serviceName): void {
			this.ac.requireService(serviceName);
		}

		public requireComponent(componentName): void {
			this.ac.requireComponent(componentName);
		}
	}

	// ##
	// ## ImplComponentTypeContext
	// ##

	export class ImplComponentTypeContext implements ComponentTypeContext {
		constructor(private ac: ImplApplicationContext, private componentName: string, private componentBaseUrl: string,
								private tplArr: {}, private tplSel: {}, private tplLab: {}) {
			// TODO Reference all labels in the l10n service
			// tplLab: {'lbl-id': 'The Label Key (= default value)'} where the label ID is a CSS class and the label key is
			// the key in JSON language files
		}

		public getComponentName(): string {
			return this.componentName;
		}

		public getComponentBaseUrl(): string {
			return this.componentBaseUrl;
		}

		public getTemplate(sel: string, elMap = {}): HTMLElement {
			if (this.tplSel[sel] === undefined)
				throw Error('Unknown template "' + sel + '" in component "' + this.componentName + '"');
			var el = <HTMLElement>this.tplArr[this.tplSel[sel]].cloneNode(true);
			TemplateParser.fillPlaceholders(el, elMap, this);
			this.fillLabels(el);
			return el;
		}

		public createOwnComponent(props: {}, st: LiveState): any {
			return this.ac.createComponent(this.componentName, props, st);
		}


		private fillLabels(el) {
			var list;
			for (var lblId in this.tplLab) {
				if (!this.tplLab.hasOwnProperty(lblId))
					continue;
				list = ImplComponentTypeContext.getElementsByClassName(lblId, el);
				if (list.length !== 1)
					continue;
				list[0].textContent = this.tplLab[lblId]; // TODO Use the l10n label in the current language here
			}
		}

		private static getElementsByClassName(className, fromElem) {
			if (fromElem.getElementsByClassName)
				return fromElem.getElementsByClassName(className);
			// - Fallback for IE8, thanks to http://code-tricks.com/javascript-get-element-by-class-name/
			var descendants = fromElem.getElementsByTagName('*'), i = -1, e, list = [];
			while (e = descendants[++i])
				((' ' + (e['class'] || e.className) + ' ').indexOf(' ' + className + ' ') !== -1) && list.push(e);
			return list;
		}
	}

	// ##
	// ## Bundles
	// ##

	export class Bundles {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
		}

		public register(bundlePath: string, bundleUrl: string, requireLib: string[], script: string, mainClassName: string) {
			if (this.map[bundlePath] !== undefined)
				throw Error('The bundle "' + bundlePath + '" is already registered');
			if (requireLib)
				this.ac.requireLib(requireLib);
			if (script)
				globalEval(script);
			var cl: any = null;
			if (mainClassName)
				cl = LoaderHelper.stringToClass(mainClassName);
			this.map[bundlePath] = cl ? new cl(this.ac, bundleUrl) : null;
		}

		public start(bundlePath, el) {
			var main = this.map[bundlePath];
			if (main === undefined)
				throw Error('Unknown bundle "' + bundlePath + '"');
			if (main === null)
				throw Error('Cannot start the bundle "' + bundlePath + '": it hasn\'t a main class');
			if (main.start === undefined)
				throw Error('Cannot start the bundle "' + bundlePath + '": the main class should have a start method');
			main.start(el);
		}
	}

	// ##
	// ## Libraries
	// ##

	export class Libraries {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
		}

		public register(libName: string, requireLib: string[], script: string) {
			if (this.map[libName] !== undefined)
				throw Error('The lib "' + libName + '" is already declared');
			this.map[libName] = {
				'requireLib': requireLib,
				'script': script,
				'loading': false
			};
		}

		public has(libName: string): boolean {
			return this.map[libName] !== undefined;
		}

		public load(libName: string, req: boolean): boolean {
			var prop = this.map[libName];
			if (prop === undefined) {
				if (req)
					throw Error('Unknown lib "' + libName + '"');
				return false;
			}
			if (prop === true)
				return true;
			if (prop['requireLib']) {
				if (prop['loading'])
					throw Error('A loop is detected in requireLib for "' + libName + '"');
				prop['loading'] = true;
				this.ac.requireLib(prop['requireLib']);
			}
			if (prop['script'] !== null)
				globalEval(prop['script']);
			this.map[libName] = true;
			return true;
		}
	}

	// ##
	// ## Services
	// ##

	export class Services {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
			this.coreRegister('woc.Log', 'woc.CoreLog');
			this.coreRegister('woc.Ajax', 'woc.CoreAjax');
			this.coreRegister('woc.Router', 'woc.CoreRouter');
		}

		public register(serviceName: string, serviceBaseUrl: string, aliasStrOrList: any, requireLib: string[], script: string) {
			var prop = {
				'name': serviceName,
				'baseUrl': serviceBaseUrl,
				'requireLib': requireLib,
				'script': script,
				'sc': null
			};
			if (aliasStrOrList) {
				var aliasList = typeof aliasStrOrList === 'string' ? [aliasStrOrList] : aliasStrOrList;
				var alias;
				for (var i = 0, len = aliasList.length; i < len; ++i) {
					alias = aliasList[i];
					if (this.map[alias] !== undefined)
						throw Error('The service "' + serviceName + '" cannot declare the alias "' + alias + '": already used');
					this.map[alias] = prop;
				}
			}
			if (this.map[serviceName] !== undefined)
				throw Error('The service "' + serviceName + '" is already declared');
			this.map[serviceName] = prop;
		}

		public get(serviceName: string): any {
			var sc = this.getServiceContext(serviceName);
			return sc.getOwnService();
		}

		public getServiceContext(serviceName: string): ImplServiceContext {
			var prop = this.map[serviceName];
			if (prop === undefined)
				throw Error('Unknown service "' + serviceName + '"');
			if (prop['sc'] === null) {
				if (prop['requireLib'])
					this.ac.requireLib(prop['requireLib']);
				if (prop['script'] !== null)
					globalEval(prop['script']);
				var cl = LoaderHelper.stringToClass(prop['coreClass'] || prop['name']);
				prop['sc'] = new ImplServiceContext(this.ac, prop['name'], prop['baseUrl'], cl);
			}
			return prop['sc'];
		}

		private coreRegister(serviceName: string, coreClass: string) {
			this.register(serviceName, null, null, null, null);
			this.map[serviceName]['coreClass'] = coreClass;
		}
	}

	// ##
	// ## Components
	// ##

	export class Components {

		private log;
		private tplParser: TemplateParser;
		private compTree: ComponentTree;
		private map = {};

		constructor(private ac: ImplApplicationContext) {
			this.log = ac.getService('woc.Log');
			this.tplParser = new TemplateParser();
			this.compTree = new ComponentTree();
		}

		public getComponentTree(): ComponentTree {
			return this.compTree;
		}

		public register(componentName: string, componentBaseUrl: string, requireLib: string[], script: string, tplStr: string) {
			if (this.map[componentName] !== undefined)
				throw Error('Conflict for component "' + componentName + '"');
			var tplArr, tplSel, tplLab;
			if (!tplStr) {
				tplArr = null;
				tplSel = null;
				tplLab = null;
			} else {
				tplArr = this.tplParser.parse(componentName, tplStr);
				tplSel = this.tplParser.getBySelMap();
				tplLab = this.tplParser.getLabels();
			}
			this.map[componentName] = {
				'requireLib': requireLib,
				'script': script,
				'tplArr': tplArr,
				'tplSel': tplSel,
				'tplLab': tplLab,
				'baseUrl': componentBaseUrl,
				'cc': null
			};
		}

		public create(componentName: string, props: {}, st: LiveState, compTreeArg: {}): Component {
			var id = this.compTree.newPlaceholder(componentName, compTreeArg);
			var cc = new ImplComponentContext(this.ac, this.getComponentTypeContext(componentName), st, id);
			var cl = LoaderHelper.stringToClass(componentName);
			var c = new cl(cc, props ? props : {});
			this.compTree.setComp(id, c);
			return c;
		}

		public getComponentTypeContext(componentName: string): ImplComponentTypeContext {
			var prop = this.map[componentName];
			if (prop === undefined)
				throw Error('Unknown component "' + componentName + '"');
			if (prop['cc'] === null) {
				if (prop['requireLib'])
					this.ac.requireLib(prop['requireLib']);
				if (prop['script'] !== null)
					globalEval(prop['script']);
				prop['cc'] = new ImplComponentTypeContext(this.ac, componentName, prop['baseUrl'], prop['tplArr'], prop['tplSel'], prop['tplLab']);
			}
			return prop['cc'];
		}
	}

	// ##
	// ## LoaderHelper
	// ##

	class LoaderHelper {
		public static stringToClass(s: string): any {
			var arr = s.split('.');
			var fn: any = window || this;
			for (var i = 0, len = arr.length; i < len; ++i) {
				if (fn === undefined)
					throw Error('Class not found: "' + s + '"');
				fn = fn[arr[i]];
			}
			if (typeof fn !== 'function')
				throw Error('Class not found: "' + s + '"');
			return fn;
		}

		public static isArray(data) {
			if (Array.isArray)
				return Array.isArray(data);
			return Object.prototype.toString.call(data) === '[object Array]'; // before EcmaScript 5.1
		}
	}
}
