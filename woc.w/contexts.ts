/// <reference path="definitions.ts" />
/// <reference path="comptree.ts" />
/// <reference path="loader.ts" />
'use strict';

module woc {

	// ##
	// ## Functions
	// ##

	export function makeApplicationContext(properties: AppProperties, firstRelUrl: string): ApplicationContext {
		return new ImplApplicationContext(properties, firstRelUrl);
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

		constructor(public appProperties: AppProperties, firstRelUrl: string) {
			if (Object.freeze)
				Object.freeze(appProperties);
			this.libraries = new Libraries(this);
			this.services = new Services(this);
			this.components = new Components(this);
			this.bundles = new Bundles(this);
			this.loader = new Loader(this, this.libraries, this.services, this.components, this.bundles);
		}

		// --
		// -- ApplicationContext
		// --

		public getService(serviceName): any {
			return this.services.get(serviceName);
		}

		public createComponent(componentName: string, props: {}, st: LiveState): any {
			return this.components.create(componentName, props, st, {'from': 'A'});
		}

		public removeComponent(c: any, fromDOM = false): void {
			if (Array.isArray(c)) {
				var compTree = this.components.getComponentTree();
				for (var i = 0, len = c.length; i < len; ++i)
					compTree.destruct(c[i], fromDOM);
			} else
				this.components.getComponentTree().destruct(c, fromDOM);
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
		public loadBundle(bundlePath: string, opt = {}): Promise<void> {
			return this.loader.loadBundle(bundlePath, opt['start'], opt['version'], opt['autoLoadCss'], opt['w']);
		}

		public hasLibrary(libName: any): boolean {
			return this.libraries.has(libName);
		}

		public includeLib(libName): boolean {
			return this.libraries.load(libName, false);
		}

		public evalLibrary(libName: any): void {
			this.libraries.load(libName, true);
		}

		public evalService(serviceName): void {
			this.services.getServiceContext(serviceName);
		}

		public evalComponent(componentName): void {
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
	// ## ServiceContext
	// ##

	export class ImplServiceContext implements ServiceContext {
		private service: any;

		constructor(private ac: ImplApplicationContext, private serviceName: string, private serviceBaseUrl: string, cl: any) {
			this.service = new cl(this);
		}

		public getApplicationContext(): ApplicationContext {
			return this.ac;
		}

		public getOwnName(): string {
			return this.serviceName;
		}

		public getOwnBaseUrl(): string {
			return this.serviceBaseUrl;
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

		public hasLibrary(libName): boolean {
			return this.ac.hasLibrary(libName);
		}

		public includeLib(libName): boolean {
			return this.ac.includeLib(libName);
		}

		public evalLibrary(libName): void {
			this.ac.evalLibrary(libName);
		}

		public evalService(serviceName): void {
			this.ac.evalService(serviceName);
		}

		public evalComponent(componentName): void {
			this.ac.evalComponent(componentName);
		}

		public getOwnService(): any {
			return this.service;
		}
	}

	// ##
	// ## ImplComponentTypeContext
	// ##

	export class ImplComponentTypeContext implements ComponentTypeContext {
		constructor(private ac: ImplApplicationContext, private componentName: string, private componentBaseUrl: string) {
		}

		public getApplicationContext(): ApplicationContext {
			return this.ac;
		}

		public getOwnName(): string {
			return this.componentName;
		}

		public getOwnBaseUrl(): string {
			return this.componentBaseUrl;
		}
	}

	// ##
	// ## ImplComponentContext
	// ##

	export class ImplComponentContext implements ComponentContext {
		public appProperties: AppProperties; // Dynamically set on the prototype

		constructor(private ac: ImplApplicationContext, private ctc: ImplComponentTypeContext, private st: LiveState, private compId: number) {
		}

		public getService(serviceName): any {
			return this.ac.getService(serviceName);
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

		public hasLibrary(libName: any): boolean {
			return this.ac.hasLibrary(libName);
		}

		public evalLibrary(libName: any): void {
			this.ac.evalLibrary(libName);
		}

		public evalService(serviceName: any): void {
			this.ac.evalService(serviceName);
		}

		public evalComponent(componentName: any): void {
			this.ac.evalComponent(componentName);
		}

		public getOwnName(): string {
			return this.ctc.getOwnName();
		}

		public getOwnBaseUrl(): string {
			return this.ctc.getOwnBaseUrl();
		}

		public getLiveState(): LiveState {
			return this.st;
		}

//		public getApplicationContext(): ApplicationContext {
//			return this.ac;
//		}
	}

	// ##
	// ## Bundles
	// ##

	export class Bundles {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
		}

		public register(bundlePath: string, bundleUrl: string, useLibrary: string[], script: string, mainClassName: string) {
			if (this.map[bundlePath] !== undefined)
				throw Error('The bundle "' + bundlePath + '" is already registered');
			if (useLibrary)
				this.ac.evalLibrary(useLibrary);
			if (script)
				globalEval(script);
			if (mainClassName) {
				var Cl = toClass(mainClassName);
				this.map[bundlePath] = new Cl(this.ac, bundleUrl);
			} else
				this.map[bundlePath] = null;
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

		public register(libName: string, useLibrary: string[], script: string) {
			if (this.map[libName] !== undefined)
				throw Error('The lib "' + libName + '" is already declared');
			this.map[libName] = {
				'useLibrary': useLibrary,
				'script': script,
				'loading': false
			};
		}

		public has(libName: any): boolean {
			if (typeof libName === 'string')
				return this.map[libName] !== undefined;
			for (var i = 0, len = libName.length; i < len; ++i) {
				if (this.map[libName[i]] === undefined)
					return false;
			}
			return true;
		}

		public load(libName: any, req: boolean): boolean {
			if (typeof libName === 'string')
				return this.loadSingle(libName, req);
			var done = true;
			for (var i = 0, len = libName.length; i < len; ++i)
				done = this.loadSingle(libName[i], req) && done;
			return done;
		}

		private loadSingle(libName: string, req: boolean): boolean {
			var prop = this.map[libName];
			if (prop === undefined) {
				if (req)
					throw Error('Unknown lib "' + libName + '"');
				return false;
			}
			if (prop === true)
				return true;
			if (prop['useLibrary']) {
				if (prop['loading'])
					throw Error('A loop is detected in useLibrary for "' + libName + '"');
				prop['loading'] = true;
				this.ac.evalLibrary(prop['useLibrary']);
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

		public register(serviceName: string, serviceBaseUrl: string, aliasStrOrList: any, useLibrary: string[], script: string) {
			var prop = {
				'name': serviceName,
				'baseUrl': serviceBaseUrl,
				'useLibrary': useLibrary,
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
				if (prop['useLibrary'])
					this.ac.evalLibrary(prop['useLibrary']);
				if (prop['script'] !== null)
					globalEval(prop['script']);
				var cl = toClass(prop['coreClass'] || prop['name']);
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
		private compTree: ComponentTree;
		private map = {};

		constructor(private ac: ImplApplicationContext) {
			this.log = ac.getService('woc.Log');
			this.compTree = new ComponentTree();
		}

		public getComponentTree(): ComponentTree {
			return this.compTree;
		}

		public register(componentName: string, componentBaseUrl: string, useLibrary: string[], script: string, tplStr: string,
				templateEngine: string) {
			if (this.map[componentName] !== undefined)
				throw Error('Conflict for component "' + componentName + '"');
			this.map[componentName] = {
				'useLibrary': useLibrary,
				'script': script,
				'tplStr': tplStr,
				'baseUrl': componentBaseUrl,
				'templateEngine': templateEngine,
				'ctc': null
			};
		}

		public create(componentName: string, props: {}, st: LiveState, compTreeArg: {}): Component {
			var prop = this.map[componentName];
			if (prop === undefined)
				throw Error('Unknown component "' + componentName + '"');
			var id = this.compTree.newPlaceholder(componentName, compTreeArg);
			var ctc = this.getComponentTypeContext(componentName);
			var cc = new prop['CC'](this.ac, ctc, st, id);
			var Cl = toClass(componentName);
			var c = new Cl(cc, props ? props : {});
			this.compTree.setComp(id, c);
			return c;
		}

		public getComponentTypeContext(componentName: string): ImplComponentTypeContext {
			var prop = this.map[componentName];
			if (prop === undefined)
				throw Error('Unknown component "' + componentName + '"');
			if (prop['ctc'] === null) {
				if (prop['useLibrary'])
					this.ac.evalLibrary(prop['useLibrary']);
				if (prop['script'] !== null)
					globalEval(prop['script']);
				this.makeContexts(componentName, prop);
			}
			return prop['ctc'];
		}

		private makeContexts(componentName: string, prop) {
			// - Make an instance of ComponentTypeContext
			var ctc = new ImplComponentTypeContext(this.ac, componentName, prop['baseUrl']);
			if (!prop['templateEngine']) {
				prop['ctc'] = ctc;
				prop['CC'] = ImplComponentContext;
				return;
			}
			prop['ctc'] = ctc;
			// - Make a new context class from methods and ImplComponentTypeContext
			var CC = function (ac: ImplApplicationContext, ctc: ImplComponentTypeContext, st: LiveState, compId: number) {
				ImplComponentContext.call(this, ac, ctc, st, compId);
			};
			CC.prototype = Object.create(ImplComponentContext.prototype);
			CC.prototype.appProperties = this.ac.appProperties;
			var tplEng: TemplateEngineService = this.ac.getService(prop['templateEngine']);
			var methods = tplEng.makeProcessor(ctc, prop['tplStr']).getContextMethods();
			for (var k in methods) {
				if (methods.hasOwnProperty(k))
					CC.prototype[k] = methods[k];
			}
			prop['CC'] = CC;
		}
	}
}
