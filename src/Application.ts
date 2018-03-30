import { Log, Dash, DashAugmentation } from "./exported-definitions"
import { Container, InternalNewComponent } from "./Container"

export interface InternalLog {
  errorHandler(err: any): void
}

interface CompNode {
  container: Container
  parent?: CompNode | undefined
  children?: Map<number, CompNode> | undefined
}

export class ApplicationContainer implements InternalLog {

  public root: Container
  public log: Log

  private compCount = 0
  private nodesByInst = new WeakMap<object, CompNode>()
  private nodes = new Map<number, CompNode>()
  private tickList: (() => void)[] | undefined
  private insideRmComp = false

  public augmentList: ((dash: Dash) => DashAugmentation)[] = []

  constructor(objOrCl: any, asObject: boolean, args?: any[]) {
    let logTypes = ["error", "warn", "info", "debug", "trace"],
      compId = this.newId()
    this.log = this.createLog(logTypes)
    this.root = new Container(this, compId)
    let node = {
      container: this.root
    }
    this.nodes.set(compId, node)
    this.root.emitter.exposeEvent(["log", ...logTypes, "addComponent", "removeComponent", "changeComponent"], false)
    if (asObject)
      this.root.setInstance(objOrCl)
    else
      this.root.makeInstance(objOrCl, args || [])

// console.log("===> [DEBUG] init", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
  }

  public setInstanceOf(compId: number, inst) {
    let node = this.nodes.get(compId)
    if (!node)
      throw new Error(`Destroyed component`)
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

  public getContainerByInst(obj: object): Container {
    return this.findNodeByInst(obj).container
  }

  public isComponent(obj: object): boolean {
    return this.nodesByInst.get(obj) ? true : false
  }

  public createComponent(nc: InternalNewComponent, parent: Container): Container {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    let compId = this.newId(),
      container = new Container(this, compId)
    // console.log("===> [DEBUG] create (before)", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    let parentNode = this.findNode(parent.componentId),
      node = {
        container: container,
        parent: parentNode
      }
    this.nodes.set(compId, node)
    if (!parentNode.children)
      parentNode.children = new Map()
    parentNode.children.set(compId, node)
    if (nc.asObj)
      container.setInstance(nc.obj)
    else
      container.makeInstance(nc.Class, nc.args)
    let evData =  { component: container.getInstance(), type: "add" }
    this.root.dash.emit(["addComponent", "changeComponent"], evData)
    // console.log("===> [DEBUG] create (after)", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    return container
  }

  public removeComponent<C>(container: Container, inst: object | undefined): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    // console.log("===> [DEBUG] remove (before)", container.componentId, inst ? inst : "-no inst-", "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    let mainRm = !this.insideRmComp
    try {
      if (mainRm) {
        this.insideRmComp = true
        let evData = { component: inst, type: "remove" }
        this.root.dash.emit(["removeComponent", "changeComponent"], evData, { sync: true })
      }
      let compId = container.componentId,
        node = this.findNode(compId)
      if (node.children) {
        for (let child of Array.from(node.children.values())) {
          child.parent = undefined
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
    // console.log("===> [DEBUG] remove (after)", container.componentId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
  }

  public errorHandler(err: any): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    this.root.dash.emit("log", {
      type: "error",
      messages: [err]
    }, { sync: true })
  }

  public asyncCall(cb: () => void): void {
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
          this.tickList = undefined
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
}

// function publicNodesToString(node: CompNode, indent = '') {
//   let line = `${indent}- ${node.container.componentId} ${getComponentName(node.container["inst"])} (${node.children ? Array.from(node.children.values()).length : "-no children-"})`
//   if (node.children) {
//     for (let child of node.children.values()) {
//       line += '\n' + publicNodesToString(child, `${indent}  `)
//     }
//   }
//   return line
// }

// function getComponentName(objOrCl): string {
//   if (!objOrCl)
//     return "-no-inst-"
//   if (Symbol && Symbol.toStringTag && objOrCl[Symbol.toStringTag])
//     return objOrCl[Symbol.toStringTag]
//   if (objOrCl.constructor && objOrCl.constructor.name)
//     return objOrCl.constructor.name
//   let results = /function (.+)\(/.exec(objOrCl.toString())
//   if (results && results.length > 1)
//     return results[1]
//   return "Function"
// }