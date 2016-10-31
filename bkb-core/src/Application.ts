function createApplication<A>(obj: any = {}): A & Application<A> {
  const appContainer = new ApplicationContainer<A>(obj)
  return appContainer.root.inst as any
}

interface InternalApplicationContainer {
  root: Container<any>
  createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean, properties: NewComponentProperties): Container<C>
  getChildrenOf(componentId: number): Container<any>[]
  getParentOf(componentId: number): Container<any>|null
  getContainer(componentId: number): Container<any>
  removeComponent<C>(container: Container<C>): void
  errorHandler(err: any): void
  nextTick(cb: () => void): void
}

interface CompNode {
  container: Container<any>
  parent?: CompNode|null
  children?: Map<number, CompNode>|null
}

class ApplicationContainer<A> implements InternalApplicationContainer {

  readonly root: Container<A>

  private compCount = 0
  private nodes = new Map<number, CompNode>()
  private tickList: (() => void)[]|null = null
  private insideRmComp = false

  constructor(obj: any) {
    this.root = this.createRootComponent(obj)
  }

  public getParentOf(componentId: number): Container<any>|null {
    const node = this.findNode(componentId)
    return node.parent ? node.parent.container : null
  }

  public getChildrenOf(componentId: number): Container<any>[] {
    const result = [],
      children = this.findNode(componentId).children
    if (children) {
      for (const child of Array.from(children.values()))
        result.push(child.container)
    }
    return result
  }

  public getContainer(componentId: number): Container<any> {
    return this.findNode(componentId).container
  }

  private createRootComponent(obj: any): Container<A> {
    const logTypes = ['error', 'warn', 'info', 'debug', 'trace'],
      componentId = this.newId(),
      container = new Container<A>(this, 'root', componentId)
    this.nodes.set(componentId, {
      container: container
    })
    container.initBkbAndContext({
      createComponent: <C>(Cl: { new(): C }, properties?: NewComponentProperties) => {
        if (!this.root.context)
          throw new Error('Destroyed root component')
        return this.root.context.createComponent(Cl, properties)
      },
      toComponent: <C>(obj, properties?: NewComponentProperties) => {
        if (!this.root.context)
          throw new Error('Destroyed root component')
        return this.root.context.toComponent(obj, properties)
      },
      nextTick: (cb: () => void) => this.nextTick(cb),
      log: this.createLog(logTypes)
    })
    container.createFromObject(obj)
    container.exposeEvents(['log', ...logTypes, 'addComponent', 'removeComponent', 'changeComponent'], true)
    return container
  }

  public createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean,
                            properties: NewComponentProperties): Container<C> {
    if (!this.root.context)
      throw new Error('Destroyed root component')
    const componentName = properties.componentName ? properties.componentName : ApplicationContainer.getComponentName(objOrCl),
      componentId = this.newId(),
      container = new Container<C>(this, componentName, componentId)
    const parentNode = this.findNode(parent.componentId),
      node = {
        container: container,
        parent: parentNode
      }
    this.nodes.set(componentId, node)
    if (!parentNode.children)
      parentNode.children = new Map()
    parentNode.children.set(componentId, node)
    container.initBkbAndContext()
    if (asObject)
      container.createFromObject(objOrCl)
    else
      container.createInstance(objOrCl, properties.args || [])
    this.root.context.emit('addComponent', {component: container.inst})
    this.root.context.emit('changeComponent', {component: container.inst, type: 'add'})
    return container
  }

  public removeComponent<C>(container: Container<C>): void {
    if (!this.root.context)
      throw new Error('Destroyed root component')
    const mainRm = !this.insideRmComp
    try {
      if (mainRm) {
        this.insideRmComp = true
        this.root.context.emit('removeComponent', {component: container.inst}, {sync: true})
        this.root.context.emit('changeComponent', {component: container.inst, type: 'remove'}, {sync: true})
      }
      const componentId = container.componentId,
        node = this.findNode(componentId)
      if (node.children) {
        for (const child of Array.from(node.children.values())) {
          child.parent = null
          child.container.destroy()
        }
        node.children.clear()
      }
      if (node.parent) {
        node.parent.container.forgetChild(componentId)
        (node.parent.children as Map<number, CompNode>).delete(componentId)
      }
      this.nodes.delete(componentId)
    } finally {
      if (mainRm)
        this.insideRmComp = false
    }
  }

  public errorHandler(err: any): void {
    if (!this.root.context)
      throw new Error('Destroyed root component')
    this.root.context.emit('error', err)
  }

  public nextTick(cb: () => void): void {
    if (!this.tickList) {
      this.tickList = [cb]
      setTimeout(() => {
        if (this.tickList) {
          for (const cb of this.tickList) {
            try {
              cb()
            } catch (e) {
              this.errorHandler(e)
            }
          }
          this.tickList = null
        }
      }, 0)
    } else
      this.tickList.push(cb)
  }

  private findNode(componentId: number): CompNode {
    const node = this.nodes.get(componentId)
    if (!node)
      throw new Error(`Missing node of component ${componentId}`)
    return node
  }

  private newId(): number {
    return this.compCount++
  }

  private createLog(logTypes: string[]): Log {
    const log = {}
    for (const type of logTypes) {
      log[type] = (...messages: any[]) => {
        if (!this.root.context)
          throw new Error('Destroyed root component')
        this.root.context.emit('log', {
          type: type,
          messages: messages
        })
      }
    }
    return <any>Object.freeze(log)
  }

  private static getComponentName(objOrCl): string {
    if (typeof objOrCl.componentName === 'string')
      return objOrCl.componentName
    if (objOrCl.constructor && objOrCl.constructor.name)
      return objOrCl.constructor.name
    const results = /function (.+)\(/.exec((this).constructor.toString())
    if (results && results.length > 1)
      return results[1]
    return 'Function'
    //throw new Error(`Missing static property "componentName" in component ${objOrCl}`)
  }
}