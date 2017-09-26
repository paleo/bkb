function createApplication<A>(Class: { new(dash: ApplicationDash<A>, ...args: any[]): A }, ...args: any[]): A {
  let container = new ApplicationContainer(Class, false, args)
  return container.root.getInstance() as any
}

function asApplication<A>(obj: A) {
  let container = new ApplicationContainer(obj, true)
  return container.root.dash as ApplicationDash<A>
}

interface InternalApplicationContainer {
  // root: Container
  // createComponent<C>(nc: InternalNewComponent, parent: Container): Container<C>
  // getChildrenOf(componentId: number): Container[]
  // getParentOf(componentId: number): Container | undefined
  // getContainer(componentId: number): Container
  // removeComponent<C>(container: Container<C>): void
  errorHandler(err: any): void
  // nextTick(cb: () => void): void
}

interface CompNode {
  container: Container
  parent?: CompNode | null
  children?: Map<number, CompNode> | null
}

class ApplicationContainer implements InternalApplicationContainer {

  public root: Container
  public log: Log

  private compCount = 0
  private nodesByInst = new WeakMap<object, CompNode>()
  private nodes = new Map<number, CompNode>()
  private tickList: (() => void)[] | null = null
  private insideRmComp = false

  constructor(objOrCl: any, asObject: boolean, args?: any[]) {
    let logTypes = ["error", "warn", "info", "debug", "trace"],
      compId = this.newId()
    this.log = this.createLog(logTypes)
    this.root = new Container(this, "root", compId, {
      nextTick: (cb: () => void) => this.nextTick(cb),
      log: this.log
    })
    let node = {
      container: this.root
    }
    this.nodes.set(compId, node)
    this.root.emitter.exposeEvents(["log", ...logTypes, "addComponent", "removeComponent", "changeComponent"], false)
    let inst = asObject ? this.root.setInstance(objOrCl) : this.root.makeInstance(objOrCl, args || [])
    this.nodesByInst.set(inst, node)
  }

  public getParentOf(compId: number): Container | undefined {
    let node = this.findNode(compId)
    return node.parent ? node.parent.container : undefined
  }

  public getChildrenOf(compId: number): Container[] {
    let result: Container[] = [],
      children = this.findNode(compId).children
    if (children) {
      for (let child of Array.from(children.values()))
        result.push(child.container)
    }
    return result
  }

  public getContainer(compId: number): Container {
    return this.findNode(compId).container
  }

  public getContainerByInst(inst: object): Container {
    return this.findNodeByInst(inst).container
  }

  public createComponent(nc: InternalNewComponent, parent: Container): Container {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    let compName = nc.props.componentName || ApplicationContainer.getComponentName(nc.asObj ? nc.obj : nc.props.Class),
      compId = this.newId(),
      container = new Container(this, compName, compId)
    let parentNode = this.findNode(parent.componentId),
      node = {
        container: container,
        parent: parentNode
      }
    this.nodes.set(compId, node)
    if (!parentNode.children)
      parentNode.children = new Map()
    parentNode.children.set(compId, node)
    let inst: object
    if (nc.asObj)
      inst = container.setInstance(nc.obj)
    else {
      let args = nc.props.arguments || (nc.props.argument ? [nc.props.argument] : [])
      inst = container.makeInstance(nc.props.Class, args)
    }
    this.nodesByInst.set(inst, node)
    this.root.dash.emit("addComponent", { component: container.getInstance() })
    this.root.dash.emit("changeComponent", { component: container.getInstance(), type: "add" })
    return container
  }

  public removeComponent<C>(container: Container, inst?: object): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    let mainRm = !this.insideRmComp
    try {
      if (mainRm) {
        this.insideRmComp = true
        this.root.dash.emit("removeComponent", { component: container.getInstance() }, { sync: true })
        this.root.dash.emit("changeComponent", { component: container.getInstance(), type: "remove" }, { sync: true })
      }
      let compId = container.componentId,
        node = this.findNode(compId)
      if (node.children) {
        for (let child of Array.from(node.children.values())) {
          child.parent = null
          child.container.destroy()
        }
        node.children.clear()
      }
      if (node.parent) {
        node.parent.container.forgetChild(compId)
        node.parent.children!.delete(compId)
      }
      this.nodes.delete(compId)
      if (inst)
        this.nodesByInst.delete(inst)
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
          for (let cb of this.tickList) {
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

  private findNode(compId: number): CompNode {
    let node = this.nodes.get(compId)
    if (!node)
      throw new Error(`Missing node of component "${compId}"`)
    return node
  }

  private findNodeByInst(inst: object): CompNode {
    let node = this.nodesByInst.get(inst)
    if (!node)
      throw new Error(`Cannot find a component for the instance: ${inst}`)
    return node
  }

  private newId(): number {
    return this.compCount++
  }

  private createLog(logTypes: string[]): Log {
    let log = {}
    for (let type of logTypes) {
      log[type] = (...messages: any[]) => {
        if (!this.root.dash)
          throw new Error("Destroyed root component")
        this.root.dash.emit("log", {
          type: type,
          messages: messages
        }, { sync: true })
      }
    }
    return Object.freeze(log) as any
  }

  private static getComponentName(objOrCl): string {
    // if (Symbol && Symbol.toStringTag && objOrCl[Symbol.toStringTag])
    //   return objOrCl[Symbol.toStringTag]
    if (typeof objOrCl.componentName === "string")
      return objOrCl.componentName
    if (objOrCl.constructor && objOrCl.constructor.name)
      return objOrCl.constructor.name
    let results = /function (.+)\(/.exec(objOrCl.toString())
    if (results && results.length > 1)
      return results[1]
    return "Function"
    //throw new Error(`Missing static property "componentName" in component ${objOrCl}`)
  }
}