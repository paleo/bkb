import { ComponentEvent, EmitOptions, PublicDash, Dash, ApplicationDash, ComponentFilter, FindChildFilter, EventName, EventCallback, UnattendedEvents, DashAugmentation } from "./interfaces"
import { ApplicationContainer } from "./Application"
import { Emitter } from "./Emitter"
import { Subscriber } from "./Subscriber";

export class Container {
  public pub: PublicDash | undefined
  public dash: Dash | ApplicationDash | undefined
  public emitter: Emitter
  public subscriber = new Subscriber()

  private inst: object | undefined
  private childGroups?: Map<string, Set<number>>

  private static canPropagateSymb = Symbol("canPropagate")

  constructor(public app: ApplicationContainer, readonly componentId: number) {
    this.emitter = new Emitter(app, ["destroy"])
    this.pub = makePublicDash(this)
    this.dash = makeDash(this, this.pub)
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
    if (!this.pub)
      throw new Error(`Destroyed component`)
    this.inst = inst
    return inst
  }

  public getInstance(): object {
    if (!this.inst) {
      if (this.pub)
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
    this.subscriber.destroy()
    this.pub = undefined
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
  // -- [make dashs]
  // --

  public createChild(nc: InternalNewComponent): Container {
    return this.app.createComponent(nc, this)
  }

  public addToGroup(child: object, groups: string[]) {
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

  public inGroup(child: object, groups: string[]) {
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
  // -- [make dashs] Emit events
  // --

  public broadcast(ev: ComponentEvent, options?: EmitOptions) {
    if (options && options.sync)
      this.emitter.emit(ev)
    else
      this.app.asyncCall(() => this.emitter.emit(ev))
  }

  public emit(eventName: string, data?: any, options?: EmitOptions) {
    if (options && options.sync)
      this.emitSync(this.createEvent(eventName, data))
    else
      this.app.asyncCall(() => this.emitSync(this.createEvent(eventName, data)))
  }

  private createEvent(eventName, data?: any): ComponentEvent {
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
    } as ComponentEvent)
  }

  private emitSync(ev: ComponentEvent) {
    this.emitter.emit(ev)
    let parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent(ev)
  }

  private bubbleUpEvent(ev: ComponentEvent) {
    if (ev[Container.canPropagateSymb] && !ev[Container.canPropagateSymb]())
      return
    this.emitter.emit(ev)
    let parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent(ev)
  }

  // --
  // -- [make dashs] Listen
  // --

  // listenTo(component: object, eventName: EventName, listener: EventCallback, thisArg?: any) {
  //   this.app.getContainerByInst(component).emitter.on(arr(eventName), listener, thisArg)
  // }

  // --
  // -- [make dashs] Navigate to parents
  // --

  // private getGroupsOf(childId: number): Set<string> {
  //   let result = new Set<string>()
  //   if (this.childGroups) {
  //     for (let [groupName, idSet] of Array.from(this.childGroups.entries())) {
  //       if (idSet.has(childId))
  //         result.add(groupName)
  //     }
  //   }
  //   return result
  // }

  public getParent(filter?: ComponentFilter): Container | undefined {
    let parent: Container | undefined = this
    while (parent = this.app.getParentOf(parent.componentId)) {
      if (!filter || filter(parent))
        return parent
    }
  }

  public getParents(filter?: ComponentFilter): Container[] {
    let parent: Container | undefined = this,
      result = [] as Container[]
    while (parent = this.app.getParentOf(parent.componentId)) {
      if (!filter || filter(parent))
        result.push(parent)
    }
    return result
  }

  // --
  // -- [make dashs] Navigate to children
  // --

  public getChildren(filter: FindChildFilter): object[] {
    let containers = this.getChildContainers(filter.group),
      result: object[] = []
    for (let child of containers) {
      if (!filter.filter || filter.filter(child))
        result.push(child.getInstance())
    }
    return result
  }

  public getChild(filter: FindChildFilter): object {
    let list = this.getChildren(filter)
    if (list.length !== 1)
      throw new Error(`Cannot find single ${JSON.stringify(filter)} in component ${this.componentId}`)
    return list[0]
  }

  public countChildren(filter: FindChildFilter): number {
    return this.getChildren(filter).length
  }

  public hasChildren(filter: FindChildFilter): boolean {
    return this.countChildren(filter) > 0
  }

  public isChild(obj: object): boolean {
    let compId = this.app.getContainerByInst(obj).componentId
    return this === this.app.getParentOf(compId)
  }

  public destroyChildren(filter: FindChildFilter) {
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

function makePublicDash(container: Container): PublicDash {
  let pub: PublicDash = Object.freeze({
    unattendedEvents: Object.freeze({
      on: (eventName: EventName, listener: EventCallback, thisArg?: any) => {
        container.emitter.on(arr(eventName), listener, thisArg)
      },
      off: (eventName: EventName, listener: EventCallback, thisArg?: any) => {
        container.emitter.off(new Set(arr(eventName)), listener, thisArg)
      }
    }),
    get instance() {
      return container.getInstance()
    },
    get parent() {
      return pub.getParent()
    },
    getParent: function (filter?: ComponentFilter) {
      let parent = container.getParent(filter)
      return parent ? parent.getInstance() : undefined
    },
    getParents: (filter?: ComponentFilter) => {
      return container.getParents(filter).map(parentContainer => parentContainer.getInstance())
    },
    destroy: () => container.destroy(),
    children: <C>(filter: FindChildFilter = {}) => container.getChildren(filter) as any[],
    getChild: <C>(filter: FindChildFilter = {}) => container.getChild(filter) as any,
    countChildren: (filter: FindChildFilter = {}) => container.countChildren(filter),
    hasChildren: (filter: FindChildFilter = {}) => container.hasChildren(filter),
    isChild: (obj: object) => container.isChild(obj),
    isComponent: (obj: object) => container.app.isComponent(obj),
    getPublicDashOf: (inst: object) => container.app.getContainerByInst(inst).pub!,
    log: container.app.log
  })
  return pub
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

function makeDash<C>(container: Container, pub: PublicDash): Dash | ApplicationDash {
  let source: Partial<Dash | ApplicationDash> = {
    setInstance: (inst: any) => {
      container.setInstance(inst)
      return dash as any
    },
    exposeEvent: function (...eventNames: any[]) {
      container.emitter.exposeEvent(flatten(eventNames), true)
      return dash as any
    },
    create: (Class: { new(): any }, ...args: any[]) => {
      return container.createChild({ asObj: false, Class, args }).getInstance() as any
    },
    toComponent: (obj: object) => container.createChild({ asObj: true, obj }).dash as any,
    addToGroup: (child: object, ...groups) => {
      container.addToGroup(child, flatten(groups))
      return dash as any
    },
    inGroup: (child: object, ...groups) => container.inGroup(child, flatten(groups)),
    emit: function (eventName: EventName, data?, options?: EmitOptions) {
      let names = Array.isArray(eventName) ? eventName : [eventName]
      for (let name of names)
        container.emit(name, data, options)
      return dash as any
    },
    broadcast: function (ev: ComponentEvent, options?: EmitOptions) {
      container.broadcast(ev, options)
      return dash as any
    },
    listenTo: (...args) => {
      let targetContainer: Container,
        eventName: EventName,
        listener: EventCallback,
        thisArg
      if (args.length === 2 || typeof args[0] === "string" || Array.isArray(args[0])) {
        let component
        [component, eventName, listener, thisArg] = args
        targetContainer = container.app.getContainerByInst(component)
      } else {
        [eventName, listener, thisArg] = args
        targetContainer = container
      }
      container.subscriber.listenTo(targetContainer.emitter, arr(eventName), listener, thisArg)
      return dash as any
    },
    stopListening: (...args) => {
      let targetContainer: Container,
        eventName: EventName,
        listener: EventCallback,
        thisArg
      let count = args.length
      if (typeof args[0] === "string" || Array.isArray(args[0])) {
        [eventName, listener, thisArg] = args
        targetContainer = container
      } else if (count === 1 || count === 2) {
        [listener, thisArg] = args
        container.subscriber.stopListeningEverywhere(listener, thisArg)
        return
      } else {
        let component
        [component, eventName, listener, thisArg] = args
        targetContainer = container.app.getContainerByInst(component)
      }
      container.subscriber.stopListening(targetContainer.emitter, arr(eventName), listener, thisArg)
      return dash as any
    },
    destroyChildren: (filter: FindChildFilter = {}) => {
      container.destroyChildren(filter)
      return dash as any
    },
    publicDash: pub
  }
  let dash: Dash | ApplicationDash = Object.assign(Object.create(pub), source)
  if (container.app.root && container.app.root !== container) {
    Object.defineProperties(dash, {
      app: { get: () => container.app.root.getInstance() }
    })
    Object.assign(pub, ...container.app.augmentList.map(augment => augment(dash as Dash)))
  } else {
    ;(dash as ApplicationDash).registerDashAugmentation = (augment: (d: Dash) => DashAugmentation) => {
      container.app.augmentList.push(augment)
    }
  }
  Object.freeze(dash)
  return dash
}

function arr(name: string | string[]): string[] {
  return typeof name === "string" ? [name] : name
}

function flatten(args: any[]): string[] {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : args
}
