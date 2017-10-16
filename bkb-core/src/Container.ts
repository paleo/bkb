import { ComponentEvent, EmitterOptions, Bkb, Dash, ApplicationDash, ParentFilter, Transmitter, FindChildOptions, ListenChildOptions } from "./interfaces"
import { Emitter } from "./Emitter"
import { ChildEmitter } from "./ChildEmitter"
import { ApplicationContainer } from "./Application"

export class Container {
  public bkb: Bkb | undefined
  public dash: Dash | ApplicationDash | undefined
  public emitter: Emitter
  public childEmitter: ChildEmitter

  private inst: object | undefined
  private childGroups: Map<string, Set<number>>

  private static canPropagateSymb = Symbol("canPropagate")

  constructor(public app: ApplicationContainer, readonly componentId: number, bkbMethods?: any) {
    this.emitter = new Emitter(app, ["destroy"])
    this.childEmitter = new ChildEmitter(app)
    this.bkb = makeBkb(this, bkbMethods)
    this.dash = makeDash(this, this.bkb)
  }

  // --
  // -- Used by Application
  // --

  public makeInstance(Cl, args: any[]): object {
    if (this.inst)
      return this.inst
    return this.setInstance(new Cl(this.dash, ...args))
  }

  public setInstance(inst: object): object {
    if (this.inst)
      return this.inst
    if (!this.bkb)
      throw new Error(`Destroyed component`)
    this.inst = inst
    return inst
  }

  public getInstance(): object {
    if (!this.inst) {
      if (this.bkb)
        throw new Error(`The component instance is still not initialized`)
      throw new Error("Destroyed component")
    }
    return this.inst
  }

  public destroy() {
    this.emit("destroy", undefined, { sync: true })
    this.app.removeComponent(this, this.inst)
    if (this.childGroups)
      this.childGroups.clear()
    this.emitter.destroy()
    this.childEmitter.destroy()
    this.bkb = undefined
    this.dash = undefined
    this.inst = undefined
  }

  public forgetChild(compId: number) {
    if (this.childGroups) {
      for (let group of this.childGroups.values())
        group.delete(compId)
    }
  }

  // --
  // -- [makeBkb and makeDash]
  // --

  public createChild(nc: InternalNewComponent): Container {
    return this.app.createComponent(nc, this)
  }

  public addToGroup(child: object, ...groups: string[]) {
    let childId = this.app.getContainerByInst(child).componentId
    if (this !== this.app.getParentOf(childId))
      throw new Error(`The component ${childId} is not a child of ${this.componentId}`)
    if (!this.childGroups)
      this.childGroups = new Map()
    for (let group of groups) {
      let g = this.childGroups.get(group)
      if (!g)
        this.childGroups.set(group, g = new Set())
      g.add(childId)
    }
  }

  public isInGroup(child: object, ...groups: string[]) {
    if (!this.childGroups)
      return false
    let childId = this.app.getContainerByInst(child).componentId
    for (let group of groups) {
      let idSet = this.childGroups.get(group)
      if (idSet && idSet.has(childId))
        return true
    }
    return false
  }

  // --
  // -- [makeBkb and makeDash] Emit events
  // --

  public broadcast(ev: ComponentEvent, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitter.emit(ev)
    else
      this.app.asyncCall(() => this.emitter.emit(ev))
  }

  public emit<D>(eventName: string, data?: D, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitSync(this.createEvent<D>(eventName, data))
    else
      this.app.asyncCall(() => this.emitSync<D>(this.createEvent<D>(eventName, data)))
  }

  private createEvent<D>(eventName, data?: D): ComponentEvent<D> {
    let that = this,
      canPropagate = true
    return Object.freeze({
      eventName,
      get source() {
        return that.getInstance()
      },
      data,
      stopPropagation: () => {
        canPropagate = false
      },
      [Container.canPropagateSymb]: () => canPropagate
    } as ComponentEvent<D>)
  }

  private emitSync<D>(ev: ComponentEvent<D>) {
    this.emitter.emit(ev)
    let parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent<D>(ev, false, this.componentId)
  }

  private bubbleUpEvent<D>(ev: ComponentEvent<D>, isFromDeep: boolean, childId: number) {
    if (ev[Container.canPropagateSymb] && !ev[Container.canPropagateSymb]())
      return
    this.childEmitter.emit<D>(ev, isFromDeep, this.getGroupsOf(childId))
    let parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent<D>(ev, true, this.componentId)
  }

  // --
  // -- [makeBkb and makeDash] Listen
  // --

  public listenToParent<D>(eventName: string | string[], filter?: ParentFilter): Transmitter<D> {
    let parent = this.getParent(filter)
    if (parent)
      return parent.emitter.listen(eventName, this)
    if (filter)
      throw new Error(`Cannot find the filtered parent`)
    return Emitter.empty()
  }

  public listenTo<D>(inst: object, eventName: string | string[]): Transmitter<D> {
    return this.app.getContainerByInst(inst).emitter.listen(eventName, this)
  }

  // --
  // -- [makeBkb and makeDash] Navigate to parents
  // --

  private getGroupsOf(childId: number): Set<string> {
    let result = new Set<string>()
    if (this.childGroups) {
      for (let [groupName, idSet] of Array.from(this.childGroups.entries())) {
        if (idSet.has(childId))
          result.add(groupName)
      }
    }
    return result
  }

  public getParent(filter?: ParentFilter): Container | undefined {
    let parent: Container | undefined = this
    while (parent = this.app.getParentOf(parent.componentId)) {
      if (!filter || filter(parent))
        return parent
    }
  }

