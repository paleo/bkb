/// <reference path="definitions.ts" />
/// <reference path="comptree.ts" />
/// <reference path="loader.ts" />
'use strict';

module woc {

	// ##
	// ## Functions
	// ##

	export function makeApplicationContext(cfg: AppConfig): ApplicationContext {
		return new ImplApplicationContext(cfg);
	}

	// ##
	// ## Libraries
	// ##

	export class Libraries {
		private ac: ImplApplicationContext;
		private map = {};

		constructor(ac: any) {
			this.ac = ac;
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
		private ac: ImplApplicationContext;
		private ImplServiceContext: any;
		private map = {};

		constructor(ac: any) {
			this.ac = ac;
			this.ImplServiceContext = Services.mergeTraits(ac);
			this.coreRegister('woc.Log', 'woc.CoreLog');
			this.coreRegister('woc.Ajax', 'woc.CoreAjax');
			this.coreRegister('woc.Router', 'woc.CoreRouter');
		}

		public register(serviceName: string, serviceBaseUrl: string, aliasStrOrList: any, useApp: boolean, useLibrary: string[],
										useService: string[], useComponent: string[], script: string) {
			var prop = {
				'name': serviceName,
				'baseUrl': serviceBaseUrl,
				'useApplication': useApp,
				'useLibrary': useLibrary,
				'useService': useService,
				'useComponent': useComponent,
				'script': script,
				'sc': null,
				's': null
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
			this.makeServiceReady(serviceName);
			return this.map[serviceName]['s'];
		}

		public getServiceContext(serviceName: string): ServiceContext {
			this.makeServiceReady(serviceName);
			return this.map[serviceName]['sc'];
		}

		private makeServiceReady(serviceName: string) {
			var prop = this.map[serviceName];
			if (prop === undefined)
				throw Error('Unknown service "' + serviceName + '"');
			if (prop['sc'] !== null)
				return;
			if (prop['useLibrary'])
				this.ac.evalLibrary(prop['useLibrary']);
			if (prop['script'] !== null)
				globalEval(prop['script']);
			var cl = toClass(prop['coreClass'] || prop['name']);
			prop['sc'] = new this.ImplServiceContext(prop['name'], prop['baseUrl'], prop['useLibrary'], prop['useService'],
				prop['useComponent'], prop['coreClass'] ? false : true);
			prop['s'] = prop['useApplication'] ? new cl(this.ac, prop['sc']) : new cl(prop['sc']);
		}

		private coreRegister(serviceName: string, coreClass: string) {
			this.register(serviceName, null, null, true, null, null, null, null);
			this.map[serviceName]['coreClass'] = coreClass;
		}

		private static mergeTraits(ac: ImplApplicationContext): any {
			var NewCl = function (ownName: string, ownBaseUrl: string, useLibrary: string[], useService: string[],
														useComponent: string[], restrictedAccess: boolean) {
				ThingContextTrait.call(this, ownName, ownBaseUrl, useLibrary, useService, useComponent, restrictedAccess);
				ServiceContextTrait.call(this);
			};
			NewCl.prototype['ac'] = ac;
			NewCl.prototype['appConfig'] = ac.appConfig;
			ContextHelper.copyMembers(ThingContextTrait.prototype, NewCl.prototype);
			ContextHelper.copyMembers(ServiceContextTrait.prototype, NewCl.prototype);
			ContextHelper.freeze(NewCl.prototype);
			return NewCl;
		}
	}

	// ##
	// ## Components
	// ##

	export class Components {
		private log;
		private compTree: ComponentTree;
		private map = {};
		private ac: ImplApplicationContext;

		constructor(ac: any) {
			this.ac = ac;
			this.log = ac.getService('woc.Log');
			this.compTree = new ComponentTree();
		}

		public getComponentTree(): ComponentTree {
			return this.compTree;
		}

		public register(componentName: string, componentBaseUrl: string, useApp: boolean, useLibrary: string[], useService: string[],
										useComponent: string[], script: string, tplStr: string, templateEngine: string) {
			if (this.map[componentName] !== undefined)
				throw Error('Conflict for component "' + componentName + '"');
			this.map[componentName] = {
				'useApplication': useApp,
				'useLibrary': useLibrary,
				'useService': useService,
				'useComponent': useComponent,
				'script': script,
				'tplStr': tplStr,
				'baseUrl': componentBaseUrl,
				'templateEngine': templateEngine,
				'ctc': null,
				'CC': null
			};
		}

		public create(componentName: string, props: {}, st: LiveState, compTreeArg: {}): Component {
			var prop = this.map[componentName];
			if (prop === undefined)
				throw Error('Unknown component "' + componentName + '"');
			var id = this.compTree.newPlaceholder(componentName, compTreeArg);
			this.makeTypeContextsReady(componentName, prop);
			var cc = new prop['CC'](st, id);
			var Cl = toClass(componentName);
			var c = prop['useApplication'] ? new Cl(this.ac, cc, props ? props : {}) : new Cl(cc, props ? props : {});
			this.compTree.setComp(id, c);
			return c;
		}

		public getComponentTypeContext(componentName: string): ComponentTypeContext {
			var prop = this.map[componentName];
			if (prop === undefined)
				throw Error('Unknown component "' + componentName + '"');
			this.makeTypeContextsReady(componentName, prop);
			return prop['ctc'];
		}

		private makeTypeContextsReady(componentName: string, prop): void {
			if (prop['ctc'] === null) {
				if (prop['useLibrary'])
					this.ac.evalLibrary(prop['useLibrary']);
				if (prop['script'] !== null)
					globalEval(prop['script']);
				this.makeContexts(componentName, prop);
			}
		}

		private makeContexts(componentName: string, prop) {
			prop['ctc'] = new ImplComponentTypeContext(componentName, prop['baseUrl']);
			var methods;
			if (prop['templateEngine']) {
				var tplEng: TemplateEngineService = this.ac.getService(prop['templateEngine']);
				methods = tplEng.makeProcessor(prop['ctc'], prop['tplStr']).getContextMethods();
			} else
				methods = null;
			prop['CC'] = Components.mergeTraits(this.ac, methods, componentName, prop['baseUrl'], prop['useLibrary'],
				prop['useService'], prop['useComponent'], true);
		}

		private static mergeTraits(ac: ImplApplicationContext, methods: {}, ownName: string, ownBaseUrl: string, useLibrary: string[],
															 useService: string[], useComponent: string[], restrictedAccess: boolean): any {
			var NewCl = function (st: LiveState, compId: number) {
				ComponentContextTrait.call(this, st, compId);
			};
			ThingContextTrait.call(NewCl.prototype, ownName, ownBaseUrl, useLibrary, useService, useComponent, restrictedAccess);
			NewCl.prototype['ac'] = ac;
			NewCl.prototype['appProperties'] = ac.appProperties;
			ContextHelper.copyMembers(ComponentContextTrait.prototype, NewCl.prototype);
			ContextHelper.copyMembers(ThingContextTrait.prototype, NewCl.prototype);
			if (methods)
				ContextHelper.copyMembers(methods, NewCl.prototype);
			ContextHelper.freeze(NewCl.prototype);
			return NewCl;
		}
	}

	// ##
	// ## ImplApplicationContext
	// ##

	class ImplApplicationContext implements ApplicationContext {

		private libraries: Libraries;
		private services: Services;
		private components: Components;
		private loader: Loader;

		public appProperties: AppProperties;

		constructor(public appConfig: AppConfig) {
			this.appProperties = {
				wocUrl: appConfig.wocUrl,
				baseUrl: appConfig.baseUrl
			};
			ContextHelper.freeze(appConfig);
			ContextHelper.freeze(this.appProperties);
			this.libraries = new Libraries(this);
			this.services = new Services(this);
			this.components = new Components(this);
			this.loader = new Loader(this, this.libraries, this.services, this.components);
		}

		// --
		// -- ApplicationContext
		// --

		public loadBundles(optList: BundleLoadingOptions[]): Promise<void> {
			if (optList.length === 1)
				return this.loader.loadBundle(optList[0]);
			return <any>Promise.all(optList.map((opt: BundleLoadingOptions) => {
				return this.loader.loadBundle(opt);
			}));
		}

		public start(el: HTMLElement, startingPointName: string, preload?: BundleLoadingOptions[]): Promise<void> {
			var p: Promise<void> = preload ? this.loadBundles(preload) : Promise.resolve<void>();
			return p.then(() => {
				var serv: StartingPointService = this.services.get(startingPointName);
				if (serv.start === undefined)
					throw Error('Cannot use the starting point service "' + startingPointName + '", it should implement Woc.StartingPointService');
				serv.start(el);
			});
		}

		public getDebugTree(): {} {
			return this.components.getComponentTree().getTreeCopy();
		}

		// --
		// -- Internal
		// --

		public getService(serviceName: string): any {
			return this.services.get(serviceName);
		}

		public createComponentFromServ(componentName: string, props: {}, st: LiveState, sc: ServiceContext): any {
			return this.components.create(componentName, props, st, {'from': 'S', 'sc': sc});
		}

		public createComponentFromComp(componentName: string, props: {}, st: LiveState, compId: number): any {
			return this.components.create(componentName, props, st, {'from': 'C', 'id': compId});
		}

		public removeComponentFromId(compId: number, fromDOM = false): void {
			this.components.getComponentTree().destructFromId(compId, fromDOM);
		}

		public removeComponent(c: any, fromDOM = false): void {
			if (Array.isArray(c)) {
				var compTree = this.components.getComponentTree();
				for (var i = 0, len = c.length; i < len; ++i)
					compTree.destruct(c[i], fromDOM);
			} else
				this.components.getComponentTree().destruct(c, fromDOM);
		}

		public hasLibrary(libName: any): boolean {
			if (typeof libName === 'string')
				return this.libraries.has(libName);
			for (var i = 0, len = libName.length; i < len; ++i) {
				if (!this.libraries.has(libName))
					return false;
			}
			return true;
		}

		public evalLibrary(libName: any): void {
			if (typeof libName === 'string')
				this.libraries.load(libName, true);
			else {
				for (var i = 0, len = libName.length; i < len; ++i)
					this.libraries.load(libName[i], true);
			}
		}

		public evalService(serviceName: any): void {
			if (typeof serviceName === 'string')
				this.services.getServiceContext(serviceName);
			else {
				for (var i = 0, len = serviceName.length; i < len; ++i)
					this.services.getServiceContext(serviceName[i]);
			}
		}

		public evalComponent(componentName: any): void {
			if (typeof componentName === 'string')
				this.components.getComponentTypeContext(componentName);
			else {
				for (var i = 0, len = componentName.length; i < len; ++i)
					this.components.getComponentTypeContext(componentName[i]);
			}
		}
	}

	// ##
	// ## ThingContextTrait
	// ##

	class ThingContextTrait {
		private ac: ImplApplicationContext;
		private authLibraries: {};
		private authServices: {};
		private authComponents: {};

		constructor(private ownName: string, private ownBaseUrl: string, useLibrary: string[], useService: string[],
								useComponent: string[], private restrictedAccess: boolean) {
			this.authLibraries = ContextHelper.toSet(useLibrary);
			this.authServices = ContextHelper.toSet(useService);
			this.authComponents = ContextHelper.toSet(useComponent);
		}

		public getService(serviceName: string): any {
			if (this.restrictedAccess && !this.authServices[serviceName])
				throw Error('In "' + this.ownName + '", unauthorized access to the service "' + serviceName + '"');
			return this.ac.getService(serviceName);
		}

		public removeComponent(c: any, fromDOM = false): void {
			this.ac.removeComponent(c, fromDOM);
		}

		public hasLibrary(libName: any): boolean {
			if (this.restrictedAccess && !this.authLibraries[libName])
				throw Error('In "' + this.ownName + '", unauthorized access to the library "' + libName + '"');
			return this.ac.hasLibrary(libName);
		}

		public evalLibrary(libName: any): void {
			if (this.restrictedAccess && !this.authLibraries[libName])
				throw Error('In "' + this.ownName + '", unauthorized access to the library "' + libName + '"');
			this.ac.evalLibrary(libName);
		}

		public evalService(serviceName: any): void {
			if (this.restrictedAccess && !this.authServices[serviceName])
				throw Error('In "' + this.ownName + '", unauthorized access to the service "' + serviceName + '"');
			this.ac.evalService(serviceName);
		}

		public evalComponent(componentName: any): void {
			if (this.restrictedAccess && !this.authComponents[componentName])
				throw Error('In "' + this.ownName + '", unauthorized access to the component "' + componentName + '"');
			this.ac.evalComponent(componentName);
		}

		public getOwnName(): string {
			return this.ownName;
		}

		public getOwnBaseUrl(): string {
			return this.ownBaseUrl;
		}
	}

	// ##
	// ## ServiceContextTrait
	// ##

	class ServiceContextTrait {
		private restrictedAccess: boolean;
		private ownName: string;
		private authComponents: {};
		private ac: ImplApplicationContext;

		public createComponent(componentName: string, props: {}, st: LiveState): any {
			if (this.restrictedAccess && !this.authComponents[componentName])
				throw Error('In "' + this.ownName + '", unauthorized access to the component "' + componentName + '"');
			return this.ac.createComponentFromServ(componentName, props, st, <any>this);
		}
	}

	// ##
	// ## ImplComponentTypeContext
	// ##

	class ImplComponentTypeContext implements ComponentTypeContext {
		constructor(private ownName: string, private ownBaseUrl) {
		}

		public getOwnName(): string {
			return this.ownName;
		}

		public getOwnBaseUrl(): string {
			return this.ownBaseUrl;
		}
	}

	// ##
	// ## ImplComponentContext
	// ##

	class ComponentContextTrait {
		private restrictedAccess: boolean;
		private ownName: string;
		private authComponents: {};
		private ac: ImplApplicationContext;

		constructor(private st: LiveState, private compId: number) {
		}

		public createComponent(componentName: string, props: {} = null, st: LiveState = null): any {
			if (this.restrictedAccess && !this.authComponents[componentName])
				throw Error('In "' + this.ownName + '", unauthorized access to the component "' + componentName + '"');
			return this.ac.createComponentFromComp(componentName, props, st ? st : this.st, this.compId);
		}

		public getLiveState(): LiveState {
			return this.st;
		}
	}

	// ##
	// ## ContextHelper
	// ##

	class ContextHelper {
		public static toSet(names: string[]): {[index: string]: boolean} {
			var s: any = {};
			if (names) {
				for (var i = 0, len = names.length; i < len; ++i)
					s[names[i]] = true;
			}
			return s;
		}

		public static copyMembers(from: any, to: any): void {
			for (var k in from) {
				if (from.hasOwnProperty(k)) {
					if (to[k] !== undefined)
						throw Error('Cannot add member "' + k + '" to the destination class');
					to[k] = from[k];
				}
			}
		}

		public static freeze: (obj) => void = Object.freeze || (() => {});
	}
}
