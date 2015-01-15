/// <reference path="definitions.ts" />
/// <reference path="comptree.ts" />
/// <reference path="loader.ts" />
/// <reference path="log.ts" />
'use strict';

module Woc {

  // ##
  // ## Functions
  // ##

  export function makeApplicationContext(cfg: AppConfig): ApplicationContext {
    return new ImplApplicationContext(cfg);
  }

  // ##
  // ## ExternLibs
  // ##

  export class ExternLibs {
    private ac: ImplApplicationContext;
    private map = {};

    constructor(ac: any) {
      this.ac = ac;
    }

    public register(libName: string, useExternLibs: string[], scripts: string) {
      if (this.map[libName] !== undefined)
        throw Error('The lib "' + libName + '" is already declared');
      this.map[libName] = {
        'useExternLibs': useExternLibs,
        'scripts': scripts,
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
      if (prop['useExternLibs']) {
        if (prop['loading'])
          throw Error('A loop is detected in useExternLibs for "' + libName + '"');
        prop['loading'] = true;
        this.ac.evalExternLib(prop['useExternLibs']);
      }
      if (prop['scripts'] !== null)
        globalEval(prop['scripts']);
      this.map[libName] = true;
      return true;
    }
  }

  // ##
  // ## Singletons
  // ##

  export class Singletons {
    private ac: ImplApplicationContext;
    private map = {};
    private byBundle: {};
    private log: CoreLog;

    constructor(ac: any, private label: string) {
      this.ac = ac;
      this.coreRegister('Woc.Ajax', 'Woc.CoreAjax', true);
    }