  // --
  // -- [makeBkb and makeDash] Navigate to children
  // --

  public getChildren(filter: FindChildOptions): object[] {
    let containers = this.getChildContainers(filter.group),
      result: object[] = []
    for (let child of containers) {
      if (!filter.filter || filter.filter(child))
        result.push(child.getInstance())
    }
    return result
  }

  public getChild(filter: FindChildOptions): object {
    let list = this.getChildren(filter)
    if (list.length !== 1)
      throw new Error(`Cannot find single ${JSON.stringify(filter)} in component ${this.componentId}`)
    return list[0]
  }

  public countChildren(filter: FindChildOptions): number {
    return this.getChildren(filter).length
  }

  public hasChildren(filter: FindChildOptions): boolean {
    return this.countChildren(filter) > 0
  }

  public isChild(obj: object): boolean {
    let compId = this.app.getContainerByInst(obj).componentId
    return this === this.app.getParentOf(compId)
  }

  public destroyChildren(filter: FindChildOptions) {
    let containers = this.getChildContainers(filter.group)
    for (let child of containers) {
      if (!filter.filter || filter.filter(child))
        child.destroy()
    }
  }

  private getChildContainers(groupName?: string | string[]): Iterable<Container> {
    if (!groupName)
      return this.app.getChildrenOf(this.componentId)
    if (!this.childGroups)
      return []
    let names = <string[]>(typeof groupName === "string" ? [groupName] : groupName)
    let identifiers = new Set<number>()
    for (let name of names) {
      let group = this.childGroups.get(name)
      if (!group)
        continue
      for (let id of group.values())
        identifiers.add(id)
    }
    let containers: Container[] = []
    for (let id of identifiers.values())
      containers.push(this.app.getContainer(id))
    return containers
  }
}

function makeBkb(container: Container, additionalMembers?: any): Bkb {
  let bkb: Bkb = {
    get instance() {
      return container.getInstance()
    },
    get parent() {
      return this.getParent()
    },
    getParent: function (filter?: ParentFilter) {
      let parent = container.getParent(filter)
      return parent ? parent.getInstance() : undefined
    },
    onData: function <D>(eventName: string, cb: any, thisArg?: any) {
      container.emitter.listen(eventName).onData(cb, thisArg)
      return bkb
    },
    onEvent: function <D>(eventName: string, cb: any, thisArg?: any) {
      container.emitter.listen(eventName).onEvent(cb, thisArg)
      return bkb
    },
    listen: (eventName: string) => container.emitter.listen(eventName),
    destroy: () => container.destroy(),
    children: <C>(filter: FindChildOptions = {}) => container.getChildren(filter) as any[],
    getChild: <C>(filter: FindChildOptions = {}) => container.getChild(filter) as any,
    countChildren: (filter: FindChildOptions = {}) => container.countChildren(filter),
    hasChildren: (filter: FindChildOptions = {}) => container.hasChildren(filter),
    isChild: (obj: object) => container.isChild(obj),
    isComponent: (obj: object) => container.app.isComponent(obj)
  }
  if (additionalMembers)
    Object.assign(bkb, additionalMembers)
  Object.freeze(bkb)
  return bkb
}

export interface InternalNewComponentAsObj {
  asObj: true
  obj: object
}

export interface InternalNewComponentNew {
  asObj: false
  Class: any
  args: any[]
}

export type InternalNewComponent = InternalNewComponentAsObj | InternalNewComponentNew

function makeDash<C>(container: Container, bkb: Bkb): Dash | ApplicationDash {
  let source: any = {
    setInstance: (inst: any) => { container.setInstance(inst) },
    exposeEvent: function (...eventNames: any[]) {
      let names = eventNames.length === 1 && Array.isArray(eventNames[0]) ? eventNames[0] : eventNames
      container.emitter.exposeEvent(names, true)
      return dash
    },
    create: <C>(Class: { new(): C }, ...args: any[]) =>
      container.createChild({ asObj: false, Class, args }).getInstance(),
    asComponent: (obj: object) => container.createChild({ asObj: true, obj }).dash!,
    addToGroup: (child: object, ...groups: string[]) => {
      container.addToGroup(child, ...groups)
      return dash
    },
    isInGroup: (child: object, ...groups: string[]) => container.isInGroup(child, ...groups),
    emit: function <D>(eventName: string | string[], data?: D, options?: EmitterOptions) {
      let names = Array.isArray(eventName) ? eventName : [eventName]
      for (let name of names)
        container.emit<D>(name, data, options)
      return dash
    },
    broadcast: function (ev: ComponentEvent, options?: EmitterOptions) {
      container.broadcast(ev, options)
      return dash
    },
    listenToParent: <D>(eventName: string | string[], filter?: ParentFilter) =>
      container.listenToParent<D>(eventName, filter),
    listenToChildren: <D>(eventName: string | string[], filter?: ListenChildOptions) =>
      container.childEmitter.listen<D>(eventName, filter),
    listenTo: <D>(inst: object, eventName: string | string[]) => container.listenTo<D>(inst, eventName),
    destroyChildren: (filter: FindChildOptions = {}) => {
      container.destroyChildren(filter)
      return dash
    },
    getBkbOf: (inst: object) => container.app.getContainerByInst(inst).bkb,
    bkb: bkb as any
  }
  if (!bkb["log"])
    source.log = container.app.log
  let dash = Object.assign(Object.create(bkb), source)
  if (container.app.root && container.app.root !== container) {
    Object.defineProperties(dash, {
      app: { get: () => container.app.root.getInstance() }
    })
  }
  Object.freeze(dash)
  return dash
}