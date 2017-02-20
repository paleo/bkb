interface ChildCallbackEventOnly extends CallbackEventOnly {
  filter: ChildFilter
}
interface ChildCallbackDataFirst extends CallbackDataFirst {
  filter: ChildFilter
}
interface ChildCallbackArguments extends CallbackArguments {
  filter: ChildFilter
}
type ChildCallback = ChildCallbackEventOnly | ChildCallbackDataFirst | ChildCallbackArguments

class ChildEmitter {
  private callbacks: Map<string, ChildCallback[]> | null
  private destroyed = false

  constructor(private app: InternalApplicationContainer) {
  }

  public emit<D>(ev: ComponentEvent<D>, deep: boolean, groupNames: Set<string>): void {
    if (!this.callbacks)
      return
    let cbList = this.callbacks.get(ev.eventName)
    if (!cbList)
      return
    const filtered: ChildCallback[] = []
    for (const cb of cbList) {
      if ((cb.filter.componentName && cb.filter.componentName === ev.sourceName)
        || (!cb.filter.deep && deep)
        || (cb.filter.group && !ChildEmitter.hasGroup(cb.filter.group, groupNames)))
        continue
      filtered.push(cb)
    }
    this.callCbList<D>(filtered, ev)
  }

  public listen<D>(eventName: string, filter: ChildFilter = {}): Transmitter<D> {
    if (this.destroyed)
      throw new Error(`Cannot call listen in a destroyed child-emitter`)
    if (!this.callbacks)
      this.callbacks = new Map()
    let idList: number[] | null = []
    const isDisabled = () => this.destroyed || !idList
    const transmitter = {
      call: (modeOrCb: any, cbOrThisArg?: any, thisArg?: any) => {
        if (this.destroyed || !idList || !this.callbacks)
          return transmitter
        let cbList = this.callbacks.get(eventName)
        if (!cbList)
          this.callbacks.set(eventName, cbList = [])
        const id = cbList.length
        idList.push(id)
        if (typeof modeOrCb === "string") {
          cbList[id] = {
            mode: modeOrCb as any,
            callback: cbOrThisArg,
            thisArg,
            filter: filter
          }
        } else {
          cbList[id] = {
            mode: "eventOnly",
            callback: modeOrCb,
            thisArg: cbOrThisArg,
            filter: filter
          }
        }
        return transmitter
      },
      disable: () => {
        if (isDisabled() || !this.callbacks)
          return
        let cbList = this.callbacks.get(eventName)
        if (cbList) {
          for (const id of idList!)
            delete cbList[id]
        }
        idList = null
      },
      isDisabled
    }
    return transmitter
  }

  public destroy(): void {
    this.callbacks = null
    this.destroyed = true
  }

  private static hasGroup(needle: string | string[], groupNames: Set<string>) {
    const groups = <string[]>(typeof needle === "string" ? [needle] : needle)
    for (const group of groups) {
      if (groupNames.has(group))
        return true
    }
    return false
  }

  private callCbList<D>(cbList: ChildCallback[], ev: ComponentEvent<D>) {
    for (const cb of cbList) {
      try {
        call(cb, ev)
      } catch (e) {
        this.app.errorHandler(e)
      }
    }
  }
}