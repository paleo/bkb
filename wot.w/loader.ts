/// <reference path="ajax.ts" />

module wot {
	'use strict';

	// ##
	// ## Interfaces
	// ##

	export interface BundleMain {
		start(element): void;
	}

	export interface Component {
		compose?(...props): Component;
		setData?(...data): Component;
		getElement?(): HTMLElement;
		reset?(): Component;
		show?(): Component;
		hide?(): Component;
		setEnabled?(b: boolean): Component;
		destruct?(removeFromDOM: boolean): void;
	}

	export interface LiveState {
		isLive(): boolean;
		addLiveListener(cb: (live: boolean) => void): void;
	}

	export interface Dialog {
		getDialogElement(): any;
		setDialogOpened(): void;
		setDialogClosed(): void;
	}

	/**
	 * The services that implement this interface can be declared as an alias of wot.Dialogs
	 */
	export interface Dialogs {
		/**
		 * @param dialog wot.Dialog
		 * @param forcedOpen boolean
		 * @param hideBelow boolean
		 * @returns {number} The dialog ID
		 */
		addDialog(dialog: Dialog, forcedOpen?, hideBelow?): number;
		openDialog(dialogId: number): void;
		closeDialog(dialogId: number): boolean;
		removeDialog(dialogId: number): void;
		/**
		 *
		 * @param dialogElem
		 * @param setClosedCallback
		 * @param forcedOpen boolean
		 * @param hideBelow boolean
		 * @returns Function A callback for closing the dialog (the callback returns TRUE when dialog is closed, FALSE when the dialog remains)
		 */
		openDisposableDialog(dialogElem, setClosedCallback?: Function, forcedOpen?, hideBelow?): Function;
		clearDialogs(): boolean;
		showInfo(msgHtml: string): void;
		showWarning(msgHtml: string): void;
		reportError(e): void;
		/**
		 * @param msgHtml
		 * @param buttonList [{'label': string, 'callback': Function, 'ajax'?: boolean}]
		 */
		showConfirm(msgHtml: string, buttonList: any[]): void;
	}

	export interface ApplicationContext {
		properties: {};
		isDebug(): boolean;
		getService(serviceName): any;
		createComponent(componentName: string, props: {}, st: LiveState): any;
		removeComponent(c: Component, fromDOM?: boolean): void;
		removeComponent(cList: Component[], fromDOM?: boolean): void;
		getServiceContext(serviceName: string): ServiceContext;
		getComponentTypeContext(componentName: string): ComponentTypeContext;
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
		loadBundle(bundlePath: string, opt?: {}): void;
		hasLib(libName): boolean;
		includeLib(libName): boolean;
		requireLib(libName: any): void;
		requireService(serviceName: string): void;
		requireComponent(componentName: string): void;
		getDebugTree(): {};
	}

	export interface ServiceContext {
		getApplicationContext(): ApplicationContext;
		getServiceName(): string;
		getServiceBaseUrl(): string;
		getOwnService(): any;
		getService(serviceName): any;
		createComponent(componentName: string, props: {}, st: LiveState): any;
		removeComponent(c: Component, fromDOM?: boolean): void;
		removeComponent(cList: Component[], fromDOM?: boolean): void;
		hasLib(libName): boolean;
		includeLib(libName): boolean;
		requireLib(libName): void;
		requireService(serviceName): void;
		requireComponent(componentName): void;
	}

	export interface ComponentContext {
		getApplicationContext(): ApplicationContext;
		getLiveState(): LiveState;
		getComponentName(): string;
		getComponentBaseUrl(): string;
		getTemplate(sel: string, elMap?: {}): HTMLElement;
		createOwnComponent(props?: {}, st?: LiveState): any;
		createComponent(componentName: string, props?: {}, st?: LiveState): any;
		removeComponent(c: Component, fromDOM?: boolean): void;
		removeComponent(cList: Component[], fromDOM?: boolean): void;
		removeOwnComponent(fromDOM?: boolean): void;
		getService(serviceName): any;
		hasLib(libName): boolean;
		includeLib(libName): boolean;
		requireLib(libName): void;
		requireService(serviceName): void;
		requireComponent(componentName): void;
	}

	export interface ComponentTypeContext {
		getComponentName(): string;
		getComponentBaseUrl(): string;
		getTemplate(sel: string, elMap?: {}): HTMLElement;
		createOwnComponent(props: {}, st: LiveState): any;
	}

	// ##
	// ## Functions
	// ##

	export function makeApplicationContext(properties: {}, debug = false): ApplicationContext {
		return new ImplApplicationContext(properties, debug);
	}

	// ##
	// ## ImplApplicationContext
	// ##

	class ImplApplicationContext implements ApplicationContext {

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

	class ImplServiceContext implements ServiceContext {
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

	class ImplComponentContext implements ComponentContext {
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

	class ImplComponentTypeContext implements ComponentTypeContext {
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
				throw new Error('Unknown template "' + sel + '" in component "' + this.componentName + '"');
			var el = <HTMLElement>this.tplArr[this.tplSel[sel]].cloneNode(true);
			this.fillPlaceholders(el, elMap);
			this.fillLabels(el);
			return el;
		}

		public createOwnComponent(props: {}, st: LiveState): any {
			return this.ac.createComponent(this.componentName, props, st);
		}

