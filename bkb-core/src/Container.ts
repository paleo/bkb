class Container<C> {
  public bkb: Bkb | null
  public dash: Dash<any> | ApplicationDash<any> | null
  public emitter: Emitter
  public childEmitter: ChildEmitter

  private inst: Component<C> | null
  private childGroups: Map<string, Set<number>>

  private static canPropagateSymb = Symbol('canPropagate')

  constructor(public app: ApplicationContainer<any>, readonly componentName, readonly componentId: number,
    bkbMethods?: any) {
    this.emitter = new Emitter(app, ['destroy'])
    this.childEmitter = new ChildEmitter(app)
    this.bkb = makeBkb(this, bkbMethods)
    this.dash = makeDash(this, this.bkb)
  }

  // --
  // -- Used by Application
  // --

  public makeInstance(Cl, args: any[]) {
    this.setInstance(new Cl(this.dash, ...args))

    // /*
    //  * Simulate the "new" operator. The Container member `inst` and the instance member `bkb` are defined before the
    //  * execution of the constructor.
    //  *
    //  * Thanks to http://stackoverflow.com/q/10428603/3786294
    //  */
    // this.inst = Object.create(Cl.prototype)
    // Object.defineProperty(this.inst, 'bkb', {get: () => this.bkb})
    // let retVal = Cl.call(this.inst, this.dash, ...args)
    // if (Object(retVal) === retVal && retVal !== this.inst) {
    //   this.inst = retVal
    //   if (!retVal.bkb)
    //     throw new Error(`Missing member "bkb" (${Cl})`)
    // }
  }

  public setInstance(inst) {
    if (this.inst)
      return
    if (!this.bkb)
      throw new Error(`Destroyed component`)
    if (inst.bkb)
      throw new Error(`A component cannot have a member "bkb"`)
    Object.defineProperty(inst, 'bkb', { get: () => this.bkb })
    this.inst = inst
  }

  public getInstance() {
    if (!this.inst) {
      if (this.bkb)
        throw new Error(`The component instance is still not initialized`)
      throw new Error('Destroyed component')
    }
    return this.inst
  }

  public destroy() {
    this.emit('destroy', undefined, { sync: true })
    this.app.removeComponent(this)
    if (this.childGroups)
      this.childGroups.clear()
    this.emitter.destroy()
    this.childEmitter.destroy()
    this.bkb = null
    this.dash = null
    this.inst = null
  }

  public forgetChild(componentId: number) {
    if (this.childGroups) {
      for (const group of Array.from(this.childGroups.values()))
        group.delete(componentId)
    }
  }

  // --
  // -- [makeBkb and makeDash]
  // --

  public createComponent<E>(objOrCl, properties: NewComponentProperties, asObject: boolean): Container<E> {
    const child = this.app.createComponent<E>(objOrCl, this, asObject, properties)
    if (properties.group) {
      if (!this.childGroups)
        this.childGroups = new Map()
      const groupNames = (typeof properties.group === 'string' ? [properties.group] : properties.group) as string[]
      for (const name of groupNames) {
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

  public broadcast(evt: ComponentEvent<any>, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitter.emit(evt)
    else
      this.app.nextTick(() => this.emitter.emit(evt))
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

  private emitSync<D>(evt: ComponentEvent<D>) {
    this.emitter.emit(evt)
    const parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent<D>(evt, false, this.componentId)
  }

  private bubbleUpEvent<D>(evt: ComponentEvent<D>, isFromDeep: boolean, childId: number) {
    if (evt[Container.canPropagateSymb] && !evt[Container.canPropagateSymb]())
      return
    this.childEmitter.emit<D>(evt, isFromDeep, this.getGroupsOf(childId))
    const parent = this.app.getParentOf(this.componentId)
    if (parent)
      parent.bubbleUpEvent<D>(evt, true, this.componentId)
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

  public listenTo<D>(component: Component<Object>, eventName: string): Transmitter<D> {
    return this.app.getContainer(component.bkb.componentId).emitter.listen(eventName, this)
  }

  // --
  // -- [makeBkb and makeDash] Navigate to parents
  // --

  private getGroupsOf(childId: number): Set<string> {
    const result = new Set<string>()
    if (this.childGroups) {
      for (const [groupName, idSet] of Array.from(this.childGroups.entries())) {
        if (idSet.has(childId))
          result.add(groupName)
      }
    }
    return result
  }

  public getParent(filter?: ParentFilter): Container<any> | undefined {
    let parent: Container<any> | undefined = this
    while (parent = this.app.getParentOf(parent.componentId)) {
      if (!filter || !filter.componentName || filter.componentName === parent.componentName)
        return parent
    }
  }

  // --
  // -- [makeBkb and makeDash] Navigate to children
  // --

  public find<C>(filter: ChildFilter): C[] {
    if (filter.deep)
      throw new Error('Cannot call "find" with filter deep')
    const containers = this.getChildContainers(filter.group),
      result: C[] = []
    for (const child of containers) {
      if (!filter.componentName || filter.componentName === child.componentName)
        result.push(child.getInstance())
    }
    return result
  }

  public findSingle<C>(filter: ChildFilter): C {
    const list = this.find<C>(filter)
    if (list.length !== 1)
      throw new Error(`Cannot find single ${JSON.stringify(filter)} in ${this.componentName} ${this.componentId}`)
    return list[0]
  }

  public count(filter: ChildFilter): number {
    return this.find<any>(filter).length
  }

  public has(filter: ChildFilter): boolean {
    return this.count(filter) > 0
  }

  private getChildContainers(groupName?: string | string[]): Container<any>[] {
    if (!groupName)
      return this.app.getChildrenOf(this.componentId)
    if (!this.childGroups)
      return []
    const names = <string[]>(typeof groupName === 'string' ? [groupName] : groupName)
    const idSet = new Set<number>()
    for (const name of names) {
      const group = this.childGroups.get(name)
      if (!group)
        continue
      for (const id of Array.from(group.values()))
        idSet.add(id)
    }
    const containers: Container<any>[] = []
    for (const id of Array.from(idSet.values()))
      containers.push(this.app.getContainer(id))
    return containers
  }
}

function makeBkb<C>(container: Container<C>, additionalMembers?: any): Bkb {
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
    on: function<D>(eventName: string, modeOrCb: any, cbOrThisArg?: any, thisArg?: any) {
      container.emitter.listen(eventName).call(modeOrCb, cbOrThisArg, thisArg)
      return this
    },
    listen: (eventName: string) => container.emitter.listen(eventName),
    destroy: () => container.destroy(),
    componentName: container.componentName,
    componentId: container.componentId,
    find: <E>(filter: ChildFilter = {}) => container.find<E>(filter),
    findSingle: <E>(filter: ChildFilter = {}) => container.findSingle<E>(filter),
    count: (filter: ChildFilter = {}) => container.count(filter),
    has: (filter: ChildFilter = {}) => container.has(filter)
  }
  if (additionalMembers)
    Object.assign(bkb, additionalMembers)
  Object.freeze(bkb)
  return bkb
}

function makeDash<C>(container: Container<C>, bkb: Bkb): Dash<any> | ApplicationDash<any> {
  let dash = Object.assign(Object.create(bkb), {
    setInstance: inst => container.setInstance(inst),
    exposeEvents: function (eventNames: string[]) {
      container.emitter.exposeEvents(eventNames, true)
      return this
    },
    create: <C>(Cl: { new (): C }, properties: NewComponentProperties = {}) => container.createComponent<C>(Cl, properties, false).getInstance(),
    toComponent: <C>(obj, properties: NewComponentProperties = {}) => (container.createComponent<C>(obj, properties, true) as any).dash!,
    emit: function<D>(eventName: string, data?: D, options?: EmitterOptions) {
      container.emit<D>(eventName, data, options)
      return this
    },
    broadcast: function(evt: ComponentEvent<any>, options?: EmitterOptions) {
      container.broadcast(evt, options)
      return this
    },
    listenToParent: <D>(eventName: string, filter: ParentFilter = {}) => container.listenToParent<D>(eventName, filter),
    listenToChildren: <D>(eventName: string, filter?: ChildFilter) => container.childEmitter.listen<D>(eventName, filter),
    listenTo: <D>(component: Component<Object>, eventName: string) => container.listenTo<D>(component, eventName),
    bkb: bkb as any
  })
  if (container.app.root && container.app.root !== container)
    dash.app = container.app.root.getInstance()
  Object.freeze(dash)
  return dash
}