    public register(name: string, baseUrl: string, useApp: boolean, useExternLibs: string[], useServices: string[],
                    useComponents: string[], scripts: string, tplStr: string, templateEngine: string, alias: string[] = null) {
      if (this.map[name] !== undefined || name === 'Woc.Log')
        throw Error('The ' + this.label + ' "' + name + '" is already declared');
      var prop = {
        'name': name,
        'baseUrl': baseUrl,
        'useApplication': useApp,
        'useExternLibs': useExternLibs,
        'useServices': useServices,
        'useComponents': useComponents,
        'scripts': scripts,
        'tplStr': tplStr,
        'templateEngine': templateEngine,
        'context': null,
        'inst': null
      };
      if (alias) {
        for (var i = 0, len = alias.length; i < len; ++i) {
          if (alias[i] === 'Woc.Log')
            (<Woc.CoreLog>this.get('Woc.Log')).add(name);
          else {
            if (this.map[alias[i]] !== undefined)
              throw Error('The ' + this.label + ' "' + name + '" cannot declare the alias "' + alias[i] + '": already used');
            this.map[alias[i]] = prop;
          }
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
      if (!this.byBundle || this.byBundle[bundleName] === undefined)
        return;
      var list = this.byBundle[bundleName];
      for (var i = 0, len = list.length; i < len; ++i) {
        this.get(list[i]).init();
        delete this.map[list[i]];
      }
      delete this.byBundle[bundleName];
    }

    public get(name: string): any {
      if (name === 'Woc.Log') {
        if (!this.log)
          this.log = new CoreLog(this);
        return this.log;
      }
      this.makeReady(name);
      return this.map[name]['inst'];
    }

    public evalSingleton(name: string): void {
      if (name !== 'Woc.Log')
        this.makeReady(name);
    }

    private makeReady(name: string) {
      var prop = this.map[name];
      if (prop === undefined)
        throw Error('Unknown ' + this.label + ' "' + name + '"');
      if (prop['context'] !== null)
        return;
      if (prop['useExternLibs'])
        this.ac.evalExternLib(prop['useExternLibs']);
      if (prop['scripts'] !== null)
        globalEval(prop['scripts']);
      var cl = toClass(prop['coreClass'] || prop['name']);
      // - Template methods
      var methods;
      if (prop['templateEngine']) {
        var tplEng: TemplateEngine = this.ac.getService(prop['templateEngine']);
        methods = tplEng.makeProcessor(prop['tplStr'], {
          'name': name,
          'baseUrl': prop['baseUrl']
        }).getContextMethods();
      } else
        methods = null;
      // - Make the context instance
      var ImplContext = Singletons.mergeTraits(this.ac, methods);
      prop['context'] = new ImplContext(prop['name'], prop['baseUrl'], prop['useExternLibs'], prop['useServices'],
        prop['useComponents'], prop['coreClass'] ? false : true);
      prop['inst'] = prop['useApplication'] ? new cl(this.ac, prop['context']) : new cl(prop['context']);
      prop['context']['_wocOwner'] = prop['inst'];
    }

    private coreRegister(name: string, coreClass: string, useApp: boolean) {
      this.register(name, null, useApp, null, null, null, null, null, null);
      this.map[name]['coreClass'] = coreClass;
    }

    private static mergeTraits(ac: ImplApplicationContext, methods: {}): any {
      var SingletonContext = function (name: string, baseUrl: string, useExternLibs: string[], useServices: string[],
                            useComponents: string[], restrictedAccess: boolean) {
        ThingContextTrait.call(this, name, baseUrl, useExternLibs, useServices, useComponents, restrictedAccess);
        SingletonContextTrait.call(this);
      };
      SingletonContext.prototype['ac'] = ac;
      SingletonContext.prototype['appConfig'] = ac.appConfig;
      SingletonContext.prototype['log'] = ac.getService('Woc.Log');
      ContextHelper.copyMembers(ThingContextTrait.prototype, SingletonContext.prototype);
      ContextHelper.copyMembers(SingletonContextTrait.prototype, SingletonContext.prototype);
      if (methods)
        ContextHelper.copyMembers(methods, SingletonContext.prototype);
      ContextHelper.freeze(SingletonContext.prototype);
      return SingletonContext;
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

    public register(name: string, componentBaseUrl: string, useApp: boolean, useExternLibs: string[], useServices: string[],
                    useComponents: string[], scripts: string, tplStr: string, templateEngine: string) {
      if (this.map[name] !== undefined)
        throw Error('Conflict for component "' + name + '"');
      this.map[name] = {
        'baseUrl': componentBaseUrl,
        'useApplication': useApp,
        'useExternLibs': useExternLibs,
        'useServices': useServices,
        'useComponents': useComponents,
        'scripts': scripts,
        'tplStr': tplStr,
        'templateEngine': templateEngine,
        'eval': false,
        'CC': null,
        'Cl': null,
        'tplProc': null
      };
    }

    public create(name: string, props: {}, parent: CompTreeArg): Component {
      var prop = this.map[name];
      if (prop === undefined)
        throw Error('Unknown component "' + name + '"');
      var id = this.compTree.newPlaceholder(name, parent);
      this.makeReady(name, prop);
      var cc = new prop['CC'](id);
      var Cl = prop['Cl'];
      var c = prop['useApplication'] ? new Cl(this.ac, cc, props ? props : {}) : new Cl(cc, props ? props : {});
      cc['_wocOwner'] = c;
      this.compTree.setComp(id, c, cc, prop['tplProc']);
      return c;
    }

    public evalComponent(name: string): void {
      var prop = this.map[name];
      if (prop === undefined)
        throw Error('Unknown component "' + name + '"');
      this.makeReady(name, prop);
    }

    private makeReady(name: string, prop): void {
      if (prop['eval'])
        return;
      prop['eval'] = true;
      if (prop['useExternLibs'])
        this.ac.evalExternLib(prop['useExternLibs']);
      if (prop['scripts'] !== null)
        globalEval(prop['scripts']);
      var methods;
      if (prop['templateEngine']) {
        var tplEng: TemplateEngine = this.ac.getService(prop['templateEngine']);
        prop['tplProc'] = tplEng.makeProcessor(prop['tplStr'], {
          'name': name,
          'baseUrl': prop['baseUrl']
        });
        methods = prop['tplProc'].getContextMethods();
      } else
        methods = null;
      prop['CC'] = Components.mergeTraits(
        this.ac,
        methods,
        name,
        prop['baseUrl'],
        prop['useExternLibs'],
        prop['useServices'],
        prop['useComponents'],
        true
      );
      var Cl = prop['Cl'] = toClass(name);
      if (typeof Cl.init === 'function') {
        var cc = new prop['CC'](null);
        if (prop['useApplication'])
          Cl.init(this.ac, cc);
        else
          Cl.init(cc);
      }
    }

    private static mergeTraits(ac: ImplApplicationContext, methods: {}, name: string, baseUrl: string, useExternLibs: string[],
                               useServices: string[], useComponents: string[], restrictedAccess: boolean): any {
      var CompContext = function (compId: number) {
        ComponentContextTrait.call(this, compId);
      };
      ThingContextTrait.call(CompContext.prototype, name, baseUrl, useExternLibs, useServices, useComponents, restrictedAccess);
      CompContext.prototype['ac'] = ac;
      CompContext.prototype['appProperties'] = ac.appProperties;
      CompContext.prototype['log'] = ac.getService('Woc.Log');
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

    private externLibs: ExternLibs;
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
      this.externLibs = new ExternLibs(this);
      this.services = new Singletons(this, 'service');
      this.initializers = new Singletons(this, 'initializer');
      this.components = new Components(this);
      this.loader = new Loader(this, this.externLibs, this.services, this.initializers, this.components);
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
        var serv: StartingPoint = this.services.get(startingPointName);
        if (serv.start === undefined)
          throw Error('Cannot use the starting point service "' + startingPointName + '", it should implement Woc.StartingPoint');
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

    public createComponent(serviceName: string, props: {}, compTreeArg: CompTreeArg): any {
      return this.components.create(serviceName, props, compTreeArg);
    }

    public getChildComponents(compTreeArg: CompTreeArg): Component[] {
      return this.components.getComponentTree().getChildComponents(compTreeArg);
    }

    public callChildComponents(compTreeArg: CompTreeArg, methodName, args: any[]): any[] {
      return this.components.getComponentTree().callChildComponents(compTreeArg, methodName, args);
    }

    public removeComponent(c: any, fromDOM = false): void {
      var compTree = this.components.getComponentTree();
      if (Array.isArray(c)) {
        for (var i = 0, len = c.length; i < len; ++i)
          compTree.destruct(c[i], fromDOM);
      } else
        compTree.destruct(c, fromDOM);
    }

    public hasExternLib(libName: any): boolean {
      if (typeof libName === 'string')
        return this.externLibs.has(libName);
      for (var i = 0, len = libName.length; i < len; ++i) {
        if (!this.externLibs.has(libName))
          return false;
      }
      return true;
    }

    public evalExternLib(libName: any): void {
      if (typeof libName === 'string')
        this.externLibs.load(libName, true);
      else {
        for (var i = 0, len = libName.length; i < len; ++i)
          this.externLibs.load(libName[i], true);
      }
    }

    public evalService(serviceName: any): void {
      if (typeof serviceName === 'string')
        this.services.evalSingleton(serviceName);
      else {
        for (var i = 0, len = serviceName.length; i < len; ++i)
          this.services.evalSingleton(serviceName[i]);
      }
    }

    public evalComponent(componentName: any): void {
      if (typeof componentName === 'string')
        this.components.evalComponent(componentName);
      else {
        for (var i = 0, len = componentName.length; i < len; ++i)
          this.components.evalComponent(componentName[i]);
      }
    }
  }

  // ##
  // ## ThingContextTrait
  // ##

  class ThingContextTrait {
    private ac: ImplApplicationContext;
    private authExternLibs: {};
    private authServices: {};
    private authComponents: {};
    private _wocOwner;
    public log: Log;

    constructor(private name: string, private baseUrl: string, useExternLibs: string[], useServices: string[],
                useComponents: string[], private restrictedAccess: boolean) {
      this.authExternLibs = ContextHelper.toSet(useExternLibs, name);
      this.authServices = ContextHelper.toSet(useServices, name, 'Woc.Log');
      this.authComponents = ContextHelper.toSet(useComponents, name);
    }

    public logWrap(cb: () => any): any {
      try {
        return cb();
      } catch (e) {
        this.log.error(e);
      }
    }

    public getService(serviceName: string): any {
      if (this.restrictedAccess && !this.authServices[serviceName])
        throw Error('In "' + this.name + '", unauthorized access to the service "' + serviceName + '"');
      return this.ac.getService(serviceName);
    }

    public createComponent(componentName: string, props?: any): any {
      if (this.restrictedAccess && !this.authComponents[componentName])
        throw Error('In "' + this.name + '", unauthorized access to the component "' + componentName + '"');
      return this.ac.createComponent(componentName, props, this.getCompTreeArg());
    }

    public removeComponent(c: any, fromDOM = false): void {
      this.ac.removeComponent(c, fromDOM);
    }

    public getChildComponents(): Component[] {
      return this.ac.getChildComponents(this.getCompTreeArg());
    }

    public callChildComponents(methodName, ...args: any[]): any[] {
      return this.ac.callChildComponents(this.getCompTreeArg(), methodName, args);
    }

    public hasExternLib(libName: any): boolean {
      if (this.restrictedAccess && !this.authExternLibs[libName])
        throw Error('In "' + this.name + '", unauthorized access to the external library "' + libName + '"');
      return this.ac.hasExternLib(libName);
    }

    public evalExternLib(libName: any): void {
      if (this.restrictedAccess && !this.authExternLibs[libName])
        throw Error('In "' + this.name + '", unauthorized access to the external library "' + libName + '"');
      this.ac.evalExternLib(libName);
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

    public getOwner(): {} {
      if (this._wocOwner === undefined)
        throw Error('Missing owner here');
      return this._wocOwner;
    }

    private getCompTreeArg: () => CompTreeArg;
  }

  // ##
  // ## SingletonContextTrait
  // ##

  class SingletonContextTrait {
    private getCompTreeArg(): CompTreeArg {
      return {
        from: 'S',
        context: <any>this
      }
    }
  }

  // ##
  // ## ImplComponentContext
  // ##

  class ComponentContextTrait {
    /**
     * @param compId NULL for static init context
     */
    constructor(private compId: number) {
    }

    private getCompTreeArg(): CompTreeArg {
      return {
        from: 'C',
        context: <any>this,
        id: this.compId
      };
    }
  }

  // ##
  // ## ContextHelper
  // ##

  class ContextHelper {
    public static toSet(names: string[], ...sup: string[]): {[index: string]: boolean} {
      var s: any = {};
      if (names) {
        for (var i = 0, len = names.length; i < len; ++i)
          s[names[i]] = true;
      }
      if (sup) {
        for (var i = 0, len = sup.length; i < len; ++i)
          s[sup[i]] = true;
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