		private fillPlaceholders(el, elMap: {}) {
			var list = [], all = el.getElementsByTagName('span'), marker, name;
			for (var i = 0, len = all.length; i < len; ++i) {
				marker = all[i];
				name = marker.getAttribute(Components.DATA_PH);
				if (name) {
					if (elMap[name] === undefined)
						throw new Error('In component "' + this.componentName + '", missing element for placeholder "' + name + '"');
					if (elMap[name] !== null && elMap[name]['tagName'] === undefined)
						throw new Error('Elements to put in placeholders must be DOM elements');
					list.push([marker, elMap[name]]);
				}
			}
			var newEl;
			for (i = 0, len = list.length; i < len; ++i) {
				marker = list[i][0];
				newEl = list[i][1];
				if (newEl === null)
					marker.parentNode.removeChild(marker);
				else
					marker.parentNode.replaceChild(newEl, marker);
			}
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
	// ## ComponentTree
	// ##

	class ComponentTree {

		private static ID_PROP = '_wotCompId';
		private tree = {};
		private list = [];

		public newPlaceholder(cName: string, compTreeArg): number {
			switch (compTreeArg['from']) {
				case 'A':
					return this.addFromRoot(cName, '/');
				case 'S':
					return this.addFromRoot(cName, compTreeArg['sc'].getServiceName());
				case 'C':
					var parentId = compTreeArg['id'];
					if (this.list[parentId] === undefined)
						throw new Error('Unknown parent component "' + parentId + '"');
					var item = this.list[parentId];
					return this.addItem(cName, item['children']);
				default:
					throw new Error('Unknown from "' + compTreeArg['from'] + '"');
			}
		}

		public setComp(id: number, c: Component): void {
			var item = this.list[id];
			if (item === undefined)
				throw new Error('Unknown component "' + id + '"');
			item['comp'] = c;
			c[ComponentTree.ID_PROP] = id;
		}

		public destruct(c: Component, removeFromDOM: boolean) {
			this.destructItem(c[ComponentTree.ID_PROP], removeFromDOM);
		}

		public destructFromId(id: number, removeFromDOM: boolean) {
			this.destructItem(id, removeFromDOM);
		}

		public getTreeCopy(): {} {
			var copy = {}, children;
			for (var rootId in this.tree) {
				if (this.tree.hasOwnProperty(rootId)) {
					children = ComponentTree.copyItems(this.tree[rootId]);
					if (children !== null)
						copy[rootId] = children;
				}
			}
			return copy;
		}

		private static copyItems(items: {}) {
			var copy = {}, empty = true, children: {};
			for (var id in items) {
				if (items.hasOwnProperty(id)) {
					empty = false;
					copy[id] = {
						'name': items[id]['name'],
						'comp': items[id]['comp']
					};
					children = ComponentTree.copyItems(items[id]['children']);
					if (children !== null)
						copy[id]['children'] = children;
				}
			}
			return empty ? null : copy;
		}

		private destructItem(id: number, removeFromDOM: boolean) {
			var item = this.list[id];
			if (item === undefined)
				throw new Error('Unknown component "' + id + '" (already removed?)');
			if (item['comp'] === null)
				throw new Error('Cannot destruct the component "' + item['name'] + '" during its initialisation');
			if (item['comp']['destruct'] !== undefined)
				item['comp']['destruct'](removeFromDOM);
			var children = item['children'];
			for (var childId in children) {
				if (children.hasOwnProperty(childId))
					this.destructItem(parseInt(childId, 10), removeFromDOM);
			}
			delete item['parentMap'][id];
			delete this.list[id];
		}

		private addFromRoot(cName: string, parentId: string): number {
			var children = this.tree[parentId];
			if (children === undefined)
				this.tree[parentId] = children = {};
			return this.addItem(cName, children);
		}

		private addItem(cName: string, children: {}): number {
			var id = this.list.length;
			this.list.push(children[id] = {
				'comp': null,
				'name': cName,
				'children': {},
				'parentMap': children
			});
			return id;
		}
	}

	// ##
	// ## Bundles
	// ##

	class Bundles {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
		}

		public register(bundlePath: string, bundleUrl: string, requireLib: string[], script: string, mainClassName: string) {
			if (this.map[bundlePath] !== undefined)
				throw new Error('The bundle "' + bundlePath + '" is already registered');
			if (requireLib)
				this.ac.requireLib(requireLib);
			if (script)
				globalScopeEval(script);
			var cl: any = null;
			if (mainClassName)
				cl = LoaderHelper.stringToClass(mainClassName);
			this.map[bundlePath] = cl ? new cl(this.ac, bundleUrl) : null;
		}

		public start(bundlePath, el) {
			var main = this.map[bundlePath];
			if (main === undefined)
				throw new Error('Unknown bundle "' + bundlePath + '"');
			if (main === null)
				throw new Error('Cannot start the bundle "' + bundlePath + '": it hasn\'t a main class');
			if (main.start === undefined)
				throw new Error('Cannot start the bundle "' + bundlePath + '": the main class should have a start method');
			main.start(el);
		}
	}

	// ##
	// ## Libraries
	// ##

	class Libraries {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
		}

		public register(libName: string, requireLib: string[], script: string) {
			if (this.map[libName] !== undefined)
				throw new Error('The lib "' + libName + '" is already declared');
			this.map[libName] = {
				'requireLib': requireLib,
				'script': script,
				'loading': false
			};
		}

		public has(libName: string): boolean {
			return this.map[libName] !== undefined;
		}

		public load(libName: string, req: boolean): any {
			var prop = this.map[libName];
			if (prop === undefined) {
				if (req)
					throw new Error('Unknown lib "' + libName + '"');
				return false;
			}
			if (prop === true)
				return true;
			if (prop['requireLib']) {
				if (prop['loading'])
					throw new Error('A loop is detected in requireLib for "' + libName + '"');
				prop['loading'] = true;
				this.ac.requireLib(prop['requireLib']);
			}
			if (prop['script'] !== null)
				globalScopeEval(prop['script']);
			this.map[libName] = true;
			return true;
		}
	}

	// ##
	// ## Services
	// ##

	class Services {
		private map = {};

		constructor(private ac: ImplApplicationContext) {
			this.register('wot.Log', null, null, null, null);
			this.register('wot.Ajax', null, null, null, null);
			this.register('wot.Router', null, null, null, null);
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
						throw new Error('The service "' + serviceName + '" cannot declare the alias "' + alias + '": already used');
					this.map[alias] = prop;
				}
			}
			if (this.map[serviceName] !== undefined)
				throw new Error('The service "' + serviceName + '" is already declared');
			this.map[serviceName] = prop;
		}

