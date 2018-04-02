import { Log, Dash, DashAugmentation, LogEvent } from "./exported-definitions"
import { Bkb, InternalNewComponent } from "./Bkb"

interface CompNode {
  bkb: Bkb
  parent?: CompNode | undefined
  children?: Map<number, CompNode> | undefined
  created?: boolean
}

export class AppBkb {

  public root: Bkb
  public log: Log

  private compCount = 0
  private nodesByInst = new WeakMap<object, CompNode>()
  private nodes = new Map<number, CompNode>()
  private tickList: (() => void)[] | undefined
  private insideRmComp = false

  public augmentList: ((dash: Dash) => DashAugmentation)[] = []

  constructor(objOrCl: any, asObject: boolean, args?: any[]) {
    let compId = this.newId()
    this.log = this.createLog(["fatal", "error", "warn", "info", "debug", "trace"])
    this.root = new Bkb(this, compId)
    let node: CompNode = {
      bkb: this.root
    }
    this.nodes.set(compId, node)
    this.root.emitter.exposeEvent(["log", "addComponent", "removeComponent", "changeComponent"], false)
    if (asObject)
      this.root.setInstance(objOrCl)
    else
      this.root.makeInstance(objOrCl, args || []) // Can call 'removeComponent' and throw an error
    node.created = true
    // console.log("===> [DEBUG] init", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
  }

  public setInstanceOf(compId: number, inst) {
    let node = this.nodes.get(compId)
    if (!node)
      throw new Error(`Destroyed component`)
    this.nodesByInst.set(inst, node)
  }

  public getParentOf(compId: number): Bkb | undefined {
    let node = this.findNode(compId)
    return node.parent ? node.parent.bkb : undefined
  }

  public getChildrenOf(compId: number): Bkb[] {
    let result: Bkb[] = [],
      children = this.findNode(compId).children
    if (children) {
      for (let child of children.values())
        result.push(child.bkb)
    }
    return result
  }

  public getBkb(compId: number): Bkb {
    return this.findNode(compId).bkb
  }

  public getBkbByInst(obj: object): Bkb {
    return this.findNodeByInst(obj).bkb
  }

  public isComponent(obj: object): boolean {
    return this.nodesByInst.get(obj) ? true : false
  }

  public createComponent(nc: InternalNewComponent, parent: Bkb): Bkb {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    let compId = this.newId(),
      bkb = new Bkb(this, compId)
    // console.log("===> [DEBUG] create (before)", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    let parentNode = this.findNode(parent.componentId),
      node: CompNode = {
        bkb: bkb,
        parent: parentNode
      }
    this.nodes.set(compId, node)
    if (!parentNode.children)
      parentNode.children = new Map()
    parentNode.children.set(compId, node)
    if (nc.asObj)
      bkb.setInstance(nc.obj)
    else
      bkb.makeInstance(nc.Class, nc.args) // Can call 'removeComponent' and throw an error
    this.root.dash.emit(["addComponent", "changeComponent"], { component: bkb.getInstance(), type: "add" })
    // console.log("===> [DEBUG] create (after)", compId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    node.created = true
    return bkb
  }

  public removeComponent<C>(bkb: Bkb, inst: object | undefined): void {
    if (!this.root.dash)
      throw new Error("Destroyed root component")
    // console.log("===> [DEBUG] remove (before)", bkb.componentId, inst ? inst : "-no inst-", "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
    let mainRm = !this.insideRmComp
    try {
      let compId = bkb.componentId,
        node = this.findNode(compId)
      if (mainRm) {
        this.insideRmComp = true
        if (inst && node.created) {
          let ev = { component: inst, type: "remove" }
          this.root.dash.emit(["removeComponent", "changeComponent"], ev, { sync: true })
        }
      }
      if (node.children) {
        for (let child of node.children.values()) {
          child.parent = undefined
          child.bkb.destroy()
        }
        node.children.clear()
      }
      if (node.parent) {
        node.parent.bkb.forgetChild(compId)
        node.parent.children!.delete(compId)
      }
      this.nodes.delete(compId)
      if (inst)
        this.nodesByInst.delete(inst)
    } finally {
      if (mainRm)
        this.insideRmComp = false
    }
    // console.log("===> [DEBUG] remove (after)", bkb.componentId, "\n", publicNodesToString(this.nodes.get(this.root.componentId)!))
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
              this.log.error(e)
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

  private createLog(levels: (keyof Log)[]): Log {
    let log = {},
      num = 0
    for (let level of levels) {
      log[level] = (...messages: any[]) => {
        if (!this.root.dash)
          throw new Error("Destroyed root component")
        this.root.dash.emit("log", { level, messages, levelNumber: ++num } as LogEvent, { sync: true })
      }
    }
    return Object.freeze(log) as any
  }
}

// function publicNodesToString(node: CompNode, indent = '') {
//   let line = `${indent}- ${node.bkb.componentId} ${getComponentName(node.bkb["inst"])} (${node.children ? Array.from(node.children.values()).length : "-no children-"})`
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