/// <reference path="definitions.ts" />
'use strict';

module Woc {
  export interface CompTreeArg {
    from: string;
    context: EmbedContext;
  }

  export interface ComponentCompTreeArg extends CompTreeArg {
    id: number;
  }

  export class ComponentTree {

    private static ID_PROP = '_wocCompId';
    private tree = {};
    private list = [];

    public newPlaceholder(cName: string, parent: CompTreeArg): number {
      switch (parent.from) {
        case 'S':
          return this.addFromRoot(cName, 's(' + parent.context.getName() + ')');
        case 'C':
          var parentId = (<ComponentCompTreeArg>parent).id;
          if (parentId === null)
            return this.addFromRoot(cName, 'c(' + cName + ')'); // Case of a call from component static init
          if (this.list[parentId] === undefined)
            throw Error('Unknown parent component "' + parentId + '"');
          var item = this.list[parentId];
          return this.addItem(cName, item['children']);
        default:
          throw Error('Unknown from "' + parent.from + '"');
      }
    }

    public setComp(id: number, c: Component, cc: ComponentContext, cPlugins: ContextPlugin[]): void {
      var item = this.list[id];
      if (item === undefined)
        throw Error('Unknown component "' + id + '"');
      item['comp'] = c;
      item['cc'] = cc;
      item['cPlugins'] = cPlugins;
      c[ComponentTree.ID_PROP] = id;
    }

    public destruct(c: any, removeFromDOM: boolean) {
      if (typeof c === 'number')
        this.destructItem(c, removeFromDOM);
      else
        this.destructItem(c[ComponentTree.ID_PROP], removeFromDOM);
    }

    public getChildComponents(parent: CompTreeArg): Component[] {
      var children = this.getChildIdList(parent),
        res = [];
      for (var childId in children) {
        if (children.hasOwnProperty(childId) && this.list[childId] !== undefined && this.list[childId]['comp'])
          res.push(this.list[childId]['comp']);
      }
      return res;
    }

    public callChildComponents(parent: CompTreeArg, methodName, args: any[]): any[] {
      var children = this.getChildIdList(parent),
        comp,
        res = [];
      for (var childId in children) {
        if (!children.hasOwnProperty(childId) || this.list[childId] === undefined)
          continue;
        comp = this.list[childId]['comp'];
        if (!comp || typeof comp[methodName] !== 'function')
          continue;
        res.push(comp[methodName].apply(comp, args));
      }
      return res;
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
            'comp': items[id]['comp'],
            'cc': items[id]['cc']
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
        throw Error('Unknown component "' + id + '" (already removed?)');
      if (item['cPlugins']) {
        for (var i = 0, len = item['cPlugins'].length; i < len; ++i)
          item['cPlugins'][i].destruct(item['cc']);
      }
      if (item['comp'] === null)
        throw Error('Cannot destruct the component "' + item['name'] + '" during its initialisation');
      if (removeFromDOM && item['comp']['destructInDOM'] !== undefined)
        item['comp']['destructInDOM']();
      if (item['comp']['destruct'] !== undefined)
        item['comp']['destruct']();
      var children = item['children'];
      for (var childId in children) {
        if (children.hasOwnProperty(childId))
          this.destructItem(parseInt(childId, 10), removeFromDOM);
      }
      delete item['parentMap'][id];
      delete this.list[id];
    }

    private addFromRoot(cName: string, rootId: string): number {
      var children = this.tree[rootId];
      if (children === undefined)
        this.tree[rootId] = children = {};
      return this.addItem(cName, children);
    }

    private addItem(cName: string, children: {}): number {
      var id = this.list.length;
      this.list.push(children[id] = {
        'comp': null,
        'cc': null,
        'cPlugins': null,
        'name': cName,
        'children': {},
        'parentMap': children
      });
      return id;
    }

    private getChildIdList(parent: CompTreeArg) {
      var list: number[];
      switch (parent.from) {
        case 'S':
          list = this.tree['s(' + parent.context.getName() + ')'] || [];
          break;
        case 'C':
          var parentId = (<ComponentCompTreeArg>parent).id;
          if (parentId === null)
            list = this.tree['c(' + parent.context.getName() + ')'] || []; // Case of a call from component static init
          else {
            if (this.list[parentId] === undefined)
              throw Error('Unknown parent component "' + parentId + '"');
            list = this.list[parentId]['children']
          }
          break;
        default:
          throw Error('Unknown from "' + parent.from + '"');
      }
      return list;
    }
  }
}