		public get(serviceName: string): any {
			var sc = this.getServiceContext(serviceName);
			return sc.getOwnService();
		}

		public getServiceContext(serviceName: string): ImplServiceContext {
			var prop = this.map[serviceName];
			if (prop === undefined)
				throw new Error('Unknown service "' + serviceName + '"');
			if (prop['sc'] === null) {
				if (prop['requireLib'])
					this.ac.requireLib(prop['requireLib']);
				if (prop['script'] !== null)
					globalScopeEval(prop['script']);
				var cl = LoaderHelper.stringToClass(prop['name']);
				prop['sc'] = new ImplServiceContext(this.ac, prop['name'], prop['baseUrl'], cl);
			}
			return prop['sc'];
		}
	}

	// ##
	// ## Components
	// ##

	class Components {

		public static DATA_PH = 'data-wot-mYr4-ph';
		private log;
		private tplParser: TemplateParser;
		private compTree: ComponentTree;
		private map = {};

		constructor(private ac: ImplApplicationContext) {
			this.log = ac.getService('wot.Log');
			this.tplParser = new TemplateParser();
			this.compTree = new ComponentTree();
		}

		public getComponentTree(): ComponentTree {
			return this.compTree;
		}

		public register(componentName: string, componentBaseUrl: string, requireLib: string[], script: string, tplStr: string) {
			if (this.map[componentName] !== undefined)
				throw new Error('Conflict for component "' + componentName + '"');
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
				throw new Error('Unknown component "' + componentName + '"');
			if (prop['cc'] === null) {
				if (prop['requireLib'])
					this.ac.requireLib(prop['requireLib']);
				if (prop['script'] !== null)
					globalScopeEval(prop['script']);
				prop['cc'] = new ImplComponentTypeContext(this.ac, componentName, prop['baseUrl'], prop['tplArr'], prop['tplSel'], prop['tplLab']);
			}
			return prop['cc'];
		}
	}

	// ##
	// ## TemplateParser
	// ##

	class TemplateParser {
		private componentName: string;
		private bySelMap: {};
		private placeholders: {};
		private labels: {};
		private lblPrefix: string;
		private lblCount: number;

		public parse(componentName: string, templatesStr: string): {}[] {
			this.componentName = componentName;
			this.bySelMap = {};
			this.placeholders = {};
			this.labels = {};
			this.lblPrefix = null;
			this.lblCount = 0;
			var templates = [];
			templatesStr = this.addMarkers(templatesStr);
			var rmSelSet = {};
			var parser = document.createElement('div');
			parser.innerHTML = templatesStr;
			var el, tplId, cssClasses;
			for (var i = 0, len = parser.childNodes.length; i < len; ++i) {
				el = parser.childNodes[i];
				tplId = templates.length;
				templates[tplId] = el;
				this.addTplSel(rmSelSet, el.nodeName.toLowerCase(), tplId);
				if (el.id)
					this.addTplSel(rmSelSet, '#' + el.id, tplId);
				if (el.className) {
					cssClasses = el.className.split(' ');
					for (var j = 0, jLen = cssClasses.length; j < jLen; ++j)
						this.addTplSel(rmSelSet, '.' + cssClasses[j], tplId);
				}
			}
//			for (var k in this.placeholders) {
//				if (this.placeholders.hasOwnProperty(k))
//					throw new Error('In templates of component "' + this.componentName + '": placeholder "' + k + '" should be replaced here');
//			}
			return templates;
		}

		public getBySelMap(): {} {
			return this.bySelMap;
		}

		public getLabels(): {} {
			return this.labels;
		}

		private addTplSel(rmSelSet: {}, sel: string, tplId: number): boolean {
			if (rmSelSet[sel])
				return false;
			if (this.bySelMap[sel] !== undefined) {
				delete this.bySelMap[sel];
				rmSelSet[sel] = true;
			} else
				this.bySelMap[sel] = tplId;
			return true;
		}

		private addMarkers(str: string) {
			var pieces: string[] = [];
			var cur = 0, inner, end, pieceIndex = 0, innerStr, cmdEnd, cmd, cmdVal;
			while ((cur = str.indexOf('{', cur)) !== -1) {
				if (TemplateParser.isEscaped(str, cur)) {
					if (cur >= 1) {
						pieces.push(TemplateParser.unescape(str.slice(pieceIndex, cur - 1)));
						pieceIndex = cur;
					}
					++cur;
					continue;
				}
				inner = cur + 1;
				end = str.indexOf('}', inner);
				if (end === -1)
					break;
				innerStr = str.slice(inner, end);
				cmdEnd = innerStr.indexOf(':');
				if (cmdEnd === -1) {
					cur = end + 1;
					continue;
				}
				pieces.push(TemplateParser.unescape(str.slice(pieceIndex, cur)));
				cmd = TemplateParser.trim(innerStr.slice(0, cmdEnd));
				cmdVal = innerStr.slice(cmdEnd + 1);
				if (cmd === 'placeholder')
					this.addPlaceholder(pieces, cmdVal);
				else if (!this.addLabel(pieces, cmd, cmdVal)) {
					pieceIndex = cur;
					++cur;
					continue;
				}
				pieceIndex = cur = end + 1;
			}
			if (pieceIndex === 0)
				return str;
			pieces.push(TemplateParser.unescape(str.slice(pieceIndex)));
			return pieces.join('');
		}

		private addPlaceholder(pieces: string[], name: string) {
			var name = TemplateParser.trim(name);
			if (this.placeholders[name])
				throw new Error('Conflict in templates of component "' + this.componentName + '": several placeholders "' + name + '"');
			pieces.push('<span ' + Components.DATA_PH + '="' + name + '"></span>');
			this.placeholders[name] = true;
		}

