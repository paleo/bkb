function createApplication<A>(Cl: { new (dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): Application<A> {
  let container = new ApplicationContainer<A>(Cl, false, args)
  return container.root.getInstance() as any
}

function toApplication<A>(obj: A) {
  let container = new ApplicationContainer<A>(obj, true)
  return container.root.dash as ApplicationDash<A>
}

interface InternalApplicationContainer {
  root: Container<any>
  createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean, properties: NewComponentProperties): Container<C>
  getChildrenOf(componentId: number): Container<any>[]
  getParentOf(componentId: number): Container<any> | undefined
  getContainer(componentId: number): Container<any>
  removeComponent<C>(container: Container<C>): void
  errorHandler(err: any): void
  nextTick(cb: () => void): void
}

interface CompNode {
  container: Container<any>
  parent?: CompNode | null
  children?: Map<number, CompNode> | null
}

class ApplicationContainer<A> implements InternalApplicationContainer {

  public root: Container<A>

  private compCount = 0
  private nodes = new Map<number, CompNode>()
  private tickList: (() => void)[] | null = null
  private insideRmComp = false

  constructor(objOrCl: any, asObject: boolean, args?: any[]) {
    const logTypes = ["error", "warn", "info", "debug", "trace"],
      componentId = this.newId()
    this.root = new Container<A>(this, "root", componentId, {
      nextTick: (cb: () => void) => this.nextTick(cb),
      log: this.createLog(logTypes)
    })
    this.nodes.set(componentId, {
      container: this.root
    })
    this.root.emitter.exposeEvents(["log", ...logTypes, "addComponent", "removeComponent", "changeComponent"], false)
    if (asObject)
      this.root.setInstance(objOrCl)
    else
      this.root.makeInstance(objOrCl, args || [])
  }

  public getParentOf(componentId: number): Container<any> | undefined {
    const node = this.findNode(componentId)
    return node.parent ? node.parent.container : undefined
  }

  public getChildrenOf(componentId: number): Container<any>[] {
    const result: Container<any>[] = [],
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

  public createComponent<C>(objOrCl, parent: Container<any>, asObject: boolean,
    properties: NewComponentProperties): Container<C> {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    const componentName = properties.componentName || ApplicationContainer.getComponentName(objOrCl),
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
    if (asObject)
      container.setInstance(objOrCl)
    else
      container.makeInstance(objOrCl, properties.args || [])
    this.root.dash.emit("addComponent", { component: container.getInstance() })
    this.root.dash.emit("changeComponent", { component: container.getInstance(), type: "add" })
    return container
  }

  public removeComponent<C>(container: Container<C>): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    const mainRm = !this.insideRmComp
    try {
      if (mainRm) {
        this.insideRmComp = true
        this.root.dash.emit("removeComponent", { component: container.getInstance() }, { sync: true })
        this.root.dash.emit("changeComponent", { component: container.getInstance(), type: "remove" }, { sync: true })
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
        node.parent.children!.delete(componentId)
      }
      this.nodes.delete(componentId)
    } finally {
      if (mainRm)
        this.insideRmComp = false
    }
  }

  public errorHandler(err: any): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    this.root.dash.emit("log", {
      type: "error",
      messages: [err]
    }, { sync: true })
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
        if (!this.root.dash)
          throw new Error("Destroyed root component")
        this.root.dash.emit("log", {
          type: type,
          messages: messages
        }, { sync: true })
      }
    }
    return <any>Object.freeze(log)
  }

  private static getComponentName(objOrCl): string {
    // if (Symbol && Symbol.toStringTag && objOrCl[Symbol.toStringTag])
    //   return objOrCl[Symbol.toStringTag]
    if (typeof objOrCl.componentName === "string")
      return objOrCl.componentName
    if (objOrCl.constructor && objOrCl.constructor.name)
      return objOrCl.constructor.name
    const results = /function (.+)\(/.exec(objOrCl.toString())
    if (results && results.length > 1)
      return results[1]
    return "Function"
    //throw new Error(`Missing static property "componentName" in component ${objOrCl}`)
  }
}