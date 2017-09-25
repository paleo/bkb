type ChildCallback = (ListenerEventMode | ListenerDataMode) & {
  filter: ChildFilter
}

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
    let filtered: ChildCallback[] = []
    for (let cb of cbList) {
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
      throw new Error("Cannot call 'listen' in a destroyed child-emitter")
    if (!this.callbacks)
      this.callbacks = new Map()
    let idList: number[] | null = []
    let isDisabled = () => this.destroyed || !idList

    const on = (mode: "event" | "data", cb: any, thisArg?: any) => {
      if (this.destroyed || !idList || !this.callbacks)
        return transmitter
      let cbList = this.callbacks.get(eventName)
      if (!cbList)
        this.callbacks.set(eventName, cbList = [])
      let id = cbList.length
      idList.push(id)
      cbList[id] = {
        mode: mode as any,
        cb,
        thisArg,
        filter
      }
    }

    let transmitter: Transmitter = {
      onEvent: (cb: any, thisArg?: any) => {
        on("event", cb, thisArg)
        return transmitter
      },
      onData: (cb: any, thisArg?: any) => {
        on("data", cb, thisArg)
        return transmitter
      },
      disable: () => {
        if (isDisabled() || !this.callbacks)
          return
        let cbList = this.callbacks.get(eventName)
        if (cbList) {
          for (let id of idList!)
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
    let groups = <string[]>(typeof needle === "string" ? [needle] : needle)
    for (let group of groups) {
      if (groupNames.has(group))
        return true
    }
    return false
  }

  private callCbList<D>(cbList: ChildCallback[], ev: ComponentEvent<D>) {
    for (let cb of cbList) {
      try {
        call(cb, ev)
      } catch (e) {
        this.app.errorHandler(e)
      }
    }
  }
}