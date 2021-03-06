import { AppBkb } from "./AppBkb"
import { DescendingOrderManager } from "./DescendingOrderManager"
import { Emitter } from "./Emitter"
import { AppDash, ComponentEvent, Dash, DashAugmentation, EmitOptions, EventCallback, EventName, FindChildFilter, OrderCallback, OrderName, PublicDash } from "./exported-definitions"
import { Subscriber } from "./Subscriber"
import { arr, flatten } from "./utils"

const CAN_PROPAGATE_SYMB = Symbol("canPropagate")

export class Bkb {
  pub: PublicDash | undefined
  dash: Dash | AppDash | undefined
  emitter: Emitter
  subscriber = new Subscriber()
  dOrders?: DescendingOrderManager

  inst: object | undefined
  private childGroups?: Map<string, Set<number>>

  constructor(public app: AppBkb, readonly componentId: number) {
    this.emitter = new Emitter(app.log, ["destroy"])
    this.pub = makePublicDash(this)
    this.dash = makeDash(this, this.pub)
  }

  // --
  // -- Used by Application
  // --

  makeInstance(Cl, options?: any) {
    if (this.inst)
      return
    let inst
    try {
      inst = new Cl(this.dash, options)
    } catch (err) {
      this.destroy()
      throw err
    }
    this.setInstance(inst)
  }

  setInstance(inst: object) {
    if (!this.pub)
      throw new Error(`Destroyed component`)
    if (this.inst) {
      if (inst !== this.inst)
        throw new Error(`Conflict between component instances`)
      return
    }
    this.inst = inst
    this.app.setInstanceOf(this.componentId, this.inst)
  }

  getInstance(): object {
    if (!this.inst) {
      if (this.pub)
        throw new Error(`The component instance is still not initialized`)
      throw new Error("Destroyed component")
    }
    return this.inst
  }

  destroy() {
    this.emit("destroy", undefined, { sync: true, cancelPropagation: true })
    this.app.removeComponent(this, this.inst)
    if (this.childGroups)
      this.childGroups.clear()
    this.emitter.destroy()
    this.subscriber.destroy()
    this.pub = undefined
    this.dash = undefined
    this.inst = undefined
  }

  forgetChild(compId: number) {
    if (this.childGroups) {
      for (let group of this.childGroups.values())
        group.delete(compId)
    }
  }

  // --
  // -- [make dashs]
  // --

  createChild(nc: InternalNewComponent): Bkb {
    return this.app.createComponent(nc, this)
  }

