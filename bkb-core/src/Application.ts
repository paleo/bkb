type SHIM_ANY = any

function createApplication<A>(obj: any = {}): A & Application<A> {
  const appContainer = new ApplicationContainer<A>(obj)
  return <any>appContainer.root.inst
}

interface InternalApplicationContainer {
  root: Container<any>
  createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean, properties: NewComponentProperties): Container<C>
  getChildrenOf(componentId: number): Container<any>[]
  getParentOf(componentId: number): Container<any>
  getContainer(componentId: number): Container<any>
  removeComponent<C>(container: Container<C>): void
  errorHandler(err: any): void
  nextTick(cb: () => void): void
}

interface CompNode {
  container: Container<any>
  parent?: CompNode
  children?: Map<number, CompNode>
}

class ApplicationContainer<A> implements InternalApplicationContainer {

  public /* readonly */ root: Container<A>

  private compCount = 0
  private nodes: Map<number, CompNode> = new Map<SHIM_ANY, SHIM_ANY>()
  private tickList: (() => void)[] = null
  private insideRmComp = false

  constructor(obj: any) {
    this.root = this.createRootComponent(obj)
  }

  public getParentOf(componentId: number): Container<any> {
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
      instanceComponent: <C>(Cl, properties?: NewComponentProperties) => this.root.context.instanceComponent(Cl, properties),
      objectComponent: <C>(obj, properties?: NewComponentProperties) => this.root.context.objectComponent(obj, properties),
      nextTick: (cb: () => void) => this.nextTick(cb),
      log: this.createLog(logTypes)
    })
    container.createFromObject(obj, false)
    container.exposeEvents(['log', ...logTypes, 'addComponent', 'removeComponent', 'changeComponent'], true)
    return container
  }

  public createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean,
                            properties: NewComponentProperties): Container<C> {
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
      parentNode.children = new Map<SHIM_ANY, SHIM_ANY>()
    parentNode.children.set(componentId, node)
    container.initBkbAndContext()
    if (asObject)
      container.createFromObject(objOrCl, !!properties.freeze)
    else
      container.createInstance(objOrCl, properties.args || [])
    this.root.context.emit('addComponent', {component: container.inst})
    this.root.context.emit('changeComponent', {component: container.inst, type: 'add'})
    return container
  }

  public removeComponent<C>(container: Container<C>): void {
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
        node.parent.children.delete(componentId)
      }
      this.nodes.delete(componentId)
    } finally {
      if (mainRm)
        this.insideRmComp = false
    }
  }

  public errorHandler(err: any): void {
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