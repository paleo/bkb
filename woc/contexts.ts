/// <reference path="definitions.ts" />
/// <reference path="comptree.ts" />
/// <reference path="loader.ts" />
'use strict';

module Woc {

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

    public register(libName: string, useLibraries: string[], script: string) {
      if (this.map[libName] !== undefined)
        throw Error('The lib "' + libName + '" is already declared');
      this.map[libName] = {
        'useLibraries': useLibraries,
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
      if (prop['useLibraries']) {
        if (prop['loading'])
          throw Error('A loop is detected in useLibraries for "' + libName + '"');
        prop['loading'] = true;
        this.ac.evalLibrary(prop['useLibraries']);
      }
      if (prop['script'] !== null)
        globalEval(prop['script']);
      this.map[libName] = true;
      return true;
    }
  }

  // ##
  // ## Singletons
  // ##

  export class Singletons {
    private ac: ImplApplicationContext;
    private ImplContext: any;
    private map = {};
    private byBundle: {};

    constructor(ac: any, private label: string) {
      this.ac = ac;
      this.ImplContext = Singletons.mergeTraits(ac);
      this.coreRegister('Woc.Ajax', 'Woc.CoreAjax');
    }

    public register(name: string, baseUrl: string, useApp: boolean, useLibraries: string[], useServices: string[],
                    useComponents: string[], script: string, aliasStrOrList: any = null) {
      if (this.map[name] !== undefined)
        throw Error('The ' + this.label + ' "' + name + '" is already declared');
      var prop = {
        'name': name,
        'baseUrl': baseUrl,
        'useApplication': useApp,
        'useLibraries': useLibraries,
        'useServices': useServices,
        'useComponents': useComponents,
        'script': script,
        'context': null,
        's': null
      };
      if (aliasStrOrList) {
        var aliasList = typeof aliasStrOrList === 'string' ? [aliasStrOrList] : aliasStrOrList;
        var alias;
        for (var i = 0, len = aliasList.length; i < len; ++i) {
          alias = aliasList[i];
          if (this.map[alias] !== undefined)
            throw Error('The ' + this.label + ' "' + name + '" cannot declare the alias "' + alias + '": already used');
          this.map[alias] = prop;
        }
      }
      this.map[name] = prop;
    }

    public addForInit(bundleName: string, initName: string) {
      if (this.byBundle === undefined)
        this.byBundle = {};
      if (this.byBundle[bundleName] === undefined)
        this.byBundle[bundleName] = [];
      this.byBundle[bundleName].push(initName);
    }

    public init(bundleName: string) {
      if (this.byBundle[bundleName] === undefined)
        return;
      var list = this.byBundle[bundleName];
      for (var i = 0, len = list.length; i < len; ++i) {
        this.get(list[i]).init();
        delete this.map[list[i]];
      }
      delete this.byBundle[bundleName];
    }

    public get(name: string): any {
      this.makeReady(name);
      return this.map[name]['s'];
    }

    public getContext<U>(name: string): U {
      this.makeReady(name);
      return this.map[name]['context'];
    }

    private makeReady(name: string) {
      var prop = this.map[name];
      if (prop === undefined)
        throw Error('Unknown ' + this.label + ' "' + name + '"');
      if (prop['context'] !== null)
        return;
      if (prop['useLibraries'])
        this.ac.evalLibrary(prop['useLibraries']);
      if (prop['script'] !== null)
        globalEval(prop['script']);
      var cl = toClass(prop['coreClass'] || prop['name']);
      prop['context'] = new this.ImplContext(prop['name'], prop['baseUrl'], prop['useLibraries'], prop['useServices'],
        prop['useComponents'], prop['coreClass'] ? false : true);
      prop['s'] = prop['useApplication'] ? new cl(this.ac, prop['context']) : new cl(prop['context']);
    }

    private coreRegister(name: string, coreClass: string) {
      this.register(name, null, true, null, null, null, null, null);
      this.map[name]['coreClass'] = coreClass;
    }

    private static mergeTraits(ac: ImplApplicationContext): any {
      var ServContext = function (name: string, baseUrl: string, useLibraries: string[], useServices: string[],
                            useComponents: string[], restrictedAccess: boolean) {
        ThingContextTrait.call(this, name, baseUrl, useLibraries, useServices, useComponents, restrictedAccess);
        SingletonContextTrait.call(this);
      };
      ServContext.prototype['ac'] = ac;
      ServContext.prototype['appConfig'] = ac.appConfig;
      ContextHelper.copyMembers(ThingContextTrait.prototype, ServContext.prototype);
      ContextHelper.copyMembers(SingletonContextTrait.prototype, ServContext.prototype);
      ContextHelper.freeze(ServContext.prototype);
      return ServContext;
    }
  }

  // ##
  // ## Components
  // ##

  export class Components {
    private compTree: ComponentTree;
    private map = {};
    private ac: ImplApplicationContext;

    constructor(ac: any) {
      this.ac = ac;
      this.compTree = new ComponentTree();
    }

    public getComponentTree(): ComponentTree {
      return this.compTree;
    }

    public register(componentName: string, componentBaseUrl: string, useApp: boolean, useLibraries: string[], useServices: string[],
                    useComponents: string[], script: string, tplStr: string, templateEngine: string) {
      if (this.map[componentName] !== undefined)
        throw Error('Conflict for component "' + componentName + '"');
      this.map[componentName] = {
        'useApplication': useApp,
        'useLibraries': useLibraries,
        'useServices': useServices,
        'useComponents': useComponents,
        'script': script,
        'tplStr': tplStr,
        'baseUrl': componentBaseUrl,
        'templateEngine': templateEngine,
        'ctc': null,
        'CC': null
      };
    }

