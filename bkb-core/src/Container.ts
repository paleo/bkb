class Container<C> {
  public inst: (C & Component)|null
  public bkb: Bkb|null
  public dash: Dash<any>|null

  private emitter: Emitter
  private childEmitter: ChildEmitter
  private childGroups: Map<string, Set<number>>

  private static canPropagateSymb = Symbol('canPropagate')

  constructor(private app: ApplicationContainer<any>, readonly componentName, readonly componentId: number) {
    this.emitter = new Emitter(app, ['destroy'])
    this.childEmitter = new ChildEmitter(app)
  }

  public initBkbAndDash(bkbMethods?: any) {
    this.bkb = this.makeBkb(bkbMethods)
    this.dash = this.makeDash(this.bkb)
  }

  public exposeEvents(eventNames: string[], strictEventsMode: boolean) {
    this.emitter.exposeEvents(eventNames, strictEventsMode)
  }

  /**
   * Simulate the "new" operator. The Container member `inst` and the instance member `bkb` are defined before the execution of
   * the constructor.
   *
   * Thanks to http://stackoverflow.com/q/10428603/3786294
   */
  public createInstance(Cl, args: any[]) {
    // let inst = new Cl(this.dash, ...args)
    this.inst = Object.create(Cl.prototype)
    Object.defineProperty(this.inst, 'bkb', {get: () => this.bkb!});
    let retVal = Cl.call(this.inst, this.dash, ...args)
    if (Object(retVal) === retVal && retVal !== this.inst) {
      this.inst = retVal
      if (!retVal.bkb)
        throw new Error(`Missing member "bkb" (${Cl})`)
    }
  }

  public createFromObject(obj) {
    if (obj.bkb)
      throw new Error(`A component cannot have a member "bkb"`)
    Object.defineProperty(obj, 'bkb', {get: () => this.bkb!});
    //obj.bkb = this.bkb!
    this.inst = obj
  }

  private makeBkb(bkbMethods?: any): Bkb {
    let obj: Bkb = {
      getInstance: () => {
        if (!this.inst)
          throw new Error('Destroyed or uninitialised component')
        return this.inst
      },
      getParent: (filter?: ParentFilter) => {
        let parent = this.getParent(filter)
        return parent ? parent.inst : undefined
      },
      on: <D>(eventName: string, modeOrCb: any, cbOrThisArg?: any, thisArg?: any) => {
        this.emitter.listen(eventName).call(modeOrCb, cbOrThisArg, thisArg)
        return bkb
      },
      listen: (eventName: string) => this.emitter.listen(eventName),
      destroy: () => this.destroy(),
      componentName: this.componentName,
      componentId: this.componentId,
      find: <E>(filter: ChildFilter = {}) => this.find<E>(filter),
      findSingle: <E>(filter: ChildFilter = {}) => this.findSingle<E>(filter)
    }
    if (bkbMethods)
      obj = Object.assign(obj, bkbMethods)
    const bkb = Object.freeze(obj)
    return bkb
  }

  private makeDash(bkb: Bkb): Dash<any> {
    const dash = Object.freeze({
      app: this.app.root ? this.app.root.inst : null, // The root dash doesn't need this property
      bkb: bkb,
      exposeEvents: (eventNames: string[]) => {
        this.exposeEvents(eventNames, true)
        return dash
      },
      emit: <D>(eventName: string, data?: D, options?: EmitterOptions) => {
        this.emit<D>(eventName, data, options)
        return dash
      },
      broadcast: (evt: ComponentEvent<any>, options?: EmitterOptions) => {
        this.broadcast(evt, options)
        return dash
      },
      listenToChildren: <D>(eventName: string, filter?: ChildFilter) => this.childEmitter.listen<D>(eventName, filter),
      listenToParent: <D>(eventName: string, filter: ParentFilter = {}) => this.listenToParent<D>(eventName, filter),
      listenTo: <D>(component: Component, eventName: string) => this.listenTo<D>(component, eventName),
      create: <C>(Cl: {new(): C}, properties: NewComponentProperties = {}) => this.createComponent<C>(Cl, properties, false).inst,
      toComponent: <C>(obj, properties: NewComponentProperties = {}) => (this.createComponent<C>(obj, properties, true) as any).dash,
      onDestroy: (cb: (evt: ComponentEvent<void>) => void) => this.emitter.listen('destroy').call(cb),
      find: <C>(filter: ChildFilter = {}): C[] => this.find<C>(filter),
      findSingle: <C>(filter: ChildFilter = {}) => this.findSingle<C>(filter),
      getParent: (filter?: ParentFilter) => {
        let parent = this.getParent(filter)
        return parent ? parent.inst : undefined
      }
    })
    return dash
  }

  private createComponent<E>(objOrCl, properties: NewComponentProperties, asObject: boolean): Container<E> {
    const child = this.app.createComponent<E>(objOrCl, this, asObject, properties)
    if (properties.groupName) {
      if (!this.childGroups)
        this.childGroups = new Map()
      const groupNames = (typeof properties.groupName === 'string' ? [properties.groupName] : properties.groupName) as string[]
      for (const name of groupNames) {
        let g = this.childGroups.get(name)
        if (!g)
          this.childGroups.set(name, g = new Set())
        g.add(child.componentId)
      }
    }
    return child
  }

  private find<C>(filter: ChildFilter): C[] {
    if (filter.deep)
      throw new Error('Cannot call "find" with filter deep')
    const containers = this.getChildContainers(filter.groupName)
    const result: C[] = []
    for (const child of containers) {
      if (!filter.componentName || filter.componentName === child.componentName)
        result.push(child.inst)
    }
    return result
  }

  private findSingle<C>(filter: ChildFilter): C {
    const list = this.find<C>(filter)
    if (list.length !== 1)
      throw new Error(`Cannot find single ${JSON.stringify(filter)} in ${this.componentName} ${this.componentId}`)
    return list[0]
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

  private emit<D>(eventName: string, data?: D, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitSync(this.createEvent<D>(eventName, data))
    else
      this.app.nextTick(() => this.emitSync<D>(this.createEvent<D>(eventName, data)))
  }

  private createEvent<D>(eventName, data?: D) {
    if (!this.inst)
      throw new Error(`Cannot fire an event ${eventName} from an uninitialized component ${this.componentName}`)
    let canPropagate = true
    let evt: ComponentEvent<D> = {
      eventName: eventName,
      sourceName: this.componentName,
      sourceId: this.componentId,
      source: this.inst,
      data,
      stopPropagation: () => {
        canPropagate = false
      }
    }
    evt[Container.canPropagateSymb] = () => canPropagate
    return Object.freeze(evt)
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

  private broadcast(evt: ComponentEvent<any>, options?: EmitterOptions) {
    if (options && options.sync)
      this.emitter.emit(evt)
    else
      this.app.nextTick(() => this.emitter.emit(evt))
  }

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

  private getParent(filter?: ParentFilter): Container<any>|undefined {
    let parent: Container<any>|undefined = this
    while (parent = this.app.getParentOf(parent.componentId)) {
      if (!filter || !filter.componentName || filter.componentName === parent.componentName)
        return parent
    }
  }

  private listenToParent<D>(eventName: string, filter: ParentFilter): Transmitter<D> {
    let parent = this.getParent(filter)
    if (parent)
      return parent.emitter.listen(eventName, this)
    if (filter.componentName)
      throw new Error(`Unknown parent ${filter.componentName}`)
    return Emitter.empty()
  }

  private listenTo<D>(component: Component, eventName: string): Transmitter<D> {
    return this.app.getContainer(component.bkb.componentId).emitter.listen(eventName, this)
  }

  public destroy() {
    this.emit('destroy', undefined, {sync: true})
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
}