		private addLabel(pieces: string[], cmd: string, lblStr: string): boolean {
			if (cmd === 'lbl')
				cmd = 'lbl span';
			else if (cmd[0] !== 'l' || cmd[1] !== 'b' || cmd[2] !== 'l' || cmd[3] !== ' ')
				return false;
			var classIndex = cmd.indexOf('.', 5), cssClass, tagName;
			if (classIndex === -1) {
				tagName = TemplateParser.trim(cmd.slice(4));
				cssClass = '';
			} else {
				tagName = TemplateParser.trim(cmd.slice(4, classIndex));
				cssClass = TemplateParser.trim(cmd.slice(classIndex + 1)) + ' ';
			}
			if (tagName === '')
				throw new Error('Invalid label "' + cmd + '" in templates of component "' + this.componentName + '"');
			var lblId = this.makeLblId();
			this.labels[lblId] = TemplateParser.formatLabelStr(lblStr);
			if (tagName === 'class') {
				if (cssClass)
					throw new Error('Invalid label "' + cmd + '" in templates of component "' + this.componentName + '"');
				pieces.push(lblId);
			} else
				pieces.push('<' + tagName + ' class="' + cssClass + lblId + '"></' + tagName + '>');
			return true;
		}

		private makeLblId(): string {
			if (this.lblPrefix === null)
				this.lblPrefix = 'wotl10n~' + this.componentName.replace(/\./g, '~') + '~';
			return this.lblPrefix + (this.lblCount++);
		}

		private static formatLabelStr(s: string): string {
			return s[0] === ' ' ? s.slice(1) : s;
		}

		private static trim(s: string): string {
			return String.prototype.trim ? s.trim() : s.replace(/^\s+|\s+$/g, '');
		}

		private static isEscaped(str: string, index: number): boolean {
			var count = 0;
			while (--index >= 0 && str[index] === '\\')
				++count;
			return count % 2 === 1;
		}

		private static unescape(s: string): string {
			return s.replace(/\\\\/g, '\\');
		}
	}

	// ##
	// ## Loader
	// ##

	class Loader {

		private static WORK_IN_PROGRESS = '.w';
		private static S_LOADING = 1;
		private static S_READY = 2;
		private static S_ERROR = 3;

		private appUrl: string;
		private ajax: wot.Ajax;
		private bundlePropMap = {};

		constructor(private ac: ImplApplicationContext, private libraries: Libraries, private services: Services,
				private components: Components, private bundles: Bundles) {
			this.appUrl = ac.properties['appUrl'];
			this.ajax = this.services.get('wot.Ajax');
		}

		public loadBundle(bundlePath: string, doneCallback: Function, failCallback: Function, startOnElem, version: string,
				autoLoadCss: boolean, wMode: boolean) {
			// - Known bundle
			var prop = this.bundlePropMap[bundlePath];
			if (prop !== undefined) {
				switch (prop['status']) {
					case Loader.S_READY:
						if (doneCallback)
							doneCallback();
						if (startOnElem)
							this.bundles.start(bundlePath, startOnElem);
						return;
					case Loader.S_LOADING:
						if (doneCallback)
							prop['onReady'].push(doneCallback);
						if (failCallback)
							prop['onError'].push(failCallback);
						if (startOnElem)
							prop['start'].push(startOnElem);
						return;
					default:
						if (failCallback)
							failCallback();
						return;
				}
			}
			// - First call
			prop = {
				'status': Loader.S_LOADING,
				'onReady': doneCallback ? [doneCallback] : [],
				'onError': failCallback ? [failCallback] : [],
				'start': startOnElem ? [startOnElem] : []
			};
			this.bundlePropMap[bundlePath] = prop;
			// - Load
			var bundleUrl = this.appUrl + '/' + bundlePath;
			if (wMode)
				bundleUrl += Loader.WORK_IN_PROGRESS;
			else if (version)
				bundleUrl += '-' + version;
			var that = this;
			var loadDone = function () {
				prop['status'] = Loader.S_READY;
				var cbList = prop['onReady'], i, len;
				for (i = 0, len = cbList.length; i < len; ++i)
					cbList[i]();
				var startList = prop['start'];
				for (i = 0, len = startList.length; i < len; ++i)
					that.bundles.start(bundlePath, startList[i]);
				delete prop['onReady'];
				delete prop['onError'];
				delete prop['start'];
			};
			var loadFail = function () {
				prop['status'] = Loader.S_ERROR;
				var cbList = prop['onError'];
				for (var i = 0, len = cbList.length; i < len; ++i)
					cbList[i]();
				delete prop['onReady'];
				delete prop['onError'];
			};
			if (wMode) {
				var wLoader = new WLoader(this.libraries, this.services, this.components, this.bundles, this, bundlePath, bundleUrl,
					version, loadDone, loadFail);
				wLoader.loadWBundle();
			} else
				this.loadNormalBundle(bundlePath, bundleUrl, loadDone, loadFail, autoLoadCss);
		}

		// --
		// -- Internal
		// --

		loadBundles(bundlePaths, doneCallback: Function, failCallback: Function, wMode: boolean) {
			var waitedLoads = bundlePaths.length, hasError = false;
			if (waitedLoads === 0) {
				if (doneCallback)
					doneCallback();
				return;
			}
			var done = function () {
				if (hasError)
					return;
				--waitedLoads;
				if (waitedLoads === 0 && doneCallback)
					doneCallback();
			};
			var fail = function () {
				if (hasError)
					return;
				hasError = true;
				if (failCallback)
					failCallback();
			};
			for (var i = 0, len = bundlePaths.length; i < len; ++i)
				this.loadBundle(bundlePaths[i], done, fail, null, null, false, wMode);
		}