    public create(componentName: string, props: {}, compTreeArg: {}): Component {
      var prop = this.map[componentName];
      if (prop === undefined)
        throw Error('Unknown component "' + componentName + '"');
      var id = this.compTree.newPlaceholder(componentName, compTreeArg);
      this.makeTypeContextsReady(componentName, prop);
      var cc = new prop['CC'](id);
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
        if (prop['useLibraries'])
          this.ac.evalLibrary(prop['useLibraries']);
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
      prop['CC'] = Components.mergeTraits(this.ac, methods, componentName, prop['baseUrl'], prop['useLibraries'],
        prop['useServices'], prop['useComponents'], true);
    }

    private static mergeTraits(ac: ImplApplicationContext, methods: {}, name: string, baseUrl: string, useLibraries: string[],
                               useServices: string[], useComponents: string[], restrictedAccess: boolean): any {
      var CompContext = function (compId: number) {
        ComponentContextTrait.call(this, compId);
      };
      ThingContextTrait.call(CompContext.prototype, name, baseUrl, useLibraries, useServices, useComponents, restrictedAccess);
      CompContext.prototype['ac'] = ac;
      CompContext.prototype['appProperties'] = ac.appProperties;
      ContextHelper.copyMembers(ComponentContextTrait.prototype, CompContext.prototype);
      ContextHelper.copyMembers(ThingContextTrait.prototype, CompContext.prototype);
      if (methods)
        ContextHelper.copyMembers(methods, CompContext.prototype);
      ContextHelper.freeze(CompContext.prototype);
      return CompContext;
    }
  }

  // ##
  // ## ImplApplicationContext
  // ##

  class ImplApplicationContext implements ApplicationContext {

    private libraries: Libraries;
    private services: Singletons;
    private initializers: Singletons;
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
      this.services = new Singletons(this, 'service');
      this.initializers = new Singletons(this, 'initializer');
      this.components = new Components(this);
      this.loader = new Loader(this, this.libraries, this.services, this.initializers, this.components);
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

    public createComponentFromServ(componentName: string, props: {}, sc: ServiceContext): any {
      return this.components.create(componentName, props, {'from': 'S', 'sc': sc});
    }

    public createComponentFromComp(componentName: string, props: {}, compId: number): any {
      return this.components.create(componentName, props, {'from': 'C', 'id': compId});
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
        this.services.getContext<ServiceContext>(serviceName);
      else {
        for (var i = 0, len = serviceName.length; i < len; ++i)
          this.services.getContext<ServiceContext>(serviceName[i]);
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

    constructor(private name: string, private baseUrl: string, useLibraries: string[], useServices: string[],
                useComponents: string[], private restrictedAccess: boolean) {
      this.authLibraries = ContextHelper.toSet(useLibraries);
      this.authServices = ContextHelper.toSet(useServices);
      this.authComponents = ContextHelper.toSet(useComponents);
    }

    public getService(serviceName: string): any {
      if (this.restrictedAccess && !this.authServices[serviceName])
        throw Error('In "' + this.name + '", unauthorized access to the service "' + serviceName + '"');
      return this.ac.getService(serviceName);
    }

    public removeComponent(c: any, fromDOM = false): void {
      this.ac.removeComponent(c, fromDOM);
    }

    public hasLibrary(libName: any): boolean {
      if (this.restrictedAccess && !this.authLibraries[libName])
        throw Error('In "' + this.name + '", unauthorized access to the library "' + libName + '"');
      return this.ac.hasLibrary(libName);
    }

    public evalLibrary(libName: any): void {
      if (this.restrictedAccess && !this.authLibraries[libName])
        throw Error('In "' + this.name + '", unauthorized access to the library "' + libName + '"');
      this.ac.evalLibrary(libName);
    }

    public evalService(serviceName: any): void {
      if (this.restrictedAccess && !this.authServices[serviceName])
        throw Error('In "' + this.name + '", unauthorized access to the service "' + serviceName + '"');
      this.ac.evalService(serviceName);
    }

    public evalComponent(componentName: any): void {
      if (this.restrictedAccess && !this.authComponents[componentName])
        throw Error('In "' + this.name + '", unauthorized access to the component "' + componentName + '"');
      this.ac.evalComponent(componentName);
    }

    public getName(): string {
      return this.name;
    }

    public getBaseUrl(): string {
      return this.baseUrl;
    }
  }

  // ##
  // ## SingletonContextTrait
  // ##

  class SingletonContextTrait {
    private restrictedAccess: boolean;
    private name: string;
    private authComponents: {};
    private ac: ImplApplicationContext;

    public createComponent(componentName: string, props?: {}): any {
      if (this.restrictedAccess && !this.authComponents[componentName])
        throw Error('In "' + this.name + '", unauthorized access to the component "' + componentName + '"');
      return this.ac.createComponentFromServ(componentName, props, <any>this);
    }
  }

  // ##
  // ## ImplComponentTypeContext
  // ##

  class ImplComponentTypeContext implements ComponentTypeContext {
    constructor(private name: string, private baseUrl) {
    }

    public getName(): string {
      return this.name;
    }

    public getBaseUrl(): string {
      return this.baseUrl;
    }
  }

  // ##
  // ## ImplComponentContext
  // ##

  class ComponentContextTrait {
    private restrictedAccess: boolean;
    private name: string;
    private authComponents: {};
    private ac: ImplApplicationContext;

    constructor(private compId: number) {
    }

    public createComponent(componentName: string, props: {} = null): any {
      if (this.restrictedAccess && !this.authComponents[componentName])
        throw Error('In "' + this.name + '", unauthorized access to the component "' + componentName + '"');
      return this.ac.createComponentFromComp(componentName, props, this.compId);
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
