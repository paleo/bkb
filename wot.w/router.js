/// <reference path="loader.ts" />
var wot;
(function (wot) {
    

    // ##
    // ## Router
    // ##
    var Router = (function () {
        function Router(sc) {
            this.sc = sc;
            this.listeners = {};
            this.selList = [];
            this.log = sc.getService('wot.Log');
        }
        /**
        *
        * @param selList
        * @param urlController
        * @returns Function A callback that deletes the added selectors
        */
        Router.prototype.addSelectors = function (selList, urlController) {
            var keys, regex, indices = [], index;
            for (var i = 0, len = selList.length; i < len; ++i) {
                keys = [];
                regex = Router.pathToRegexp(selList[i], keys, true, true);
                index = this.selList.length;
                indices.push(index);
                this.selList[index] = {
                    'sel': selList[i],
                    'urlController': urlController,
                    'regex': regex,
                    'keys': keys
                };
            }
            var that = this;
            return function () {
                for (var i = 0, len = indices.length; i < len; ++i)
                    delete that.selList[indices[i]];
            };
        };

        Router.prototype.start = function (opt) {
            if (typeof opt === "undefined") { opt = {}; }
            // - Options
            this.withHistory = opt['history'] !== false;
            this.withHashBang = opt['hashBang'] ? true : false;

            // - Base URL
            var ac = this.sc.getApplicationContext();
            this.baseUrl = ac.properties['baseUrl'];
            if (this.withHashBang)
                this.baseUrl += '#!';
            this.firstRelUrl = ac.properties['firstRelUrl'];
            if (!this.firstRelUrl)
                this.firstRelUrl = Router.getDefaultFirstRelUrl(this.baseUrl, this.withHashBang);
            if (this.withHistory) {
                var that = this;
                window.onpopstate = function (e) {
                    try  {
                        var relUrl = e.state === null ? that.firstRelUrl : e.state['relUrl'];
                        that.doGoTo(relUrl, false);
                    } catch (e) {
                        that.log.unexpectedErr(e);
                    }
                };
            }
            this.doGoTo(this.firstRelUrl, false);
        };

        // --
        // -- Public
        // --
        /**
        * @param cb The listener
        * @returns Function a callback for removing the listener
        */
        Router.prototype.addChangeListener = function (cb) {
            return this.addListener('change', cb);
        };

        /**
        * @param cb The listener
        * @returns Function a callback for removing the listener
        */
        Router.prototype.addBeforeListener = function (cb) {
            return this.addListener('before', cb);
        };

        Router.prototype.goTo = function (relUrl) {
            return this.doGoTo(relUrl, true);
        };

        Router.prototype.getCurrentUrlProps = function () {
            return this.curUrlProps;
        };

        // --
        // -- Private
        // --
        Router.prototype.doGoTo = function (relUrl, changeHist) {
            if (!relUrl)
                relUrl = '/';
            else if (relUrl.charAt(0) !== '/')
                relUrl = Router.appendUrl(this.curUrlProps ? this.curUrlProps['relUrl'] : '/', relUrl);
            if (this.curUrlProps && this.curUrlProps['relUrl'] === relUrl)
                return true;
            var selProp, args, up = null;
            for (var k in this.selList) {
                if (!this.selList.hasOwnProperty(k))
                    continue;
                selProp = this.selList[k];
                args = Router.matchRelUrl(relUrl, selProp['regex'], selProp['keys']);
                if (args) {
                    up = {
                        'relUrl': relUrl,
                        'args': args,
                        'sel': selProp['sel']
                    };
                    if (!selProp['urlController'].fillUrlProps(up))
                        return false;
                    if (Object.freeze) {
                        Object.freeze(args);
                        Object.freeze(up);
                    }
                    break;
                }
            }
            if (up === null)
                return false;
            if (!this.fireListeners('before', up, true))
                return false;
            this.curUrlProps = up;
            this.fireListeners('change', up);
            if (changeHist && this.withHistory)
                window.history.pushState({ 'relUrl': relUrl }, up['title'], this.baseUrl + relUrl);
            document.title = up['title'];
            return true;
        };

        Router.prototype.addListener = function (type, cb) {
            var listeners = this.listeners[type];
            if (listeners === undefined)
                listeners = this.listeners[type] = [];
            var newId = listeners.length;
            listeners[newId] = cb;
            return function () {
                listeners.splice(newId, 1);
            };
        };

        Router.prototype.fireListeners = function (type, up, stopOnFalse) {
            if (typeof stopOnFalse === "undefined") { stopOnFalse = false; }
            var listeners = this.listeners[type];
            if (listeners === undefined)
                return true;
            var retFalse;
            for (var i = 0, len = listeners.length; i < len; ++i) {
                retFalse = listeners[i](up) === false;
                if (stopOnFalse && retFalse)
                    return false;
            }
            return true;
        };

        Router.matchRelUrl = function (relUrl, regex, keys) {
            var m = regex.exec(relUrl);
            if (m === null)
                return null;
            var args = {};
            for (var i = 1, len = m.length; i < len; ++i) {
                var key = keys[i - 1];
                if (key)
                    args[key['name']] = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
            }
            return args;
        };

        Router.pathToRegexp = function (path, keys, sensitive, strict) {
            if (path instanceof RegExp)
                return path;
            if (path instanceof Array)
                path = '(' + path.join('|') + ')';
            path = path.concat(strict ? '' : '/?').replace(/\/\(/g, '(?:/').replace(/\+/g, '__plus__').replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function (_, slash, format, key, capture, optional) {
                keys.push({ 'name': key, 'optional': optional ? true : false });
                slash = slash || '';
                return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
            }).replace(/([\/.])/g, '\\$1').replace(/__plus__/g, '(.+)').replace(/\*/g, '(.*)');
            return new RegExp('^' + path + '$', sensitive ? '' : 'i');
        };

        Router.appendUrl = function (a, b) {
            var trailingSlash = a.slice(-1) === '/';
            if (trailingSlash)
                return b.charAt(0) === '/' ? a + b.slice(1) : a + b;
            return a + '/' + b;
        };

        Router.getDefaultFirstRelUrl = function (baseUrl, withHashBang) {
            if (withHashBang) {
                var hash = window.location.hash;
                if (!hash || hash.length <= 2)
                    return '/';
                return hash.slice(2);
            }
            var path = window.location.pathname;
            var baseLen = baseUrl.length;
            if (path.length <= baseLen)
                return '/';
            if (path.slice(0, baseLen) !== baseUrl)
                return '/';
            return path.slice(baseLen);
        };
        return Router;
    })();
    wot.Router = Router;
})(wot || (wot = {}));
//# sourceMappingURL=router.js.map
