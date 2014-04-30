var wotext;
(function (wotext) {
    'use strict';

    

    /**
    *
    * @param jsonObjOrArr Array|Object
    * @param opt Object {'indexedMapProp': '_index'}
    * @returns {wotext.Dataset}
    */
    function createDataset(jsonObjOrArr, opt) {
        if (typeof opt === "undefined") { opt = {}; }
        var shelf = new DatasetShelf(opt);
        return shelf.createRoot(jsonObjOrArr);
    }
    wotext.createDataset = createDataset;

    // ##
    // ## DatasetHelper
    // ##
    var DatasetHelper = (function () {
        function DatasetHelper() {
        }
        DatasetHelper.isArray = function (data) {
            if (Array.isArray)
                return Array.isArray(data);
            return Object.prototype.toString.call(data) === '[object Array]';
        };

        DatasetHelper.cloneData = function (o) {
            if (typeof JSON !== 'undefined')
                return JSON.parse(JSON.stringify(o));
            return eval(DatasetHelper.jsonStringify(o));
        };

        DatasetHelper.jsonParse = function (s) {
            if (typeof JSON !== 'undefined')
                return JSON.parse(s);
            return eval(s);
        };

        DatasetHelper.jsonStringify = function (o) {
            if (typeof JSON !== 'undefined')
                return JSON.stringify(o);

            // - Before EcmaScript 5
            var t = typeof (o);
            if (t != 'object' || o === null) {
                if (t == 'string')
                    o = "'" + o + "'";
                return String(o);
            }
            var n, v, json = [], arr = DatasetHelper.isArray(o);
            for (n in o) {
                if (!o.hasOwnProperty(n))
                    continue;
                v = o[n];
                t = typeof (v);
                if (t == 'string')
                    v = "'" + v + "'";
                else if (t == 'object' && v !== null)
                    v = DatasetHelper.jsonStringify(v);
                json.push((arr ? '' : "'" + n + "':") + String(v));
            }
            return (arr ? '[' : '{') + String(json) + (arr ? ']' : '}');
        };
        return DatasetHelper;
    })();
    wotext.DatasetHelper = DatasetHelper;

    // ##
    // ## DatasetShelf
    // ##
    var DatasetShelf = (function () {
        function DatasetShelf(opt, root) {
            this.opt = opt;
            this.map = {};
            this.waitingListeners = null;
            if (Object.freeze)
                Object.freeze(opt);
            if (typeof root !== 'undefined')
                this.root = root;
        }
        DatasetShelf.prototype.createRoot = function (jsonObjOrArr) {
            this.root = new GenericDataset(this, jsonObjOrArr);
            return this.root;
        };

        DatasetShelf.prototype.getOrCreate = function (data, isArray, parentData, parentIsArray, parentPath, mapId, arrIndex, path) {
            if (this.map[path] !== undefined)
                return this.map[path];
            var dataset = new GenericDataset(this, data, isArray, parentData, parentIsArray, parentPath, mapId, arrIndex, path);
            this.map[path] = dataset;
            return dataset;
        };

        DatasetShelf.prototype.search = function (path) {
            if (path === null || path === '')
                return this.root;
            return this.map[path] === undefined ? null : this.map[path];
        };

        DatasetShelf.prototype.getRoot = function () {
            return this.root;
        };

        DatasetShelf.prototype.detach = function (path, signalChange) {
            if (this.map[path] !== undefined) {
                this.map[path].internalDetach();
                delete this.map[path];
            }
            for (var k in this.map) {
                if (this.map.hasOwnProperty(k) && DatasetShelf.strStartsWith(k, path)) {
                    this.map[k].internalDetach();
                    delete this.map[k];
                }
            }
            if (signalChange)
                this.signalChange(path, 'D');
        };

        /**
        * @param path The complete path
        * @param changeType 'U' update, 'I' insert, 'D' delete, 'A' any
        */
        DatasetShelf.prototype.signalChange = function (path, changeType) {
            if (path === null)
                return;

            // - Current
            var pop = GenericDataset.popPath(path);
            var relPath = pop['isArray'] ? '[' + pop['index'] + ']' : pop['id'];
            var curPath = pop['parent'];
            this.fireListenersOrWait(curPath, ['topChange', 'change'], relPath, changeType);

            while (curPath !== null) {
                pop = GenericDataset.popPath(curPath);
                relPath = (pop['isArray'] ? '[' + pop['index'] + ']' : pop['id'] + '.') + relPath;
                curPath = pop['parent'];
                this.fireListenersOrWait(curPath, ['deepChange', 'change'], relPath, changeType);
            }
        };

        DatasetShelf.prototype.disengageListeners = function () {
            this.waitingListeners = {};
        };

        DatasetShelf.prototype.fireListeners = function () {
            if (!this.waitingListeners)
                return;

            // - Make an ordered list
            var list = [];
            for (var k in this.waitingListeners) {
                if (!this.waitingListeners.hasOwnProperty(k))
                    continue;
                list.push({
                    'datasetPath': k,
                    'byListenerTypes': this.waitingListeners[k]
                });
            }
            list.sort(function (a, b) {
                return a['datasetPath'] < b['datasetPath'] ? 1 : (a['datasetPath'] === b['datasetPath'] ? 0 : -1);
            });

            // - Fire listeners
            var byListenerTypes, dataset;
            for (var i = 0, len = list.length; i < len; ++i) {
                dataset = this.search(list[i]['datasetPath']);
                if (!dataset)
                    continue;
                byListenerTypes = list[i]['byListenerTypes'];
                if (byListenerTypes['deepChange'])
                    dataset.doFireListeners('deepChange', byListenerTypes['deepChange']);
                if (byListenerTypes['topChange'])
                    dataset.doFireListeners('topChange', byListenerTypes['topChange']);
                if (byListenerTypes['change'])
                    dataset.doFireListeners('change', byListenerTypes['change']);
            }
            this.waitingListeners = null;
        };

        DatasetShelf.prototype.fireListenersOrWait = function (datasetPath, listenerTypes, relPath, changeType) {
            var dataset = this.search(datasetPath);
            if (!dataset)
                return;

            // - Directly fire listeners
            if (!this.waitingListeners) {
                var changes = {};
                changes[relPath] = changeType;
                for (var i = 0, len = listenerTypes.length; i < len; ++i)
                    dataset.doFireListeners(listenerTypes[i], changes);
                return;
            }

            // - Add into waiting listeners
            if (datasetPath === null)
                datasetPath = '';
            var listenerType, byPath, byType;
            for (var i = 0, len = listenerTypes.length; i < len; ++i) {
                listenerType = listenerTypes[i];
                if (!dataset.hasListeners(listenerType))
                    return;
                byPath = this.waitingListeners[datasetPath];
                if (byPath === undefined)
                    this.waitingListeners[datasetPath] = byPath = {};
                byType = byPath[listenerType];
                if (byType === undefined)
                    byPath[listenerType] = byType = {};
                if (byType[relPath] !== changeType)
                    byType[relPath] = byType[relPath] === undefined ? changeType : 'A';
            }
        };

        DatasetShelf.strStartsWith = function (s, needle) {
            if (typeof String.prototype['startsWith'] !== 'undefined')
                return s['startsWith'](needle);

            //return s.indexOf(needle, 0) === 0;
            var len = needle.length;
            if (s.length < len)
                return false;
            for (var i = 0; i < len; ++i) {
                if (s[i] !== needle[i])
                    return false;
            }
            return true;
        };
        return DatasetShelf;
    })();

    // ##
    // ## GenericDataset
    // ##
    var GenericDataset = (function () {
        function GenericDataset(shelf, data, isArray, parentData, parentIsArray, parentPath, mapId, arrIndex, path) {
            if (typeof isArray === "undefined") { isArray = null; }
            if (typeof parentData === "undefined") { parentData = null; }
            if (typeof parentIsArray === "undefined") { parentIsArray = null; }
            if (typeof parentPath === "undefined") { parentPath = null; }
            if (typeof mapId === "undefined") { mapId = null; }
            if (typeof arrIndex === "undefined") { arrIndex = null; }
            if (typeof path === "undefined") { path = null; }
            this.shelf = shelf;
            this.data = data;
            this.isArray = isArray;
            this.parentData = parentData;
            this.parentIsArray = parentIsArray;
            this.parentPath = parentPath;
            this.mapId = mapId;
            this.arrIndex = arrIndex;
            this.path = path;
            if (isArray === null)
                this.isArray = DatasetHelper.isArray(data);
            else if (isArray !== DatasetHelper.isArray(data))
                throw new Error('Dataset "' + path + '" should be an ' + (isArray ? 'array' : 'object'));
        }
        // --
        // -- Public - RDataset
        // --
        GenericDataset.prototype.getPath = function () {
            this.autoAttach();
            return this.path;
        };

        GenericDataset.prototype.getId = function () {
            this.autoAttach();
            return this.parentIsArray ? undefined : this.mapId;
        };

        GenericDataset.prototype.reqId = function () {
            var val = this.getId();
            if (val === undefined)
                throw new Error('Missing ID for "' + this.path + '"');
            return val;
        };

        GenericDataset.prototype.getIdAsInt = function () {
            this.autoAttach();
            if (this.parentIsArray)
                return undefined;
            if (this.mapId === '0')
                return 0;
            var n = parseInt(this.mapId, 10);
            if (n === 0)
                throw new Error('Invalid integer ID for "' + this.path + '" (' + this.mapId + ')');
            return n;
        };

        GenericDataset.prototype.reqIdAsInt = function () {
            var val = this.getIdAsInt();
            if (val === undefined)
                throw new Error('Missing ID for "' + this.path + '"');
            return val;
        };

        GenericDataset.prototype.getIndex = function () {
            this.autoAttach();
            if (this.parentIsArray)
                return this.arrIndex;
            var iKey = this.shelf.opt['indexedMapProp'];
            if (iKey && this.data[iKey] !== undefined && this.data[iKey] !== null)
                return GenericDataset.formatIndexValue(this.data[iKey]);
            return undefined;
        };

        GenericDataset.prototype.reqIndex = function () {
            var val = this.getIndex();
            if (val === null)
                throw new Error('Missing index for "' + this.path + '"');
            return val;
        };

        GenericDataset.prototype.getParent = function (level) {
            if (typeof level === "undefined") { level = 1; }
            this.autoAttach();
            if (level < 0)
                throw new Error('Bad level for method getParent: "' + level + '"');
            if (level === 0)
                return this;
            var targetPath = this.path, pop;
            while (level-- > 0) {
                pop = GenericDataset.popPath(targetPath);
                targetPath = pop['parent'];
                if (targetPath === null)
                    return null;
            }
            var parent = this.shelf.search(targetPath);
            if (parent)
                return parent;
            return this.shelf.getRoot().get(targetPath);
        };

        GenericDataset.prototype.toList = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            this.autoAttach();
            var list = this.makeChildList(relPath), l = [];
            for (var i = 0, len = list.length; i < len; ++i)
                l.push(list[i][0]);
            return l;
        };

        GenericDataset.prototype.each = function (relPath, cb) {
            if (typeof cb === "undefined") { cb = undefined; }
            this.autoAttach();
            if (cb === undefined) {
                cb = relPath;
                relPath = null;
            }
            var list = this.makeChildList(relPath);
            for (var i = 0, len = list.length; i < len; ++i)
                cb(list[i][0], list[i][1]);
        };

        GenericDataset.prototype.toPojo = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            this.autoAttach();
            var fPath = this.formatRelPath(relPath);
            if (fPath === null)
                return DatasetHelper.cloneData(this.data);
            return this.doGet(fPath, true, true);
        };

        GenericDataset.prototype.toJsonStr = function () {
            this.autoAttach();
            return DatasetHelper.jsonStringify(this.data);
        };

        GenericDataset.prototype.get = function (relPathOrIndex) {
            this.autoAttach();
            var relPath;
            if (typeof relPathOrIndex === 'number')
                relPath = this.isArray ? '[' + relPathOrIndex + ']' : '{' + relPathOrIndex + '}';
            else
                relPath = relPathOrIndex;
            return this.doGet(this.formatRelPath(relPath), true);
        };

        GenericDataset.prototype.req = function (relPath) {
            var val = this.get(relPath);
            if (val === undefined)
                throw new Error('Missing value for "' + relPath + '"');
            return val;
        };

        GenericDataset.prototype.isEmpty = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            this.autoAttach();
            return this.isUnsetOrEmpty(false, this.formatRelPath(relPath));
        };

        GenericDataset.prototype.has = function (relPath) {
            this.autoAttach();
            return !this.isUnsetOrEmpty(true, this.formatRelPath(relPath));
        };

        GenericDataset.prototype.query = function (query) {
            return new GenericQueryResult(this, query);
        };

        GenericDataset.prototype.addChangeListener = function (cb) {
            return this.addListener('change', cb);
        };

        GenericDataset.prototype.addTopChangeListener = function (cb) {
            return this.addListener('topChange', cb);
        };

        GenericDataset.prototype.addDeepChangeListener = function (cb) {
            return this.addListener('deepChange', cb);
        };

        // --
        // -- Public - Dataset
        // --
        GenericDataset.prototype.disengageListeners = function () {
            this.shelf.disengageListeners();
        };

        GenericDataset.prototype.fireListeners = function () {
            this.shelf.fireListeners();
        };

        GenericDataset.prototype.toReadOnly = function () {
            if (!this.roDataset)
                this.roDataset = new GenericReadOnlyDataset(this);
            return this.roDataset;
        };

        GenericDataset.prototype.inc = function (relPath) {
            this.autoAttach();
            return this.intOp(this.formatRelPath(relPath), 1);
        };

        GenericDataset.prototype.dec = function (relPath) {
            this.autoAttach();
            return this.intOp(this.formatRelPath(relPath), -1);
        };

        GenericDataset.prototype.rm = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            this.autoAttach();
            var fPath = this.formatRelPath(relPath);
            if (fPath === null) {
                this.detach();
                return true;
            }
            var computed = this.searchComputed(fPath);
            if (computed !== null) {
                delete computed['dataset'].computedProperties[computed['id']];
                this.shelf.signalChange(fPath['full'], 'A');
                return true;
            }
            var dataset = this.shelf.search(fPath['full']);
            if (dataset !== null)
                return dataset.rm();
            var w = this.walkTo(fPath);
            if (w === null)
                return false;
            this.shelf.detach(fPath['full'], false);
            if (w['parentIsArray'])
                this.rmFromArray(w['parentData'], w['arrIndex'], w['parentPath']);
            else
                this.rmFromMap(w['parentData'], w['mapId']);
            this.shelf.signalChange(fPath['full'], 'D');
            return true;
        };

        GenericDataset.prototype.detach = function () {
            if (this.parentData === null)
                throw new Error('Cannot detach the root dataset');
            if (this.parentIsArray)
                this.rmFromArray(this.parentData, this.arrIndex, this.parentPath);
            else
                this.rmFromMap(this.parentData, this.mapId);
            this.shelf.detach(this.path, true);
        };

        // example: fruits.autres[0][1].nom[]
        GenericDataset.prototype.put = function (relPath, data, recursCreate) {
            if (typeof recursCreate === "undefined") { recursCreate = false; }
            this.autoAttach();
            var completedRelPath = this.walkAndCreate(relPath, recursCreate);
            if (completedRelPath === null)
                throw new Error('Cannot put to "' + relPath + '"');
            return this.doPut(this.formatRelPath(completedRelPath), data);
        };

        GenericDataset.prototype.reset = function (data) {
            // TODO
        };

        // example: fruits.autres[0][1].nom[2]
        GenericDataset.prototype.orderedInsert = function (relPath, data, index) {
            // TODO
        };

        GenericDataset.prototype.setChildIndices = function (indices) {
            // TODO
        };

        GenericDataset.prototype.putComputedProperty = function (id, cb) {
            if (this.isArray)
                throw new Error('A computed property cannot be added to an array');
            if (this.computedProperties === undefined)
                this.computedProperties = {};
            this.computedProperties[id] = cb;
        };

        // --
        // -- Internal
        // --
        GenericDataset.prototype.internalDetach = function () {
            if (this.shelf === null)
                return;
            if (this.parentData === null)
                throw new Error('Cannot detach the root dataset');
            this.path = null;
            this.parentPath = null;
            this.parentIsArray = null;
            this.parentData = null;
            this.shelf = null;
        };

        GenericDataset.prototype.internalSearchOrCreateDescendant = function (walkProp) {
            return this.shelf.getOrCreate(walkProp['data'], null, walkProp['parentData'], walkProp['parentIsArray'], walkProp['parentPath'], walkProp['mapId'], walkProp['arrIndex'], walkProp['path']);
        };

        GenericDataset.prototype.hasListeners = function (type) {
            if (this.listeners === undefined)
                return false;
            var arr = this.listeners[type];
            if (arr === undefined)
                return false;
            for (var k in arr) {
                if (arr.hasOwnProperty(k))
                    return true;
            }
            return false;
        };

        GenericDataset.prototype.doFireListeners = function (type, changes) {
            if (this.listeners === undefined)
                return;
            var arr = this.listeners[type];
            if (arr === undefined)
                return;
            for (var k in arr) {
                if (arr.hasOwnProperty(k))
                    arr[k](changes);
            }
        };

        // --
        // -- Private
        // --
        GenericDataset.prototype.addListener = function (type, cb) {
            if (this.listeners === undefined)
                this.listeners = {};
            if (this.listeners[type] === undefined)
                this.listeners[type] = [];
            var id = this.listeners[type].length;
            this.listeners[type][id] = cb;
            var that = this;
            return function () {
                delete that.listeners[type][id];
            };
        };

        GenericDataset.prototype.autoAttach = function () {
            if (this.shelf === null)
                this.shelf = new DatasetShelf({}, this);
        };

        GenericDataset.prototype.intOp = function (fPath, add) {
            if (fPath === null)
                throw new Error('Missing relPath');
            var val = this.doGet(fPath, false);
            if (typeof val !== 'number')
                throw new Error('Cannot increment the non-number for "' + fPath['orig'] + '" (' + typeof val + ')');
            val += add;
            this.doPut(fPath, val);
            return val;
        };

        GenericDataset.prototype.doPut = function (fPath, data) {
            // - Parse the path
            if (fPath === null)
                throw new Error('Missing relPath');
            var pop = GenericDataset.popPath(fPath['rel']);
            var parentData;
            if (pop['parent'] === null) {
                parentData = this.data;
            } else {
                var w = this.walkTo(this.formatRelPath(pop['parent']));
                if (w === null)
                    throw new Error('Cannot put to "' + fPath['orig'] + '"');
                parentData = w['data'];
            }

            // - Put
            var newRelPath, changeType;
            if (pop['isArray']) {
                // - Put in an array
                if (!DatasetHelper.isArray(parentData))
                    throw new Error('Cannot put to "' + fPath['orig'] + '": this is not an array');
                var arrIndex = pop['index'];
                if (arrIndex === parentData.length) {
                    parentData[arrIndex] = data;
                    newRelPath = GenericDataset.appendArrIndexToPath(pop['parent'], arrIndex);
                    changeType = 'I';
                } else {
                    if (arrIndex > parentData.length)
                        throw new Error('Cannot put to "' + fPath['orig'] + '": too big array index');
                    if (arrIndex < 0)
                        throw new Error('Cannot put to "' + fPath['orig'] + '": invalid array index');
                    parentData.splice(arrIndex, 1, data);
                    this.shelf.detach(fPath['full'], false);
                    newRelPath = fPath['rel'];
                    changeType = 'U';
                }
            } else {
                // - Case of update under a computed property
                var parent = this.shelf.search(this.getFullPath(pop['parent']));
                if (parent !== null && parent.computedProperties !== undefined && parent.computedProperties[pop['id']] !== undefined)
                    changeType = 'A';

                // - Put in an object
                if (DatasetHelper.isArray(parentData))
                    throw new Error('Cannot put to "' + fPath['orig'] + '": this is not a map');
                this.shelf.detach(fPath['full'], false);
                var iKey = this.shelf.opt['indexedMapProp'];
                if (iKey && data[iKey] !== undefined && data[iKey] !== null)
                    this.shiftOrderedMap(1, parentData, GenericDataset.formatIndexValue(data[iKey]));
                if (changeType === undefined)
                    changeType = parentData[pop['id']] === undefined ? 'I' : 'U';
                parentData[pop['id']] = data;
                newRelPath = fPath['rel'];
            }
            this.shelf.signalChange(fPath['full'], changeType);
            return newRelPath;
        };

        GenericDataset.prototype.doGet = function (fPath, orComputed, asPojo) {
            if (typeof asPojo === "undefined") { asPojo = false; }
            if (fPath === null)
                return undefined;
            if (!asPojo) {
                var dataset = this.shelf.search(fPath['full']);
                if (dataset !== null)
                    return dataset;
            }
            if (orComputed) {
                var computed = this.searchComputed(fPath);
                if (computed !== null)
                    return computed['cb'](computed['dataset']);
            }
            var w = this.walkTo(fPath);
            if (w === null)
                return undefined;
            var data = w['data'];
            if (data !== null && typeof data === 'object') {
                if (asPojo)
                    return DatasetHelper.cloneData(data);
                else
                    return this.internalSearchOrCreateDescendant(w);
            }
            return data;
        };

        GenericDataset.prototype.isUnsetOrEmpty = function (checkUnset, fPath) {
            var data, isArr;
            if (fPath) {
                var dataset = this.shelf.search(fPath['full']);
                if (dataset !== null)
                    return dataset.isUnsetOrEmpty(checkUnset, null);
                var w = this.walkTo(fPath);
                if (w === null)
                    return this.searchComputed(fPath) === null;
                if (checkUnset)
                    return false;
                data = w['data'];
                if (data === null || typeof data !== 'object')
                    return !data;
                isArr = DatasetHelper.isArray(data);
            } else {
                if (checkUnset)
                    return false;
                data = this.data;
                isArr = this.isArray;
            }
            if (isArr)
                return data.length === 0;
            for (var k in data) {
                if (data.hasOwnProperty(k))
                    return false;
            }
            return true;
        };

        GenericDataset.prototype.makeChildList = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            // - With a relative path or a filter
            var fPath = this.formatRelPath(relPath);
            if (fPath !== null) {
                var o = this.doGet(fPath, false);
                if (!o || typeof o !== 'object')
                    return [];
                return o.makeChildList();
            }

            // - Array - List the children
            var list = [], data, path, val, index, len;
            if (this.isArray) {
                var data;
                for (index = 0, len = this.data.length; index < len; ++index) {
                    data = this.data[index];
                    if (data !== null && typeof data === 'object') {
                        path = GenericDataset.appendArrIndexToPath(this.path, index);
                        val = this.shelf.getOrCreate(data, DatasetHelper.isArray(data), this.data, this.isArray, this.path, null, index, path);
                    } else
                        val = data;
                    list.push([val, index, index, index]);
                }
                return list;
            }

            // - Map - Make the list
            var hasIndex = false, allIdNum = true, idNum;
            for (var id in this.data) {
                if (!this.data.hasOwnProperty(id))
                    continue;
                idNum = +id; // convert to integer or NaN
                if (isNaN(idNum) || (id.length > 1 && id[0] === '0'))
                    allIdNum = false;
                data = this.data[id];
                if (data !== null && typeof data === 'object') {
                    path = GenericDataset.appendMapIdToPath(this.path, id);
                    val = this.shelf.getOrCreate(data, DatasetHelper.isArray(data), this.data, this.isArray, this.path, id, null, path);
                    index = val.getIndex();
                    hasIndex = hasIndex || index !== undefined;
                } else {
                    val = data;
                    index = null;
                }
                list.push([val, id, index, idNum]);
            }

            // - Map - Sort the list
            var sortOn = hasIndex ? 2 : (allIdNum ? 3 : 1);
            list.sort(function (propA, propB) {
                var a = propA[sortOn], b = propB[sortOn];
                if (a === undefined)
                    return b === undefined ? 0 : 1;
                if (b === undefined)
                    return -1;
                if (a === null)
                    return b === null ? 0 : 1;
                if (b === null)
                    return -1;
                return a > b ? 1 : (a < b ? -1 : 0);
            });
            return list;
        };

        GenericDataset.prototype.syncArrIndices = function (data, fromIndex, fullPath) {
            var dataset;
            for (var i = fromIndex; i < data.length; ++i) {
                dataset = this.shelf.search(GenericDataset.appendArrIndexToPath(fullPath, i));
                if (dataset !== null)
                    dataset.doSetIndex(i);
            }
        };

        GenericDataset.prototype.shiftOrderedMap = function (val, parentData, fromIndex) {
            var iKey = this.shelf.opt['indexedMapProp'];
            if (!iKey)
                return;
            var brotherData;
            for (var k in parentData) {
                if (!parentData.hasOwnProperty(k))
                    continue;
                brotherData = parentData[k];
                if (brotherData[iKey] >= fromIndex)
                    brotherData[iKey] += val;
            }
        };

        GenericDataset.prototype.rmFromArray = function (parentData, childIndex, parentFullPath) {
            parentData.splice(childIndex, 1);
            this.syncArrIndices(parentData, childIndex, parentFullPath);
        };

        GenericDataset.prototype.rmFromMap = function (parentData, id) {
            var removedIndex, iKey = this.shelf.opt['indexedMapProp'];
            if (iKey)
                removedIndex = parentData[id][iKey];
            delete parentData[id];
            if (removedIndex !== undefined)
                this.shiftOrderedMap(-1, parentData, removedIndex + 1);
        };

        GenericDataset.prototype.doSetIndex = function (index) {
            if (this.parentIsArray)
                this.arrIndex = index;
            else {
                var iKey = this.shelf.opt['indexedMapProp'];
                if (iKey)
                    this.data[iKey] = index;
            }
        };

        GenericDataset.popPath = function (path) {
            var tokens = /^(.*)(?:(?:\.([^\.{}\[\]]+))|(?:{([^{}]*)})|(?:\[([0-9]*)\]))$/.exec(path);
            if (tokens === null) {
                if (!/^([^{}\[\]\.]+)$/.test(path))
                    throw new Error('Invalid path: "' + path + '"');
                return { 'parent': null, 'isArray': false, 'id': path, 'index': null };
            }
            var parent = tokens[1] === '' ? null : tokens[1];
            if (parent === null && tokens[2] !== undefined)
                throw new Error('Invalid path: "' + path + '"');
            var isArr = tokens[4] !== undefined, index, id;
            if (isArr) {
                if (tokens[4] === '')
                    throw new Error('Invalid path: "' + path + '"');
                index = parseInt(tokens[4], 10);
                id = null;
            } else {
                id = tokens[2] || tokens[3];
                if (id === '')
                    throw new Error('Invalid path: "' + path + '"');
                index = null;
            }
            return {
                'parent': parent,
                'isArray': isArr,
                'id': id,
                'index': index
            };
        };

        GenericDataset.prototype.searchComputed = function (fPath) {
            var pop = GenericDataset.popPath(fPath['rel']);
            if (pop['isArray'])
                return null;
            var parent = this.shelf.search(this.getFullPath(pop['parent']));
            if (parent === null || parent.computedProperties === undefined)
                return null;
            var cb = parent.computedProperties[pop['id']];
            if (cb === undefined)
                return null;
            return { 'cb': cb, 'dataset': parent, 'id': pop['id'] };
        };

        // example: red.banana[0][1].name or {red}{banana}[0][1]{name}
        GenericDataset.prototype.walkTo = function (fPath) {
            if (!fPath)
                return GenericDataset.internalWalkStateToResult(this.internalCreateWalkState(null));
            var state = this.internalCreateWalkState(fPath['orig']);
            var tokens = fPath['tokens'], tok;
            for (var i = 0, len = tokens.length; i < len; ++i) {
                tok = tokens[i];
                if (tok[0] === '[') {
                    if (!GenericDataset.walkInArr(state, tok, true))
                        return null;
                } else {
                    if (!GenericDataset.walkInObj(state, tok, true, i > 0))
                        return null;
                }
            }
            return GenericDataset.internalWalkStateToResult(state);
        };

        GenericDataset.prototype.internalCreateWalkState = function (orig) {
            return {
                'orig': orig,
                'curPath': this.path,
                'curData': this.data,
                'parentPath': this.parentPath,
                'parentData': this.parentData,
                'parentIsArray': this.parentIsArray,
                'curMapId': this.mapId,
                'curArrIndex': this.arrIndex
            };
        };

        GenericDataset.internalWalkStateToResult = function (state) {
            return {
                'path': state['curPath'],
                'data': state['curData'],
                'parentPath': state['parentPath'],
                'parentData': state['parentData'],
                'parentIsArray': state['parentIsArray'],
                'mapId': state['curMapId'],
                'arrIndex': state['curArrIndex']
            };
        };

        GenericDataset.walkInArr = function (state, token, errOnBadData) {
            var arrIndex = typeof token === 'string' ? parseInt(token.slice(1, -1), 10) : token;
            if (!DatasetHelper.isArray(state['curData'])) {
                if (errOnBadData)
                    throw new Error('Bad path "' + state['orig'] + '": ' + state['curPath'] + ' is not an array');
                return false;
            }
            var curData = state['curData'][arrIndex];
            if (curData === undefined)
                return false;
            state['curMapId'] = null;
            state['curArrIndex'] = arrIndex;
            state['parentData'] = state['curData'];
            state['curData'] = curData;
            state['parentPath'] = state['curPath'];
            state['parentIsArray'] = true;
            state['curPath'] = GenericDataset.appendArrIndexToPath(state['curPath'], arrIndex);
            return true;
        };

        GenericDataset.walkInObj = function (state, token, errOnBadData, withDot) {
            if (typeof withDot === "undefined") { withDot = false; }
            if (state['curData'] === null || typeof state['curData'] !== 'object' || DatasetHelper.isArray(state['curData'])) {
                if (errOnBadData)
                    throw new Error('Bad path "' + state['orig'] + '": ' + state['curPath'] + ' is not an object');
                return false;
            }
            var mapId;
            if (token[0] === '{')
                mapId = token.slice(1, -1);
            else {
                var hasDot = token[0] === '.';
                if (hasDot !== withDot)
                    throw new Error('Invalid path: "' + state['orig'] + '"');
                mapId = hasDot ? token.slice(1) : token;
            }
            var curData = state['curData'][mapId];
            if (curData === undefined)
                return false;
            state['curArrIndex'] = null;
            state['curMapId'] = mapId;
            state['parentData'] = state['curData'];
            state['curData'] = curData;
            state['parentPath'] = state['curPath'];
            state['parentIsArray'] = false;
            state['curPath'] = GenericDataset.appendMapIdToPath(state['curPath'], mapId);
            return true;
        };

        // example: red{banana}[][1].name[]
        GenericDataset.prototype.walkAndCreate = function (relPath, recursCreate) {
            var state = this.internalCreateWalkState(relPath), completedRelPath = '';
            var tokens = relPath.match(/({[^{}]+})|(\[[0-9]*\])|(\.?[^{}\[\]\.]+)|([\.{}\[\]])/g), tok, arrIndex, arrLen, mapId, hasDot;
            for (var i = 0, nextI = 1, len = tokens.length; i < len; i = nextI++) {
                tok = tokens[i];
                if (tok[0] === '[') {
                    if (!DatasetHelper.isArray(state['curData']))
                        throw new Error('Bad path "' + state['orig'] + '": ' + state['curPath'] + ' is not an array');
                    arrLen = state['curData'].length;
                    arrIndex = tok === '[]' ? arrLen : parseInt(tok.slice(1, -1), 10);
                    if (state['curData'][arrIndex] === undefined) {
                        if (arrIndex > arrLen)
                            return null;
                        if (nextI === len)
                            return completedRelPath + '[' + arrIndex + ']';
                        if (!recursCreate)
                            return null;
                        state['curData'][arrIndex] = tokens[nextI][0] === '[' ? [] : {};
                    }
                    if (!GenericDataset.walkInArr(state, tok, true))
                        return null;
                    completedRelPath += '[' + state['curArrIndex'] + ']';
                } else {
                    if (state['curData'] === null || typeof state['curData'] !== 'object' || DatasetHelper.isArray(state['curData']))
                        throw new Error('Bad path "' + state['orig'] + '": ' + state['curPath'] + ' is not a map');
                    if (tok[0] === '{')
                        mapId = tok.slice(1, -1);
                    else {
                        hasDot = tok[0] === '.';
                        if (hasDot !== (i > 0))
                            throw new Error('Invalid path: "' + state['orig'] + '"');
                        mapId = hasDot ? tok.slice(1) : tok;
                    }
                    if (state['curData'][mapId] === undefined) {
                        if (nextI === len)
                            return completedRelPath + '{' + mapId + '}';
                        if (!recursCreate)
                            return null;
                        state['curData'][mapId] = tokens[nextI][0] === '[' ? [] : {};
                    }
                    if (!GenericDataset.walkInObj(state, tok, true, i > 0))
                        return null;
                    completedRelPath += '{' + state['curMapId'] + '}';
                }
            }
            return completedRelPath;
        };

        GenericDataset.formatIndexValue = function (val) {
            var t = typeof val;
            if (t === 'number')
                return val;
            if (t === 'string')
                return parseInt(val, 10);
            throw new Error('Bad index value (type: ' + t + ')');
        };

        GenericDataset.prototype.getFullPath = function (relPath) {
            if (typeof relPath === "undefined") { relPath = null; }
            if (relPath === null)
                return this.path;
            if (this.path === null)
                return relPath;
            if (this.isArray) {
                if (relPath.charAt(0) !== '[')
                    throw new Error('Invalid sub-path "' + relPath + '" because "' + this.path + '" is an array');
                return this.path + relPath;
            }
            return relPath.charAt(0) === '{' ? this.path + relPath : this.path + '.' + relPath;
        };

        GenericDataset.prototype.formatRelPath = function (relPath) {
            if (!relPath)
                return null;
            if (typeof relPath !== 'string')
                relPath = String(relPath);
            var tokens = relPath.match(/({[^{}]+})|(\[[0-9]+\])|(\.?[^{}\[\]\.]+)|([\.{}\[\]])/g), tok, formatted = '';
            for (var i = 0, len = tokens.length; i < len; ++i) {
                tok = tokens[i];
                if (tok === '.' || tok === '{' || tok === '}' || tok === '[' || tok === ']')
                    throw new Error('Invalid path: "' + relPath + '"');
                if (tok[0] !== '[') {
                    if (tok[0] === '.') {
                        if (i === 0)
                            throw new Error('Invalid path: "' + relPath + '"');
                        tok = '{' + tok.slice(1) + '}';
                    } else if (tok[0] !== '{')
                        tok = '{' + tok + '}';
                }
                formatted += tok;
            }
            return {
                'orig': relPath,
                'rel': formatted,
                'full': this.path ? this.path + formatted : formatted,
                'tokens': tokens
            };
        };

        GenericDataset.appendMapIdToPath = function (path, mapId) {
            return path === null ? '{' + mapId + '}' : path + '{' + mapId + '}';
        };

        GenericDataset.appendArrIndexToPath = function (path, arrIndex) {
            return (path === null ? '' : path) + '[' + arrIndex + ']';
        };

        GenericDataset.isGenericDataset = function (o) {
            return o !== null && typeof o === 'object' && o.prototype === GenericDataset['prototype'];
        };
        return GenericDataset;
    })();

    // ##
    // ## GenericReadOnlyDataset
    // ##
    var GenericReadOnlyDataset = (function () {
        function GenericReadOnlyDataset(dataset) {
            this.dataset = dataset;
        }
        GenericReadOnlyDataset.prototype.addChangeListener = function (cb) {
            return this.dataset.addChangeListener(cb);
        };

        GenericReadOnlyDataset.prototype.addTopChangeListener = function (cb) {
            return this.dataset.addTopChangeListener(cb);
        };

        GenericReadOnlyDataset.prototype.addDeepChangeListener = function (cb) {
            return this.dataset.addDeepChangeListener(cb);
        };

        GenericReadOnlyDataset.prototype.getPath = function () {
            return this.dataset.getPath();
        };

        GenericReadOnlyDataset.prototype.getId = function () {
            return this.dataset.getId();
        };

        GenericReadOnlyDataset.prototype.reqId = function () {
            return this.dataset.reqId();
        };

        GenericReadOnlyDataset.prototype.getIdAsInt = function () {
            return this.dataset.getIdAsInt();
        };

        GenericReadOnlyDataset.prototype.reqIdAsInt = function () {
            return this.dataset.reqIdAsInt();
        };

        GenericReadOnlyDataset.prototype.getIndex = function () {
            return this.dataset.getIndex();
        };

        GenericReadOnlyDataset.prototype.reqIndex = function () {
            return this.dataset.reqIndex();
        };

        GenericReadOnlyDataset.prototype.getParent = function (level) {
            if (typeof level === "undefined") { level = 1; }
            return this.dataset.getParent(level).toReadOnly();
        };

        GenericReadOnlyDataset.prototype.toList = function (relPath) {
            var list = this.dataset.toList(relPath);
            for (var i = 0, len = list.length; i < len; ++i) {
                if (GenericDataset.isGenericDataset(list[i]))
                    list[i] = list[i].toReadOnly();
            }
            return list;
        };

        GenericReadOnlyDataset.prototype.each = function (relPath, cb) {
            if (typeof cb === "undefined") { cb = undefined; }
            if (cb === undefined) {
                cb = relPath;
                relPath = null;
            }
            this.dataset.each(relPath, function (val, id) {
                if (GenericDataset.isGenericDataset(val))
                    val = val.toReadOnly();
                cb(val, id);
            });
        };

        GenericReadOnlyDataset.prototype.toPojo = function (relPath) {
            return this.dataset.toPojo(relPath);
        };

        GenericReadOnlyDataset.prototype.toJsonStr = function () {
            return this.dataset.toJsonStr();
        };

        GenericReadOnlyDataset.prototype.get = function (relPath) {
            var val = this.dataset.get(relPath);
            if (GenericDataset.isGenericDataset(val))
                return val.toReadOnly();
            return val;
        };

        GenericReadOnlyDataset.prototype.req = function (relPath) {
            var val = this.dataset.req(relPath);
            if (GenericDataset.isGenericDataset(val))
                return val.toReadOnly();
            return val;
        };

        GenericReadOnlyDataset.prototype.isEmpty = function (relPath) {
            return this.dataset.isEmpty(relPath);
        };

        GenericReadOnlyDataset.prototype.has = function (relPath) {
            return this.dataset.has(relPath);
        };

        GenericReadOnlyDataset.prototype.query = function (filter) {
            var r = this.dataset.query(filter);
            r.internalSetReadOnly();
            return r;
        };
        return GenericReadOnlyDataset;
    })();

    // ##
    // ## GenericReadOnlyDataset
    // ##
    var GenericQueryResult = (function () {
        function GenericQueryResult(fromDataset, query) {
            this.fromDataset = fromDataset;
            this.readOnly = false;
            this.processQuery(query);
        }
        // --
        // -- DatasetQueryResult
        // --
        GenericQueryResult.prototype.toList = function () {
            var list = [], data, ds;
            for (var i = 0, len = this.resultProp.length; i < len; ++i) {
                data = this.resultProp[i];
                if (data !== null && typeof data === 'object') {
                    ds = this.fromDataset.internalSearchOrCreateDescendant(data);
                    list.push(this.readOnly ? ds.toReadOnly() : ds);
                } else
                    list.push(data);
            }
            return list;
        };

        GenericQueryResult.prototype.each = function (cb) {
            var list = this.toList();
            for (var i = 0, len = list.length; i < len; ++i)
                cb(list[i]);
        };

        // --
        // -- Internal
        // --
        GenericQueryResult.prototype.internalSetReadOnly = function () {
            this.readOnly = true;
        };

        // --
        // -- Private
        // --
        GenericQueryResult.prototype.processQuery = function (query) {
            this.resultProp = [];
            var r = [];
            GenericQueryResult.select(query['select'], this.fromDataset.internalCreateWalkState(query['select']), r);
            var parsed = {};
            for (var i = 0, len = r.length; i < len; ++i) {
                if (GenericQueryResult.processFilter(query, parsed, [r[i]], false))
                    this.resultProp.push(GenericDataset.internalWalkStateToResult(r[i]));
            }
        };

        // --
        // -- Private - Where
        // --
        GenericQueryResult.processFilter = function (query, parsed, states, shouldSelect) {
            if (shouldSelect && query['select']) {
                var r = [];
                for (var i = 0, len = states.length; i < len; ++i)
                    GenericQueryResult.select(query['select'], GenericQueryResult.cloneState(states[i]), r);
                states = r;
            }
            if (query['where'])
                return GenericQueryResult.processWhere(query['where'], GenericQueryResult.getParsed(parsed, 'where'), states);
            else if (query['whereExists'])
                return GenericQueryResult.processWhereExists(query['whereExists'], GenericQueryResult.getParsed(parsed, 'whereExists'), states);
            else if (query['whereListIs'])
                return GenericQueryResult.processWhereListIs(query['whereListIs'], states);
            else if (query['whereDescendantExists'])
                return GenericQueryResult.processWhereDescendantExists(query['whereDescendantExists'], GenericQueryResult.getParsed(parsed, 'whereDescendantExists'), states);
            return true;
        };

        GenericQueryResult.processWhere = function (filter, parsed, states) {
            if (!DatasetHelper.isArray(filter))
                throw new Error('A where filter must be an array');
            var len = filter.length;
            if (len === 0)
                return true;
            for (var i = 0; i < len; ++i) {
                if (!GenericQueryResult.processFilter(filter[i], GenericQueryResult.getParsed(parsed, i), states, true))
                    return false;
            }
            return true;
        };

        GenericQueryResult.processWhereExists = function (filter, parsed, states) {
            if (!DatasetHelper.isArray(filter))
                throw new Error('A where filter must be an array');
            var len = filter.length;
            if (len === 0)
                return true;
            for (var i = 0; i < len; ++i) {
                if (GenericQueryResult.processFilter(filter[i], GenericQueryResult.getParsed(parsed, i), states, true))
                    return true;
            }
            return false;
        };

        GenericQueryResult.processWhereListIs = function (filter, states) {
            // - Optimisation: case of superset of empty
            var of = filter['supersetOf'];
            if (of.length === 0)
                return true;

            // - Make a set
            var values = {}, v, vType;
            for (var i = 0, len = states.length; i < len; ++i) {
                v = states[i]['curData'];
                vType = typeof v;
                if (vType !== 'string') {
                    if (vType !== 'number')
                        continue;
                    v = String(v);
                }
                values[v] = true;
            }

            for (i = 0, len = of.length; i < len; ++i) {
                if (!values[of[i]])
                    return false;
            }
            return true;
        };

        GenericQueryResult.processWhereDescendantExists = function (filter, parsed, states) {
            for (var i = 0, len = states.length; i < len; ++i) {
                if (GenericQueryResult.recursHasDescendant(filter, parsed, states[i]['curData']))
                    return true;
            }
            return false;
        };

        GenericQueryResult.trimOrNull = function (s) {
            if (!s)
                return null;
            s = String.prototype.trim ? s.trim() : s.replace(/^\s+|\s+$/g, '');
            return s === '' ? null : s;
        };

        GenericQueryResult.recursHasDescendant = function (filter, parsed, val) {
            var vType = typeof val;
            if (vType === filter['type']) {
                if (filter['type'] === 'string' && filter['contains']) {
                    var contains;
                    if (parsed['contains'])
                        contains = parsed['contains'];
                    else {
                        contains = GenericQueryResult.trimOrNull(filter['contains']);
                        parsed['contains'] = contains;
                    }
                    if (contains) {
                        contains = contains.toLowerCase();
                        if (!val)
                            return false;
                        val = val.toLowerCase();
                        return String.prototype['contains'] ? val['contains'](contains) : (val.indexOf(contains) !== -1);
                    }
                }
                return true;
            }
            if (val === null || vType !== 'object')
                return false;
            if (DatasetHelper.isArray(val)) {
                for (var i = 0, len = val.length; i < len; ++i) {
                    if (GenericQueryResult.recursHasDescendant(filter, parsed, val[i]))
                        return true;
                }
            } else {
                for (var k in val) {
                    if (val.hasOwnProperty(k) && GenericQueryResult.recursHasDescendant(filter, parsed, val[k]))
                        return true;
                }
            }
            return false;
        };

        GenericQueryResult.getParsed = function (parsedParent, key) {
            if (!parsedParent[key])
                parsedParent[key] = {};
            return parsedParent[key];
        };

        // --
        // -- Private - Select
        // --
        // example: red.banana[0][].name or {red}{}[0][]{name}
        GenericQueryResult.select = function (pattern, baseState, resultStateList) {
            var tokens;
            if (pattern)
                tokens = pattern.match(/({[^{}]*})|(\[[0-9]*\])|(\.?[^{}\[\]\.]+)|([\.{}\[\]])/g);
            else
                tokens = [];
            GenericQueryResult.queryInnerWalk(resultStateList, baseState, tokens, 0);
        };

        GenericQueryResult.queryInnerWalk = function (resultStateList, state, tokens, tokI) {
            var tok, subI, subLen, subK, subState;
            for (var len = tokens.length; tokI < len; ++tokI) {
                tok = tokens[tokI];
                if (tok === '.' || tok === '{' || tok === '}' || tok === '[' || tok === ']')
                    throw new Error('Invalid path: "' + state['orig'] + '"');
                if (tok[0] === '[') {
                    if (tok === '[]') {
                        for (subI = 0, subLen = state['curData'].length; subI < subLen; ++subI) {
                            subState = GenericQueryResult.cloneState(state);
                            if (!GenericDataset.walkInArr(subState, subI, false))
                                continue;
                            GenericQueryResult.queryInnerWalk(resultStateList, subState, tokens, tokI + 1);
                        }
                        return;
                    } else if (!GenericDataset.walkInArr(state, tok, false))
                        return;
                } else {
                    if (tok === '{}') {
                        for (subK in state['curData']) {
                            if (!state['curData'].hasOwnProperty(subK))
                                continue;
                            subState = GenericQueryResult.cloneState(state);
                            if (!GenericDataset.walkInObj(subState, subK, false, false))
                                continue;
                            GenericQueryResult.queryInnerWalk(resultStateList, subState, tokens, tokI + 1);
                        }
                        return;
                    } else if (!GenericDataset.walkInObj(state, tok, false, tokI > 0))
                        return;
                }
            }
            resultStateList.push(state);
        };

        GenericQueryResult.cloneState = function (state) {
            var copy = {};
            for (var k in state) {
                if (state.hasOwnProperty(k))
                    copy[k] = state[k];
            }
            return copy;
        };
        return GenericQueryResult;
    })();
})(wotext || (wotext = {}));
