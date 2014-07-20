/// <reference path="definitions.ts" />
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
			if (Array.isArray(c)) {
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
		public loadBundle(bundlePath: string, opt = {}): Promise<void> {
			return this.loader.loadBundle(bundlePath, opt['start'], opt['version'], opt['autoLoadCss'], opt['w']);
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
	// ## ImplComponentTypeContext
	// ##

	export class ImplComponentTypeContext implements ComponentTypeContext {
		constructor(private ac: ImplApplicationContext, private componentName: string, private componentBaseUrl: string) {
		}

		public getApplicationContext(): ApplicationContext {
			return this.ac;
		}

		public getComponentName(): string {
			return this.componentName;
		}

		public getComponentBaseUrl(): string {
			return this.componentBaseUrl;
		}

		public createOwnComponent(props: {}, st: LiveState): any {
			return this.ac.createComponent(this.componentName, props, st);
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

		public register(componentName: string, componentBaseUrl: string, requireLib: string[], script: string, tplStr: string,
				templateEngine: string) {
			if (this.map[componentName] !== undefined)
				throw Error('Conflict for component "' + componentName + '"');
			this.map[componentName] = {
				'requireLib': requireLib,
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
				if (prop['requireLib'])
					this.ac.requireLib(prop['requireLib']);
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
			var tplEng: TemplateEngineService = this.ac.getService(prop['templateEngine']);
			var methods = tplEng.makeProcessor(ctc, prop['tplStr']).getContextMethods();
			for (var k in methods) {
				if (methods.hasOwnProperty(k))
					ctc[k] = methods[k];
			}
			prop['ctc'] = ctc;
			// - Make a new context class from methods and ImplComponentTypeContext
			var CC = function (ac: ImplApplicationContext, ctc: ImplComponentTypeContext, st: LiveState, compId: number) {
				ImplComponentContext.call(this, ac, ctc, st, compId);
			};
			CC.prototype = Object.create(ImplComponentContext.prototype);
			for (var k in methods) {
				if (methods.hasOwnProperty(k))
					CC.prototype[k] = methods[k];
			}
			prop['CC'] = CC;
		}
	}
}