		static addCssLinkElement(baseUrl: string, fileName: string) {
			var elem = document.createElement('link');
			elem.rel = 'stylesheet';
			elem.type = 'text/css';
			//elem.media = 'all';
			elem.href = baseUrl + '/' + fileName;
			document.head.appendChild(elem);
		}

		// --
		// -- Private
		// --

		private loadNormalBundle(bundlePath, bundleUrl, doneCallback, failCallback, autoLoadCss: boolean) {
			var bundleName = Loader.getLastDirName(bundlePath);
			var that = this;
			this.ajax.get({
				'url': bundleUrl + '/' + bundleName + '.json',
				'done': function (bundleData) {
					that.onLoadedNormalBundle(bundlePath, bundleUrl, bundleName, doneCallback, failCallback, bundleData, autoLoadCss);
				}
			});
			if (autoLoadCss)
				Loader.addCssLinkElement(bundleUrl, bundleName + '.css');
		}

		private onLoadedNormalBundle(bundlePath: string, bundleUrl, bundleName, doneCallback: Function, failCallback: Function,
				bundleData: {}, autoLoadedCss: boolean) {
			var preload = bundleData['preload'];
			if (preload) {
				var that = this;
				this.loadBundles(preload, function () {
					that.registerNormalBundle(bundlePath, bundleUrl, bundleData);
					if (doneCallback)
						doneCallback();
				}, failCallback, false);
			} else {
				this.registerNormalBundle(bundlePath, bundleUrl, bundleData);
				if (doneCallback)
					doneCallback();
			}
			if (!autoLoadedCss && bundleData['css'])
				Loader.addCssLinkElement(bundleUrl, bundleName + '.css');
		}

		private registerNormalBundle(bundlePath: string, bundleUrl, bundleData: {}) {
			var name, data;
			// - Register libraries
			var servMap = bundleData['libraries'];
			if (servMap) {
				for (name in servMap) {
					if (!servMap.hasOwnProperty(name))
						continue;
					data = servMap[name];
					this.libraries.register(name, data['requireLib'], data['script']);
					if (data['css'])
						Loader.addCssLinks(data['css'], bundleUrl);
				}
			}
			// - Register services
			var servMap = bundleData['services'];
			if (servMap) {
				for (name in servMap) {
					if (!servMap.hasOwnProperty(name))
						continue;
					data = servMap[name];
					this.services.register(name, bundleUrl, data['alias'], data['requireLib'], data['script']);
				}
			}
			// - Register components
			var compMap = bundleData['components'];
			if (compMap) {
				for (name in compMap) {
					if (!compMap.hasOwnProperty(name))
						continue;
					data = compMap[name];
					this.components.register(name, bundleUrl, data['requireLib'], data['script'], data['tpl']);
					if (data['css'])
						Loader.addCssLinks(data['css'], bundleUrl);
				}
			}
			this.bundles.register(bundlePath, bundleUrl, bundleData['requireLib'], bundleData['script'], bundleData['main']);
		}

		private static addCssLinks(list: string[], bundleUrl: string) {
			for (var i = 0, len = list.length; i < len; ++i)
				Loader.addCssLinkElement(bundleUrl, list[i]);
		}

		private static getLastDirName(path: string): string {
			var i = path.lastIndexOf('/');
			return i === -1 ? path : path.slice(i + 1);
		}
	}

	// ##
	// ## WLoader
	// ##

	class WLoader {
		private ajax: wot.Ajax;
		private thingDoneCallback: Function;
		private failCallback: Function;
		private thingLoadCount = 0;
		private waitedPreloads = 0;
		private waitedBundleConf = 0;
		private embedBundleList = [];

		constructor(private libraries: Libraries, private services: Services, private components: Components,
				private bundles: Bundles, private loader: Loader, private bundlePath: string, private bundleUrl: string,
				version: string, doneCallback: Function, failCallback: Function) {
			this.ajax = this.services.get('wot.Ajax');
			var that = this;
			var doneReported = false;
			this.thingDoneCallback = function (decCount = true) {
				if (decCount)
					--that.thingLoadCount;
				if (that.thingLoadCount > 0)
					return;
				if (doneReported)
					throw new Error('Bug when loading bundle ("w" mode) "' + that.bundlePath + '": done already reported');
				doneReported = true;
				if (that.embedBundleList.length === 0)
					throw new Error('Empty bundle');
				var bundleConf = that.embedBundleList[0]['conf'];
				if (bundleConf['version'] && version && bundleConf['version'] !== version)
					throw new Error('Conflict in bundle version, attempted "' + version + '" doesn\'nt match with current "' + bundleConf['version'] + '"');
				that.bundles.register(that.bundlePath, that.bundleUrl, null, null, bundleConf['main']);
				if (doneCallback)
					doneCallback();
			};
			var failReported = false;
			this.failCallback = function () {
				if (failReported)
					return;
				failReported = true;
				if (failCallback)
					failCallback();
			};
		}

		// --
		// -- Public
		// --

		public loadWBundle() {
			this.doLoadWBundle(this.bundlePath, this.bundleUrl);
		}

		// --
		// -- Internal
		// --

		static addScriptElement(url, cb, services: Services) {
			var ready = function () {
				if (cb) {
					try {
						cb();
					} catch (err) {
						services.get('wot.Log').unexpectedErr(err);
					}
					cb = null;
				}
			};
			var head = document.head || document.getElementsByTagName('head')[0];
			var script = document.createElement('script');
			script.onreadystatechange = function () {
				if (this.readyState === 'complete')
					ready();
			};
			script.onload = ready;
			script.src = url;
			head.appendChild(script);
		}

		// --
		// -- Private - Embed bundles
		// --

