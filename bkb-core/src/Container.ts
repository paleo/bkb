class Container {
  public bkb: Bkb | undefined
  public dash: Dash | ApplicationDash | undefined
  public emitter: Emitter
  public childEmitter: ChildEmitter

  private inst: object | undefined
  private childGroups: Map<string, Set<number>>

  private static canPropagateSymb = Symbol("canPropagate")

  constructor(public app: ApplicationContainer, readonly componentName, readonly componentId: number,
    bkbMethods?: any) {
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
    let child = this.app.createComponent(nc, this)
    if (nc.props.group) {
      if (!this.childGroups)
        this.childGroups = new Map()
      let groupNames = (typeof nc.props.group === "string" ? [nc.props.group] : nc.props.group) as string[]
      for (let name of groupNames) {
        let g = this.childGroups.get(name)
        if (!g)
          this.childGroups.set(name, g = new Set())
        g.add(child.componentId)
      }
    }
    return child
  }

  // --
  // -- [makeBkb and makeDash] Emit events
  // --

  public broadcast(ev: ComponentEvent, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitter.emit(ev)
    else
      this.app.nextTick(() => this.emitter.emit(ev))
  }

  public emit<D>(eventName: string, data?: D, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitSync(this.createEvent<D>(eventName, data))
    else
      this.app.nextTick(() => this.emitSync<D>(this.createEvent<D>(eventName, data)))
  }

  private createEvent<D>(eventName, data?: D): ComponentEvent<D> {
    let canPropagate = true
    return Object.freeze({
      eventName,
      sourceName: this.componentName,
      sourceId: this.componentId,
      source: this.getInstance(),
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

  public listenToParent<D>(eventName: string, filter: ParentFilter): Transmitter<D> {
    let parent = this.getParent(filter)
    if (parent)
      return parent.emitter.listen(eventName, this)
    if (filter.componentName)
      throw new Error(`Unknown parent ${filter.componentName}`)
    return Emitter.empty()
  }

  public listenTo<D>(inst: object, eventName: string): Transmitter<D> {
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
      if (!filter || !filter.componentName || filter.componentName === parent.componentName)
        return parent
    }
  }

  // --
  // -- [makeBkb and makeDash] Navigate to children
  // --

  public find(filter: ChildFilter): object[] {
    if (filter.deep)
      throw new Error(`Cannot call "find" with filter deep`)
    let containers = this.getChildContainers(filter.group),
      result: object[] = []
    for (let child of containers) {
      if (!filter.componentName || filter.componentName === child.componentName)
        result.push(child.getInstance())
    }
    return result
  }

  public findSingle(filter: ChildFilter): object {
    let list = this.find(filter)
    if (list.length !== 1)
      throw new Error(`Cannot find single ${JSON.stringify(filter)} in ${this.componentName} ${this.componentId}`)
    return list[0]
  }

  public count(filter: ChildFilter): number {
    return this.find(filter).length
  }

  public has(filter: ChildFilter): boolean {
    return this.count(filter) > 0
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
      return this
    },
    onEvent: function <D>(eventName: string, cb: any, thisArg?: any) {
      container.emitter.listen(eventName).onEvent(cb, thisArg)
      return this
    },
    listen: (eventName: string) => container.emitter.listen(eventName),
    destroy: () => container.destroy(),
    componentName: container.componentName,
    componentId: container.componentId,
    find: <C>(filter: ChildFilter = {}) => container.find(filter) as any[],
    findSingle: <C>(filter: ChildFilter = {}) => container.findSingle(filter) as any,
    count: (filter: ChildFilter = {}) => container.count(filter),
    has: (filter: ChildFilter = {}) => container.has(filter)
  }
  if (additionalMembers)
    Object.assign(bkb, additionalMembers)
  Object.freeze(bkb)
  return bkb
}

interface InternalNewComponentAsObj {
  asObj: true
  props: AsComponentProperties
  obj: object
}
interface InternalNewComponentNew {
  asObj: false
  props: CreateComponentProperties<any, any>
}
type InternalNewComponent = InternalNewComponentAsObj | InternalNewComponentNew

function makeDash<C>(container: Container, bkb: Bkb): Dash | ApplicationDash {
  let source: any = {
    setInstance: inst => container.setInstance(inst),
    exposeEvents: function (...eventNames: any[]) {
      let names = eventNames.length === 1 && Array.isArray(eventNames[0]) ? eventNames[0] : eventNames
      container.emitter.exposeEvents(names, true)
      return this
    },
    create: <C>(Class: { new(): C }, ...args: any[]) => container.createChild(
      { asObj: false, props: { Class, arguments: args } }
    ).getInstance(),
    customCreate: <C>(props: CreateComponentProperties<any, C>) => container.createChild(
      { asObj: false, props }
    ).getInstance(),
    asComponent: (obj: object, props: AsComponentProperties = {}) => container.createChild(
      { asObj: true, props, obj }
    ).dash!,
    emit: function <D>(eventName: string | string[], data?: D, options?: EmitterOptions) {
      let names = Array.isArray(eventName) ? eventName : [eventName]
      for (let name of names)
        container.emit<D>(name, data, options)
      return this
    },
    broadcast: function (ev: ComponentEvent, options?: EmitterOptions) {
      container.broadcast(ev, options)
      return this
    },
    listenToParent: <D>(eventName: string, filter: ParentFilter = {}) => container.listenToParent<D>(eventName, filter),
    listenToChildren: <D>(eventName: string, filter?: ChildFilter) => container.childEmitter.listen<D>(eventName, filter),
    listenTo: <D>(inst: object, eventName: string) => container.listenTo<D>(inst, eventName),
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