  addToGroup(child: object, groups: string[]) {
    let childId = this.app.getBkbByInst(child).componentId
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

  inGroup(child: object, groups: string[]) {
    if (!this.childGroups)
      return false
    let childId = this.app.getBkbByInst(child).componentId
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

  broadcast(ev: ComponentEvent, options: EmitOptions = {}) {
    if (options.sync)
      this.emitter.emit(ev)
    else
      this.app.asyncCall(() => this.emitter.emit(ev))
  }

  emit(eventName: string, data?: any, options: EmitOptions = {}) {
    if (options.sync)
      this.emitSync(this.createEvent(eventName, data, options.cancelPropagation))
    else
      this.app.asyncCall(() => this.emitSync(this.createEvent(eventName, data, options.cancelPropagation)))
  }

  // --
  // -- [make dashs] Navigate to parents
  // --

  getParent(): Bkb | undefined {
    return this.app.getParentOf(this.componentId)
  }

  getParents(): Bkb[] {
    let parent: Bkb | undefined = this
    let result = [] as Bkb[]
    while (parent = this.app.getParentOf(parent.componentId))
      result.push(parent)
    return result
  }

  // --
  // -- [make dashs] Navigate to children
  // --

  getChildren(filter: FindChildFilter): object[] {
    let list = this.getChildBkbs(filter.group)
    let filtered: object[] = []
    for (let child of list) {
      // if ((!filter.filter || filter.filter(child)) &&!child.inst)
      //   console.log("=======> Missing instance for component", child.componentId)
      if (child.inst && (!filter.filter || filter.filter(child)))
        filtered.push(child.inst)
    }
    return filtered
  }

  hasChildren(filter: FindChildFilter): boolean {
    return this.getChildren(filter).length > 0
  }

  isChild(obj: object): boolean {
    let compId = this.app.getBkbByInst(obj).componentId
    return this === this.app.getParentOf(compId)
  }

  destroyChildren(filter: FindChildFilter) {
    let bkbs = this.getChildBkbs(filter.group)
    for (let child of bkbs) {
      if (!filter.filter || filter.filter(child))
        child.destroy()
    }
  }

  // --
  // -- Descending Orders
  // --

  getDOrders(): DescendingOrderManager {
    if (!this.dOrders)
      this.dOrders = new DescendingOrderManager(this.app, this.componentId)
    return this.dOrders
  }

  private createEvent(eventName: string, data: any, cancelPropagation?: boolean): ComponentEvent {
    let that = this
    let canPropagate = !cancelPropagation
    return Object.freeze({
      eventName,
      get source() {
        return that.getInstance()
      },
      data,
      stopPropagation: () => {
        canPropagate = false
      },
      [CAN_PROPAGATE_SYMB]: () => canPropagate
    } as ComponentEvent)
  }

  private emitSync(ev: ComponentEvent) {
    this.emitter.emit(ev)
    if (ev[CAN_PROPAGATE_SYMB] && ev[CAN_PROPAGATE_SYMB]()) {
      let parent = this.app.getParentOf(this.componentId)
      if (parent)
          parent.emitSync(ev)
    }
  }

  private getChildBkbs(groupName?: string | string[]): Iterable<Bkb> {
    if (!groupName)
      return this.app.getChildrenOf(this.componentId)
    if (!this.childGroups)
      return []
    let names = (typeof groupName === "string" ? [groupName] : groupName) as string[]
    let identifiers = new Set<number>()
    for (let name of names) {
      let group = this.childGroups.get(name)
      if (!group)
        continue
      for (let id of group.values())
        identifiers.add(id)
    }
    let bkbs: Bkb[] = []
    for (let id of identifiers.values())
      bkbs.push(this.app.getBkb(id))
    return bkbs
  }
}

function makePublicDash(bkb: Bkb): PublicDash {
  let pub: PublicDash = Object.freeze({
    unmanagedListeners: Object.freeze({
      on: (eventName: EventName, listener: EventCallback, thisArg?: any) => {
        bkb.emitter.on(arr(eventName), listener, thisArg)
      },
      off: (eventName: EventName, listener: EventCallback, thisArg?: any) => {
        bkb.emitter.off(new Set(arr(eventName)), listener, thisArg)
      }
    }),
    getComponent() {
      return bkb.getInstance()
    },
    children: (filter: FindChildFilter = {}) => bkb.getChildren(filter) as any[],
    hasChildren: (filter: FindChildFilter = {}) => bkb.hasChildren(filter),
    isChild: (obj: object) => bkb.isChild(obj),
    destroy: () => bkb.destroy(),
    invokeDescendingOrder(orderName: OrderName, orderData: any) {
      bkb.getDOrders().invokeOrder(orderName, orderData)
      return this
    },
    isComponent: (obj: object) => bkb.app.isComponent(obj),
    getPublicDashOf: (inst: object) => bkb.app.getBkbByInst(inst).pub!,
    getParentOf(inst: object) {
      let parent =  bkb.app.getBkbByInst(inst).getParent()
      return parent ? parent.getInstance() : undefined
    },
    log: bkb.app.log,
    get app() {
      return bkb.app.root.getInstance()
    }
  })
  return pub
}

export interface InternalNewComponentAsObj {
  asObj: true
  obj: object
}

export interface InternalNewComponentAsInst {
  asObj: false
  Class: any
  opt: any[]
}

export type InternalNewComponent = InternalNewComponentAsObj | InternalNewComponentAsInst

function makeDash(bkb: Bkb, pub: PublicDash): Dash | AppDash {
  let source: Partial<Dash | AppDash> = {
    setInstance: (inst: any) => {
      bkb.setInstance(inst)
      return dash as any
    },
    exposeEvent (...eventNames: any[]) {
      bkb.emitter.exposeEvent(flatten(eventNames), true)
      return dash as any
    },
    create: (Class: { new(): any }, opt?: any) => {
      return bkb.createChild({ asObj: false, Class, opt }).getInstance() as any
    },
    registerComponent: (obj: object) => bkb.createChild({ asObj: true, obj }).dash as any,
    addToGroup: (child: object, ...groups) => {
      bkb.addToGroup(child, flatten(groups))
      return dash as any
    },
    inGroup: (child: object, ...groups) => bkb.inGroup(child, flatten(groups)),
    emit (eventName: EventName, data?, options?: EmitOptions) {
      let names = Array.isArray(eventName) ? eventName : [eventName]
      for (let name of names)
        bkb.emit(name, data, options)
      return dash as any
    },
    broadcast (ev: ComponentEvent, options?: EmitOptions) {
      bkb.broadcast(ev, options)
      return dash as any
    },
    listenTo: (...args) => {
      let targetBkb: Bkb
      let eventName: EventName
      let listener: EventCallback
      let thisArg
      if (args.length === 2 || typeof args[0] === "string" || Array.isArray(args[0])) {
        [eventName, listener, thisArg] = args
        targetBkb = bkb
      } else {
        let component
        [component, eventName, listener, thisArg] = args
        targetBkb = bkb.app.getBkbByInst(component)
      }
      bkb.subscriber.listenTo(targetBkb.emitter, arr(eventName), listener, thisArg)
      return dash as any
    },
    stopListening: (...args) => {
      let targetBkb: Bkb
      let eventName: EventName
      let listener: EventCallback
      let thisArg
      let count = args.length
      if (typeof args[0] === "string" || Array.isArray(args[0])) {
        [eventName, listener, thisArg] = args
        targetBkb = bkb
      } else if (count === 1 || count === 2) {
        [listener, thisArg] = args
        bkb.subscriber.stopListeningEverywhere(listener, thisArg)
        return
      } else {
        let component
        [component, eventName, listener, thisArg] = args
        targetBkb = bkb.app.getBkbByInst(component)
      }
      bkb.subscriber.stopListening(targetBkb.emitter, arr(eventName), listener, thisArg)
      return dash as any
    },
    listenToDescendingOrder(orderName: OrderName, listener: OrderCallback, thisArg?: any) {
      bkb.getDOrders().listenToDescendingOrder(orderName, listener, thisArg)
      return dash
    },
    stopListeningDescendingOrder(orderName: OrderName, listener: OrderCallback, thisArg?: any) {
      bkb.getDOrders().stopListeningDescendingOrder(orderName, listener, thisArg)
      return dash
    },
    destroyChildren: (filter: FindChildFilter = {}) => {
      bkb.destroyChildren(filter)
      return dash as any
    },
    publicDash: pub
  }
  let dash: Dash | AppDash = Object.assign(Object.create(pub), source)
  Object.assign(dash, ...bkb.app.augmentList.map(augment => augment(dash as Dash)))
  if (!bkb.app.root || bkb.app.root === bkb) { // AppDash
    (dash as AppDash).addDashAugmentation = (augment: (d: Dash) => DashAugmentation) => {
      bkb.app.augmentList.push(augment)
    }
  }
  Object.freeze(dash)
  return dash
}