		private doLoadWBundle(bundlePath, bundleUrl) {
			var that = this;
			var preloadDone = function () {
				--that.waitedPreloads;
				that.loadAllEmbedBundles();
			};
			++this.waitedBundleConf;
			this.ajax.get({
				'url': bundleUrl + '/bundle.json',
				'done': function (bundleConf) {
					that.embedBundleList.push({
						'path': bundlePath,
						'url': bundleUrl,
						'conf': bundleConf
					});
					--that.waitedBundleConf;
					that.loadEmbedBundlesConf(bundlePath, bundleUrl, bundleConf);
					if (bundleConf['preload']) {
						++that.waitedPreloads;
						that.loader.loadBundles(bundleConf['preload'], preloadDone, that.failCallback, false);
					} else
						that.loadAllEmbedBundles();
				},
				'fail': this.failCallback
			});
		}

		private loadEmbedBundlesConf(bundlePath, bundleUrl, bundleConf) {
			var embed = bundleConf['embed'];
			if (embed === undefined)
				return;
			var dir;
			for (var i = 0, len = embed.length; i < len; ++i) {
				dir = embed[i];
				if (WLoader.getType(dir) === 'BW')
					this.doLoadWBundle(bundlePath + '/' + dir, bundleUrl + '/' + dir);
			}
		}

		private loadAllEmbedBundles() {
			if (this.waitedPreloads > 0 || this.waitedBundleConf > 0)
				return;
			this.loadAllWConf();
		}

		// --
		// -- Private - Libraries, Services, Components
		// --

		private loadAllWConf() {
			// - Make thingPropList
			var thingPropList = [], bundleReqLibSet = {}, bundleScripts = [], bundleCss = [], encoding = undefined;
			var i, len, j, lenJ, embed, reqLib, dir, type, bundleProp;
			for (i = 0, len = this.embedBundleList.length; i < len; ++i) {
				bundleProp = this.embedBundleList[i];
				embed = bundleProp['conf']['embed'];
				if (embed !== undefined) {
					for (j = 0, lenJ = embed.length; j < lenJ; ++j) {
						dir = embed[j];
						type = WLoader.getType(dir);
						if (type !== 'BW') {
							thingPropList.push({
								'type': type,
								'path': dir,
								'confUrl': bundleProp['url'] + '/' + dir + '/' + WLoader.getConfFileName(type),
								'bundleUrl': bundleProp['url'],
								'bundlePath': bundleProp['path'],
								'bundleConf': bundleProp['conf'],
								'conf': null
							});
						}
					}
				}
				if (encoding === undefined)
					encoding = bundleProp['conf']['encoding'];
				else if (bundleProp['conf']['encoding'] !== undefined && encoding !== bundleProp['conf']['encoding'])
					throw new Error('Encoding conflict with embed bundles: "' + encoding + '" doesn\'t match with "' + bundleProp['conf']['encoding'] + '"');
				reqLib = bundleProp['conf']['requireLib'];
				if (reqLib !== undefined) {
					for (j = 0, lenJ = reqLib.length; j < lenJ; ++j)
						bundleReqLibSet[reqLib[j]] = true;
				}
				if (bundleProp['conf']['script'] !== undefined)
					bundleScripts.push([bundleProp['url'], WLoader.toFileList(bundleProp['conf']['script'])]);
				if (bundleProp['conf']['css'] !== undefined)
					bundleCss.push([bundleProp['url'], bundleProp['conf']['css']]);
			}
			// - Make mergedBundleProp
			var bundleReqLibList = [];
			for (var libName in bundleReqLibSet) {
				if (bundleReqLibSet.hasOwnProperty(libName))
					bundleReqLibList.push(libName);
			}
			var mergedBundleProp = {
				'encoding': encoding,
				'requireLib': bundleReqLibList,
				'scriptsArr': bundleScripts,
				'cssArr': bundleCss
			};
			// - Case of empty bundle
			if (thingPropList.length === 0) {
				this.includeLibs(thingPropList, mergedBundleProp);
				this.thingDoneCallback(false);
				return;
			}
			// - Make ajax optList
			var optList = [];
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				optList.push({
					'method': 'GET',
					'url': thingPropList[i]['confUrl']
				});
			}
			// - Load all
			var that = this;
			++this.thingLoadCount;
			this.ajax.bundleAjax({
				'urls': optList,
				'done': function (rDataMap) {
					that.populateThingPropConf(thingPropList, rDataMap);
					var libScriptsLoader = that.includeLibs(thingPropList, mergedBundleProp);
					that.loadAllWDataPart1(thingPropList, mergedBundleProp, libScriptsLoader);
					that.thingDoneCallback();
				},
				'fail': this.failCallback
			});
		}

		private populateThingPropConf(thingPropList, rDataMap) {
			var conf;
			for (var i = 0, len = thingPropList.length; i < len; ++i) {
				conf = rDataMap[thingPropList[i]['confUrl']];
				if (conf === undefined)
					throw new Error('Missing conf for "' + thingPropList[i]['path'] + '"');
				thingPropList[i]['conf'] = conf;
			}
		}

