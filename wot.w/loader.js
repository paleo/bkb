/// <reference path="ajax.ts" />
var wot;
(function (wot) {
    'use strict';

    

    

    // ##
    // ## ApplicationContext
    // ##
    var ApplicationContext = (function () {
        function ApplicationContext(properties, debug) {
            if (typeof debug === "undefined") { debug = false; }
            this.properties = properties;
            this.debug = debug;
            if (Object.freeze)
                Object.freeze(properties);
            this.libraries = new Libraries(this);
            this.services = new Services(this);
            this.components = new Components(this);
            this.bundles = new Bundles(this);
            this.loader = new Loader(this, this.libraries, this.services, this.components, this.bundles);
        }
        ApplicationContext.prototype.isDebug = function () {
            return this.debug;
        };

        ApplicationContext.prototype.getService = function (serviceName) {
            return this.services.get(serviceName);
        };

        ApplicationContext.prototype.createComponent = function (componentName, props, st) {
            return this.components.create(componentName, props, st);
        };

        ApplicationContext.prototype.getServiceContext = function (serviceName) {
            return this.services.getServiceContext(serviceName);
        };

        ApplicationContext.prototype.getComponentTypeContext = function (componentName) {
            return this.components.getComponentTypeContext(componentName);
        };

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
        ApplicationContext.prototype.loadBundle = function (bundlePath, opt) {
            if (typeof opt === "undefined") { opt = {}; }
            this.loader.loadBundle(bundlePath, opt['done'], opt['fail'], opt['start'], opt['version'], opt['autoLoadCss'], opt['w']);
        };

        ApplicationContext.prototype.hasLib = function (libName) {
            return this.libraries.has(libName);
        };

        ApplicationContext.prototype.includeLib = function (libName) {
            return this.libraries.load(libName, false);
        };

        ApplicationContext.prototype.requireLib = function (libName) {
            if (typeof libName === 'string')
                this.libraries.load(libName, true);
            else {
                for (var i = 0, len = libName.length; i < len; ++i)
                    this.libraries.load(libName[i], true);
            }
        };

        ApplicationContext.prototype.requireService = function (serviceName) {
            this.services.getServiceContext(serviceName);
        };

        ApplicationContext.prototype.requireComponent = function (componentName) {
            this.components.getComponentTypeContext(componentName);
        };
        return ApplicationContext;
    })();
    wot.ApplicationContext = ApplicationContext;

    // ##
    // ## ServiceContext
    // ##
    var ServiceContext = (function () {
        function ServiceContext(ac, serviceName, serviceBaseUrl, cl) {
            this.ac = ac;
            this.serviceName = serviceName;
            this.serviceBaseUrl = serviceBaseUrl;
            this.service = new cl(this);
        }
        ServiceContext.prototype.getApplicationContext = function () {
            return this.ac;
        };

        ServiceContext.prototype.getServiceName = function () {
            return this.serviceName;
        };

        ServiceContext.prototype.getServiceBaseUrl = function () {
            return this.serviceBaseUrl;
        };

        ServiceContext.prototype.getOwnService = function () {
            return this.service;
        };

        ServiceContext.prototype.getService = function (serviceName) {
            return this.ac.getService(serviceName);
        };

        ServiceContext.prototype.createComponent = function (componentName, props, st) {
            return this.ac.createComponent(componentName, props, st);
        };

        ServiceContext.prototype.hasLib = function (libName) {
            return this.ac.hasLib(libName);
        };

        ServiceContext.prototype.includeLib = function (libName) {
            return this.ac.includeLib(libName);
        };

        ServiceContext.prototype.requireLib = function (libName) {
            this.ac.requireLib(libName);
        };

        ServiceContext.prototype.requireService = function (serviceName) {
            this.ac.requireService(serviceName);
        };

        ServiceContext.prototype.requireComponent = function (componentName) {
            this.ac.requireComponent(componentName);
        };
        return ServiceContext;
    })();
    wot.ServiceContext = ServiceContext;

    // ##
    // ## ComponentContext
    // ##
    var ComponentContext = (function () {
        function ComponentContext(ac, ctc, st) {
            this.ac = ac;
            this.ctc = ctc;
            this.st = st;
        }
        ComponentContext.prototype.getApplicationContext = function () {
            return this.ac;
        };

        ComponentContext.prototype.getLiveState = function () {
            return this.st;
        };

        ComponentContext.prototype.getComponentName = function () {
            return this.ctc.getComponentName();
        };

        ComponentContext.prototype.getComponentBaseUrl = function () {
            return this.ctc.getComponentBaseUrl();
        };

        ComponentContext.prototype.getTemplate = function (sel, elMap) {
            if (typeof elMap === "undefined") { elMap = {}; }
            return this.ctc.getTemplate(sel, elMap);
        };

        ComponentContext.prototype.createOwnComponent = function (props, st) {
            if (typeof props === "undefined") { props = null; }
            if (typeof st === "undefined") { st = null; }
            return this.ctc.createOwnComponent(props, st ? st : this.st);
        };

        ComponentContext.prototype.createComponent = function (componentName, props, st) {
            if (typeof props === "undefined") { props = null; }
            if (typeof st === "undefined") { st = null; }
            return this.ac.createComponent(componentName, props, st ? st : this.st);
        };

        ComponentContext.prototype.getService = function (serviceName) {
            return this.ac.getService(serviceName);
        };

        ComponentContext.prototype.hasLib = function (libName) {
            return this.ac.hasLib(libName);
        };

        ComponentContext.prototype.includeLib = function (libName) {
            return this.ac.includeLib(libName);
        };

        ComponentContext.prototype.requireLib = function (libName) {
            this.ac.requireLib(libName);
        };

        ComponentContext.prototype.requireService = function (serviceName) {
            this.ac.requireService(serviceName);
        };

        ComponentContext.prototype.requireComponent = function (componentName) {
            this.ac.requireComponent(componentName);
        };

        // - Delegate
        ComponentContext.prototype.addComp = function (comp) {
            if (this.compList === undefined)
                this.compList = [];
            this.compList.push(comp);
            return comp;
        };

        ComponentContext.prototype.addListenerRm = function (cb) {
            if (this.rmCbList === undefined)
                this.rmCbList = [];
            this.rmCbList.push(cb);
        };

        ComponentContext.prototype.propagReset = function () {
            this.propagCall('reset');
        };

        ComponentContext.prototype.propagSetEnabled = function (b) {
            this.propagCall('enable', b);
        };

        ComponentContext.prototype.propagCall = function (method, arg) {
            if (typeof arg === "undefined") { arg = undefined; }
            if (this.compList === undefined)
                return;
            for (var i = 0, len = this.compList.length; i < len; ++i) {
                if (this.compList[i][method]) {
                    if (arg === undefined)
                        this.compList[i][method]();
                    else
                        this.compList[i][method](arg);
                }
            }
        };

        ComponentContext.prototype.propagDestroy = function () {
            if (this.rmCbList !== undefined) {
                for (var i = 0, len = this.rmCbList.length; i < len; ++i)
                    this.rmCbList[i]();
            }
            this.rmCbList = null;
            this.propagCall('destroy');
            this.compList = null;
        };
        return ComponentContext;
    })();
    wot.ComponentContext = ComponentContext;

    // ##
    // ## ComponentTypeContext
    // ##
    var ComponentTypeContext = (function () {
        function ComponentTypeContext(ac, componentName, componentBaseUrl, tplArr, tplSel, tplLab) {
            this.ac = ac;
            this.componentName = componentName;
            this.componentBaseUrl = componentBaseUrl;
            this.tplArr = tplArr;
            this.tplSel = tplSel;
            this.tplLab = tplLab;
            // TODO Reference all labels in the l10n service
            // tplLab: {'lbl-id': 'The Label Key (= default value)'} where the label ID is a CSS class and the label key is
            // the key in JSON language files
        }
        ComponentTypeContext.prototype.getComponentName = function () {
            return this.componentName;
        };

        ComponentTypeContext.prototype.getComponentBaseUrl = function () {
            return this.componentBaseUrl;
        };

        ComponentTypeContext.prototype.getTemplate = function (sel, elMap) {
            if (typeof elMap === "undefined") { elMap = {}; }
            if (this.tplSel[sel] === undefined)
                throw new Error('Unknown template "' + sel + '" in component "' + this.componentName + '"');
            var el = this.tplArr[this.tplSel[sel]].cloneNode(true);
            this.fillPlaceholders(el, elMap);
            this.fillLabels(el);
            return el;
        };

        ComponentTypeContext.prototype.createOwnComponent = function (props, st) {
            return this.ac.createComponent(this.componentName, props, st);
        };

        ComponentTypeContext.prototype.fillPlaceholders = function (el, elMap) {
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
        };

        ComponentTypeContext.prototype.fillLabels = function (el) {
            var list;
            for (var lblId in this.tplLab) {
                if (!this.tplLab.hasOwnProperty(lblId))
                    continue;
                list = ComponentTypeContext.getElementsByClassName(lblId, el);
                if (list.length !== 1)
                    continue;
                list[0].textContent = this.tplLab[lblId]; // TODO Use the l10n label in the current language here
            }
        };

        ComponentTypeContext.getElementsByClassName = function (className, fromElem) {
            if (fromElem.getElementsByClassName)
                return fromElem.getElementsByClassName(className);

            // - Fallback for IE8, thanks to http://code-tricks.com/javascript-get-element-by-class-name/
            var descendants = fromElem.getElementsByTagName('*'), i = -1, e, list = [];
            while (e = descendants[++i])
                ((' ' + (e['class'] || e.className) + ' ').indexOf(' ' + className + ' ') !== -1) && list.push(e);
            return list;
        };
        return ComponentTypeContext;
    })();
    wot.ComponentTypeContext = ComponentTypeContext;

    // ##
    // ## Bundles
    // ##
    var Bundles = (function () {
        function Bundles(ac) {
            this.ac = ac;
            this.map = {};
        }
        Bundles.prototype.register = function (bundlePath, bundleUrl, requireLib, script, mainClassName) {
            if (this.map[bundlePath] !== undefined)
                throw new Error('The bundle "' + bundlePath + '" is already registered');
            if (requireLib)
                this.ac.requireLib(requireLib);
            if (script)
                globalScopeEval(script);
            var cl = null;
            if (mainClassName)
                cl = LoaderHelper.stringToClass(mainClassName);
            this.map[bundlePath] = cl ? new cl(this.ac, bundleUrl) : null;
        };

        Bundles.prototype.start = function (bundlePath, el) {
            var main = this.map[bundlePath];
            if (main === undefined)
                throw new Error('Unknown bundle "' + bundlePath + '"');
            if (main === null)
                throw new Error('Cannot start the bundle "' + bundlePath + '": it hasn\'t a main class');
            if (main.start === undefined)
                throw new Error('Cannot start the bundle "' + bundlePath + '": the main class should have a start method');
            main.start(el);
        };
        return Bundles;
    })();

    // ##
    // ## Libraries
    // ##
    var Libraries = (function () {
        function Libraries(ac) {
            this.ac = ac;
            this.map = {};
        }
        Libraries.prototype.register = function (libName, requireLib, script) {
            if (this.map[libName] !== undefined)
                throw new Error('The lib "' + libName + '" is already declared');
            this.map[libName] = {
                'requireLib': requireLib,
                'script': script,
                'loading': false
            };
        };

        Libraries.prototype.has = function (libName) {
            return this.map[libName] !== undefined;
        };

        Libraries.prototype.load = function (libName, req) {
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
        };
        return Libraries;
    })();

    // ##
    // ## Services
    // ##
    var Services = (function () {
        function Services(ac) {
            this.ac = ac;
            this.map = {};
            this.register('wot.Log', null, null, null, null);
            this.register('wot.Ajax', null, null, null, null);
            this.register('wot.Router', null, null, null, null);
        }
        Services.prototype.register = function (serviceName, serviceBaseUrl, aliasStrOrList, requireLib, script) {
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
        };

        Services.prototype.get = function (serviceName) {
            var sc = this.getServiceContext(serviceName);
            return sc.getOwnService();
        };

        Services.prototype.getServiceContext = function (serviceName) {
            var prop = this.map[serviceName];
            if (prop === undefined)
                throw new Error('Unknown service "' + serviceName + '"');
            if (prop['sc'] === null) {
                if (prop['requireLib'])
                    this.ac.requireLib(prop['requireLib']);
                if (prop['script'] !== null)
                    globalScopeEval(prop['script']);
                var cl = LoaderHelper.stringToClass(prop['name']);
                prop['sc'] = new ServiceContext(this.ac, prop['name'], prop['baseUrl'], cl);
            }
            return prop['sc'];
        };
        return Services;
    })();

    // ##
    // ## Components
    // ##
    var Components = (function () {
        function Components(ac) {
            this.ac = ac;
            this.map = {};
            this.log = ac.getService('wot.Log');
            this.tplParser = new TemplateParser();
        }
        Components.prototype.register = function (componentName, componentBaseUrl, requireLib, script, tplStr) {
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
        };

        Components.prototype.create = function (componentName, props, st) {
            var cc = new ComponentContext(this.ac, this.getComponentTypeContext(componentName), st);
            var cl = LoaderHelper.stringToClass(componentName);
            return new cl(cc, props ? props : {});
        };

        Components.prototype.getComponentTypeContext = function (componentName) {
            var prop = this.map[componentName];
            if (prop === undefined)
                throw new Error('Unknown component "' + componentName + '"');
            if (prop['cc'] === null) {
                if (prop['requireLib'])
                    this.ac.requireLib(prop['requireLib']);
                if (prop['script'] !== null)
                    globalScopeEval(prop['script']);
                prop['cc'] = new ComponentTypeContext(this.ac, componentName, prop['baseUrl'], prop['tplArr'], prop['tplSel'], prop['tplLab']);
            }
            return prop['cc'];
        };
        Components.DATA_PH = 'data-wot-mYr4-ph';
        return Components;
    })();

    // ##
    // ## TemplateParser
    // ##
    var TemplateParser = (function () {
        function TemplateParser() {
        }
        TemplateParser.prototype.parse = function (componentName, templatesStr) {
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
        };

        TemplateParser.prototype.getBySelMap = function () {
            return this.bySelMap;
        };

        TemplateParser.prototype.getLabels = function () {
            return this.labels;
        };

        TemplateParser.prototype.addTplSel = function (rmSelSet, sel, tplId) {
            if (rmSelSet[sel])
                return false;
            if (this.bySelMap[sel] !== undefined) {
                delete this.bySelMap[sel];
                rmSelSet[sel] = true;
            } else
                this.bySelMap[sel] = tplId;
            return true;
        };

        TemplateParser.prototype.addMarkers = function (str) {
            var pieces = [];
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
        };

        TemplateParser.prototype.addPlaceholder = function (pieces, name) {
            var name = TemplateParser.trim(name);
            if (this.placeholders[name])
                throw new Error('Conflict in templates of component "' + this.componentName + '": several placeholders "' + name + '"');
            pieces.push('<span ' + Components.DATA_PH + '="' + name + '"></span>');
            this.placeholders[name] = true;
        };

        TemplateParser.prototype.addLabel = function (pieces, cmd, lblStr) {
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
        };

        TemplateParser.prototype.makeLblId = function () {
            if (this.lblPrefix === null)
                this.lblPrefix = 'wotl10n~' + this.componentName.replace(/\./g, '~') + '~';
            return this.lblPrefix + (this.lblCount++);
        };

        TemplateParser.formatLabelStr = function (s) {
            return s[0] === ' ' ? s.slice(1) : s;
        };

        TemplateParser.trim = function (s) {
            return String.prototype.trim ? s.trim() : s.replace(/^\s+|\s+$/g, '');
        };

        TemplateParser.isEscaped = function (str, index) {
            var count = 0;
            while (--index >= 0 && str[index] === '\\')
                ++count;
            return count % 2 === 1;
        };

        TemplateParser.unescape = function (s) {
            return s.replace(/\\\\/g, '\\');
        };
        return TemplateParser;
    })();

    // ##
    // ## Loader
    // ##
    var Loader = (function () {
        function Loader(ac, libraries, services, components, bundles) {
            this.ac = ac;
            this.libraries = libraries;
            this.services = services;
            this.components = components;
            this.bundles = bundles;
            this.bundlePropMap = {};
            this.appUrl = ac.properties['appUrl'];
            this.ajax = this.services.get('wot.Ajax');
        }
        Loader.prototype.loadBundle = function (bundlePath, doneCallback, failCallback, startOnElem, version, autoLoadCss, wMode) {
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
                var wLoader = new WLoader(this.libraries, this.services, this.components, this.bundles, this, bundlePath, bundleUrl, version, loadDone, loadFail);
                wLoader.loadWBundle();
            } else
                this.loadNormalBundle(bundlePath, bundleUrl, loadDone, loadFail, autoLoadCss);
        };

        // --
        // -- Internal
        // --
        Loader.prototype.loadBundles = function (bundlePaths, doneCallback, failCallback, wMode) {
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
        };

        Loader.addCssLinkElement = function (baseUrl, fileName) {
            var elem = document.createElement('link');
            elem.rel = 'stylesheet';
            elem.type = 'text/css';

            //elem.media = 'all';
            elem.href = baseUrl + '/' + fileName;
            document.head.appendChild(elem);
        };

        // --
        // -- Private
        // --
        Loader.prototype.loadNormalBundle = function (bundlePath, bundleUrl, doneCallback, failCallback, autoLoadCss) {
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
        };

        Loader.prototype.onLoadedNormalBundle = function (bundlePath, bundleUrl, bundleName, doneCallback, failCallback, bundleData, autoLoadedCss) {
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
        };

        Loader.prototype.registerNormalBundle = function (bundlePath, bundleUrl, bundleData) {
            var name, data;

            // - Register libraries
            var servMap = bundleData['libraries'];
            if (servMap) {
                for (name in servMap) {
                    if (!servMap.hasOwnProperty(name))
                        continue;
                    data = servMap[name];
                    this.libraries.register(name, data['requireLib'], data['script']);
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
                }
            }
            this.bundles.register(bundlePath, bundleUrl, bundleData['requireLib'], bundleData['script'], bundleData['main']);
        };

        Loader.getLastDirName = function (path) {
            var i = path.lastIndexOf('/');
            return i === -1 ? path : path.slice(i + 1);
        };
        Loader.WORK_IN_PROGRESS = '.w';
        Loader.S_LOADING = 1;
        Loader.S_READY = 2;
        Loader.S_ERROR = 3;
        return Loader;
    })();

    // ##
    // ## WLoader
    // ##
    var WLoader = (function () {
        function WLoader(libraries, services, components, bundles, loader, bundlePath, bundleUrl, version, doneCallback, failCallback) {
            this.libraries = libraries;
            this.services = services;
            this.components = components;
            this.bundles = bundles;
            this.loader = loader;
            this.bundlePath = bundlePath;
            this.bundleUrl = bundleUrl;
            this.thingLoadCount = 0;
            this.waitedPreloads = 0;
            this.waitedBundleConf = 0;
            this.embedBundleList = [];
            this.ajax = this.services.get('wot.Ajax');
            var that = this;
            var doneReported = false;
            this.thingDoneCallback = function (decCount) {
                if (typeof decCount === "undefined") { decCount = true; }
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
        WLoader.prototype.loadWBundle = function () {
            this.doLoadWBundle(this.bundlePath, this.bundleUrl);
        };

        // --
        // -- Internal
        // --
        WLoader.addScriptElement = function (url, cb, services) {
            var ready = function () {
                if (cb) {
                    try  {
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
        };

        // --
        // -- Private - Embed bundles
        // --
        WLoader.prototype.doLoadWBundle = function (bundlePath, bundleUrl) {
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
                    }
                    that.loadAllEmbedBundles();
                },
                'fail': this.failCallback
            });
        };

        WLoader.prototype.loadEmbedBundlesConf = function (bundlePath, bundleUrl, bundleConf) {
            var embed = bundleConf['embed'];
            if (embed === undefined)
                return;
            var dir;
            for (var i = 0, len = embed.length; i < len; ++i) {
                dir = embed[i];
                if (WLoader.getType(dir) === 'BW')
                    this.doLoadWBundle(bundlePath + '/' + dir, bundleUrl + '/' + dir);
            }
        };

        WLoader.prototype.loadAllEmbedBundles = function () {
            if (this.waitedPreloads > 0 || this.waitedBundleConf > 0)
                return;
            this.loadAllWConf();
        };

        // --
        // -- Private - Libraries, Services, Components
        // --
        WLoader.prototype.loadAllWConf = function () {
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
        };

        WLoader.prototype.populateThingPropConf = function (thingPropList, rDataMap) {
            var conf;
            for (var i = 0, len = thingPropList.length; i < len; ++i) {
                conf = rDataMap[thingPropList[i]['confUrl']];
                if (conf === undefined)
                    throw new Error('Missing conf for "' + thingPropList[i]['path'] + '"');
                thingPropList[i]['conf'] = conf;
            }
        };

        WLoader.prototype.includeLibs = function (thingPropList, mergedBundleProp) {
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

            for (i = 0, len = thingPropList.length; i < len; ++i) {
                if (conf['requireLib'])
                    this.requireAllLib(conf['requireLib'], includedLibNames);
            }
            this.requireAllLib(mergedBundleProp['requireLib'], includedLibNames);
            return libScriptsLoader;
        };

        WLoader.prototype.requireAllLib = function (arr, includedLibNames) {
            for (var i = 0, len = arr.length; i < len; ++i) {
                if (!includedLibNames[arr[i]] && !this.libraries.load(arr[i], false))
                    throw new Error('In bundle "' + this.bundlePath + '", unknown library "' + arr[i] + '"');
            }
        };

        WLoader.prototype.loadAllWDataPart1 = function (thingPropList, mergedBundleProp, libScriptsLoader) {
            var i, len, scriptsToLoad = [], arr;

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
            var listsByTypes = { 'S': [], 'C': [], 'L': [] };
            var confUrl, path, embedUrl, conf, type, encoding = mergedBundleProp['encoding'];
            for (i = 0, len = thingPropList.length; i < len; ++i) {
                path = thingPropList[i]['path'];
                confUrl = thingPropList[i]['confUrl'];
                type = thingPropList[i]['type'];
                conf = thingPropList[i]['conf'];
                if (conf['encoding'] !== undefined && encoding !== undefined && conf['encoding'] !== encoding)
                    throw new Error('Encoding conflict in bundle "' + this.bundlePath + '" (' + encoding + '): embed "' + path + '" has ' + conf['encoding']);
                embedUrl = thingPropList[i]['bundleUrl'] + '/' + path;
                switch (type) {
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
        };

        WLoader.prototype.loadAllWDataPart2 = function (scriptsToLoad, listsByTypes, libScriptsLoader) {
            var that = this, i, len, j, jLen, fileNames;

            // - Try to end function
            var oScriptsLoaded = false, lScriptsLoaded = false, ajaxEnded = false, tplRDataMap = null;
            var tryToEnd = function (decCount) {
                if (lScriptsLoaded && oScriptsLoaded && ajaxEnded) {
                    that.registerAllWLibraries(listsByTypes['L']);
                    that.registerAllWServices(listsByTypes['S']);
                    that.registerAllWComponents(listsByTypes['C'], tplRDataMap);
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
        };

        WLoader.prototype.registerAllWLibraries = function (lList) {
            var prop;
            for (var i = 0, len = lList.length; i < len; ++i) {
                prop = lList[i];
                this.libraries.register(prop['name'], null, null);
            }
        };

        WLoader.prototype.registerAllWServices = function (sList) {
            var prop;
            for (var i = 0, len = sList.length; i < len; ++i) {
                prop = sList[i];
                this.services.register(prop['name'], prop['baseUrl'], prop['alias'], null, null);
            }
        };

        WLoader.prototype.registerAllWComponents = function (cList, rDataMap) {
            var prop;
            for (var i = 0, len = cList.length; i < len; ++i) {
                prop = cList[i];
                this.registerWComponent(prop, rDataMap);
            }
        };

        WLoader.prototype.registerWComponent = function (prop, rDataMap) {
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
        };

        // --
        // -- Private - Tools
        // --
        WLoader.getType = function (dir) {
            var last = dir.length - 1;
            if (last <= 2 || dir[last - 1] !== '.')
                throw new Error('Invalid embed "' + dir + '"');
            switch (dir[last]) {
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
        };

        WLoader.getConfFileName = function (type) {
            switch (type) {
                case 'S':
                    return 'serv.json';
                case 'C':
                    return 'comp.json';
                case 'L':
                    return 'lib.json';
                default:
                    throw new Error('Invalid conf file type "' + type + '"');
            }
        };

        WLoader.prototype.addScriptElements = function (urlList, cb) {
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
        };

        WLoader.addCssLinkElements = function (baseUrl, fileNames) {
            for (var i = 0, len = fileNames.length; i < len; ++i)
                Loader.addCssLinkElement(baseUrl, fileNames[i]);
        };

        WLoader.toFileList = function (script) {
            return script ? (typeof script === 'string' ? [script] : script) : [];
        };
        return WLoader;
    })();

    // ##
    // ## WLibScriptsLoader
    // ##
    var WLibScriptsLoader = (function () {
        function WLibScriptsLoader(libraries, services) {
            this.libraries = libraries;
            this.services = services;
            this.lib = {};
            this.loadingCount = 0;
        }
        WLibScriptsLoader.prototype.add = function (libName, baseUrl, fileNameList, requireLib) {
            this.lib[libName] = {
                'baseUrl': baseUrl,
                'fileNameList': fileNameList,
                'requireLib': requireLib,
                'lastScript': fileNameList.length === 0 ? null : baseUrl + '/' + fileNameList[fileNameList.length - 1]
            };
        };

        WLibScriptsLoader.prototype.loadAll = function (cb) {
            this.cb = cb;
            this.initScripts();
            this.loadReadyScripts();
        };

        WLibScriptsLoader.prototype.loadReadyScripts = function () {
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
        };

        WLibScriptsLoader.prototype.addScriptElement = function (url) {
            ++this.loadingCount;
            this.done[url] = false;
            var that = this;
            WLoader.addScriptElement(url, function () {
                --that.loadingCount;
                that.done[url] = true;
                that.loadReadyScripts();
            }, this.services);
        };

        WLibScriptsLoader.prototype.areAllDone = function (requireScripts) {
            for (var i = 0, len = requireScripts.length; i < len; ++i) {
                if (!this.done[requireScripts[i]])
                    return false;
            }
            return true;
        };

        WLibScriptsLoader.prototype.initScripts = function () {
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
        };

        WLibScriptsLoader.prototype.toRequireScripts = function (requireLib) {
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
        };
        return WLibScriptsLoader;
    })();

    // ##
    // ## LoaderHelper
    // ##
    var LoaderHelper = (function () {
        function LoaderHelper() {
        }
        LoaderHelper.stringToClass = function (s) {
            var arr = s.split('.');
            var fn = window || this;
            for (var i = 0, len = arr.length; i < len; ++i) {
                if (fn === undefined)
                    throw new Error('Class not found: "' + s + '"');
                fn = fn[arr[i]];
            }
            if (typeof fn !== 'function')
                throw new Error('Class not found: "' + s + '"');
            return fn;
        };
        return LoaderHelper;
    })();

    function globalScopeEval(script) {
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
            var fn = function () {
                glo['eval']['call'](glo, script);
            };
            fn();
        }
    }
})(wot || (wot = {}));
//# sourceMappingURL=loader.js.map