		private includeLibs(thingPropList, mergedBundleProp): WLibScriptsLoader {
			var libScriptsLoader = new WLibScriptsLoader(this.libraries, this.services);
			// - Add into the lib loader
			var includedLibNames = {}, prop, conf, url;
			for (var i = 0, len = thingPropList.length; i < len; ++i) {
				prop = thingPropList[i];
				conf = prop['conf'];
				if (prop['type'] === 'L') {
					url = prop['bundleUrl'] + '/' + prop['path'];
					libScriptsLoader.add(conf['name'], url, WLoader.toFileList(conf['script']), conf['requireLib']);
					includedLibNames[conf['name']] = true;
				}
			}
			// - Include lib from other bundles
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				if (conf['requireLib'])
					this.requireAllLib(conf['requireLib'], includedLibNames);
			}
			this.requireAllLib(mergedBundleProp['requireLib'], includedLibNames);
			return libScriptsLoader;
		}

		private requireAllLib(arr: string[], includedLibNames: {}) {
			for (var i = 0, len = arr.length; i < len; ++i) {
				if (!includedLibNames[arr[i]] && !this.libraries.load(arr[i], false))
					throw new Error('In bundle "' + this.bundlePath + '", unknown library "' + arr[i] + '"');
			}
		}

		private loadAllWDataPart1(thingPropList, mergedBundleProp, libScriptsLoader: WLibScriptsLoader) {
			var i: number, len, scriptsToLoad = [], arr;
			// - Merged bundle - scripts
			arr = mergedBundleProp['scriptsArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					scriptsToLoad.push(arr[i]);
			}
			// - Merged bundle - css
			arr = mergedBundleProp['cssArr'];
			if (arr !== undefined) {
				for (var i = 0, len = arr.length; i < len; ++i)
					WLoader.addCssLinkElements(arr[i][0], arr[i][1]);
			}
			// - Embed things
			var listsByTypes = {'S': [], 'C': [], 'L': []};
			var confUrl, path, embedUrl, conf, type, encoding = mergedBundleProp['encoding'];
			for (i = 0, len = thingPropList.length; i < len; ++i) {
				path = thingPropList[i]['path'];
				confUrl = thingPropList[i]['confUrl'];
				type = thingPropList[i]['type'];
				conf = thingPropList[i]['conf'];
				if (conf['encoding'] !== undefined && encoding !== undefined && conf['encoding'] !== encoding)
					throw new Error('Encoding conflict in bundle "' + this.bundlePath + '" (' + encoding + '): embed "' + path + '" has ' + conf['encoding']);
				embedUrl = thingPropList[i]['bundleUrl'] + '/' + path;
				switch(type) {
					case 'L':
						if (conf['css'] !== undefined)
							WLoader.addCssLinkElements(embedUrl, WLoader.toFileList(conf['css']));
						listsByTypes[type].push({
							'name': conf['name']
						});
						break;
					case 'S':
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoader.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'alias': conf['alias']
						});
						break;
					case 'C':
						if (conf['css'] !== undefined)
							WLoader.addCssLinkElements(embedUrl, WLoader.toFileList(conf['css']));
						if (conf['script'] !== undefined)
							scriptsToLoad.push([embedUrl, WLoader.toFileList(conf['script'])]);
						listsByTypes[type].push({
							'name': conf['name'],
							'baseUrl': embedUrl,
							'tpl': WLoader.toFileList(conf['tpl'])
						});
						break;
					default:
						throw new Error('Bad embed type "' + type + '"');
				}
			}
			// - End
			this.loadAllWDataPart2(scriptsToLoad, listsByTypes, libScriptsLoader);
		}

		private loadAllWDataPart2(scriptsToLoad, listsByTypes, libScriptsLoader: WLibScriptsLoader) {
			var that = this, i: number, len: number, j: number, jLen: number, fileNames;
			// - Try to end function
			var oScriptsLoaded = false, lScriptsLoaded = false, ajaxEnded = false, tplRDataMap = null, endDone = false;
			var tryToEnd = function (decCount: boolean) {
				if (endDone) {
				}
				if (lScriptsLoaded && oScriptsLoaded && ajaxEnded) {
					that.registerAllWLibraries(listsByTypes['L']);
					that.registerAllWServices(listsByTypes['S']);
					that.registerAllWComponents(listsByTypes['C'], tplRDataMap);
					endDone = true;
				}
				that.thingDoneCallback(decCount);
			};
			// - Load lib scripts
			++this.thingLoadCount;
			libScriptsLoader.loadAll(function () {
				lScriptsLoaded = true;
				tryToEnd(true);
			});
			// - Load other scripts
			if (scriptsToLoad.length === 0)
				oScriptsLoaded = true;
			else {
				var scriptUrlList = [], group, baseUrl;
				for (i = 0, len = scriptsToLoad.length; i < len; ++i) {
					group = scriptsToLoad[i];
					baseUrl = group[0];
					fileNames = group[1];
					for (j = 0, jLen = fileNames.length; j < jLen; ++j)
						scriptUrlList.push(baseUrl + '/' + fileNames[j]);
				}
				++this.thingLoadCount;
				this.addScriptElements(scriptUrlList, function () {
					oScriptsLoaded = true;
					tryToEnd(true);
				});
			}
			// - Make optList for templates
			var optList = [], prop;
			for (i = 0, len = listsByTypes['C'].length; i < len; ++i) {
				prop = listsByTypes['C'][i];
				fileNames = prop['tpl'];
				if (fileNames) {
					for (j = 0, jLen = fileNames.length; j < jLen; ++j) {
						optList.push({
							'method': 'GET',
							'url': prop['baseUrl'] + '/' + fileNames[j],
							'rDataType': 'text'
						});
					}
				}
			}
			// - Load all templates
			if (optList.length === 0)
				ajaxEnded = true;
			else {
				++this.thingLoadCount;
				this.ajax.bundleAjax({
					'urls': optList,
					'done': function (rDataMap) {
						ajaxEnded = true;
						tplRDataMap = rDataMap;
						tryToEnd(true);
					},
					'fail': this.failCallback
				});
			}
			tryToEnd(false);
		}

		private registerAllWLibraries(lList) {
			var prop;
			for (var i = 0, len = lList.length; i < len; ++i) {
				prop = lList[i];
				this.libraries.register(prop['name'], null, null);
			}
		}

		private registerAllWServices(sList) {
			var prop;
			for (var i = 0, len = sList.length; i < len; ++i) {
				prop = sList[i];
				this.services.register(prop['name'], prop['baseUrl'], prop['alias'], null, null);
			}
		}

		private registerAllWComponents(cList, rDataMap) {
			var prop;
			for (var i = 0, len = cList.length; i < len; ++i) {
				prop = cList[i];
				this.registerWComponent(prop, rDataMap);
			}
		}

		private registerWComponent(prop, rDataMap) {
			var baseUrl = prop['baseUrl'], fileNames = prop['tpl'], html;
			if (fileNames === undefined)
				html = null;
			else {
				html = '';
				if (!rDataMap)
					rDataMap = {};
				var fUrl;
				for (var i = 0, len = fileNames.length; i < len; ++i) {
					fUrl = baseUrl + '/' + fileNames[i];
					if (rDataMap[fUrl] === undefined)
						throw new Error('Missing content for template "' + fUrl + '"');
					html += rDataMap[fUrl];
				}
				if (html === '')
					html = null;
			}
			this.components.register(prop['name'], baseUrl, null, null, html);
		}

		// --
		// -- Private - Tools
		// --

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

		private static getConfFileName(type: string) {
			switch(type) {
				case 'S':
					return 'serv.json';
				case 'C':
					return 'comp.json';
				case 'L':
					return 'lib.json';
				default:
					throw new Error('Invalid conf file type "' + type + '"');
			}
		}

		private addScriptElements(urlList, cb) {
			var waitedLoads = urlList.length;
			if (waitedLoads === 0) {
				cb();
				return;
			}
			for (var i = 0, len = urlList.length; i < len; ++i) {
				WLoader.addScriptElement(urlList[i], function () {
					--waitedLoads;
					if (waitedLoads === 0)
						cb();
				}, this.services);
			}
		}

		private static addCssLinkElements(baseUrl, fileNames) {
			for (var i = 0, len = fileNames.length; i < len; ++i)
				Loader.addCssLinkElement(baseUrl, fileNames[i]);
		}

		private static toFileList(script: any): string[] {
			return script ? (typeof script === 'string' ? [script] : script) : [];
		}
	}

	// ##
	// ## WLibScriptsLoader
	// ##

	class WLibScriptsLoader {

		private lib = {};
		private cb: Function;
		private scripts: {};
		private done: {};
		private loadingCount = 0;

		constructor(private libraries: Libraries, private services: Services) {
		}

		public add(libName: string, baseUrl: string, fileNameList: any, requireLib: string[]) {
			this.lib[libName] = {
				'baseUrl': baseUrl,
				'fileNameList': fileNameList,
				'requireLib': requireLib,
				'lastScript': fileNameList.length === 0 ? null : baseUrl + '/' + fileNameList[fileNameList.length - 1]
			};
		}

		public loadAll(cb: Function) {
			this.cb = cb;
			this.initScripts();
			this.loadReadyScripts();
		}

		private loadReadyScripts() {
			var notLoaded = [];
			for (var url in this.scripts) {
				if (!this.scripts.hasOwnProperty(url) || this.done[url] !== undefined)
					continue;
				notLoaded.push(url);
				if (this.areAllDone(this.scripts[url]))
					this.addScriptElement(url);
			}
			if (this.loadingCount === 0) {
				if (notLoaded.length > 0)
					throw new Error('Cannot load libraries (missing dependencies or loop?): ' + notLoaded.join(', '));
				if (!this.cb)
					throw new Error('WLibScriptsLoader has already ended');
				this.cb();
				this.cb = null;
			}
		}

		private addScriptElement(url) {
			++this.loadingCount;
			this.done[url] = false;
			var that = this;
			WLoader.addScriptElement(url, function () {
				--that.loadingCount;
				that.done[url] = true;
				that.loadReadyScripts();
			}, this.services);
		}

		private areAllDone(requireScripts: string[]): boolean {
			for (var i = 0, len = requireScripts.length; i < len; ++i) {
				if (!this.done[requireScripts[i]])
					return false;
			}
			return true;
		}

		private initScripts() {
			this.scripts = {};
			this.done = {};
			var fileNameList, baseUrl, requireScripts, url, i, len;
			for (var libName in this.lib) {
				if (!this.lib.hasOwnProperty(libName))
					continue;
				fileNameList = this.lib[libName]['fileNameList'];
				baseUrl = this.lib[libName]['baseUrl'];
				requireScripts = this.toRequireScripts(this.lib[libName]['requireLib']);
				for (i = 0, len = fileNameList.length; i < len; ++i) {
					url = baseUrl + '/' + fileNameList[i];
					this.scripts[url] = requireScripts;
					requireScripts = [url];
				}
			}
		}

		private toRequireScripts(requireLib: string[]): string[] {
			if (!requireLib)
				return [];
			var lib, scripts = [];
			for (var i = 0, len = requireLib.length; i < len; ++i) {
				if (this.libraries.load(requireLib[i], false))
					continue;
				lib = this.lib[requireLib[i]];
				if (lib === undefined)
					throw new Error('The required library "' + requireLib[i] + '" is not found');
				if (lib['lastScript'])
					scripts.push(lib['lastScript']);
			}
			return scripts;
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
					throw new Error('Class not found: "' + s + '"');
				fn = fn[arr[i]];
			}
			if (typeof fn !== 'function')
				throw new Error('Class not found: "' + s + '"');
			return fn;
		}

		public static isArray(data) {
			if (Array.isArray)
				return Array.isArray(data);
			return Object.prototype.toString.call(data) === '[object Array]'; // before EcmaScript 5.1
		}
	}

	function globalScopeEval(script: string) {
		// - Check 'use strict'
		var needle = ' use strict', len = needle.length;
		var strict = script.length > len;
		if (strict) {
			for (var i = 1; i < len; ++i) {
				if (script[i] !== needle[i]) {
					strict = false;
					break;
				}
			}
		}
		// - Eval
		if (strict) {
			var tag = document.createElement('script');
			tag.text = script;
			document.head.appendChild(tag);
			document.head.removeChild(tag);
		} else {
			// Thanks to https://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
			var glo = window || this;
			if (glo.execScript) {
				glo.execScript(script); // IE
				return;
			}
			var fn = function() {
				glo['eval']['call'](glo, script);
			};
			fn();
		}
	}
}
