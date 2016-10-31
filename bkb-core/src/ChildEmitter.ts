interface Callback {
  callback: (evt: ComponentEvent<any, any>) => void
  filter: ChildFilter
}

class ChildEmitter {
  private callbacks: Map<string, Callback[]>|null
  private destroyed = false

  constructor(private app: InternalApplicationContainer) {
  }

  public emit<C, D>(evt: ComponentEvent<C, D>, deep: boolean, groupNames: Set<string>): void {
    if (!this.callbacks)
      return
    let cbList = this.callbacks.get(evt.eventName)
    if (!cbList)
      return
    const filtered = []
    for (const cb of cbList) {
      if ((cb.filter.componentName && cb.filter.componentName === evt.sourceName)
        || (!cb.filter.deep && deep)
        || (cb.filter.groupName && !ChildEmitter.hasGroup(cb.filter.groupName, groupNames)))
        continue
      filtered.push(cb.callback)
    }
    this.callCbList<C, D>(filtered, evt)
  }

  public listen<C, D>(eventName: string, filter: ChildFilter = {}): ComponentListener<C, D> {
    if (this.destroyed)
      throw new Error(`Cannot call listen in a destroyed child-emitter`)
    if (!this.callbacks)
      this.callbacks = new Map()
    let idList: number[]|null = []
    const listener = {
      call: (callback: (evt: ComponentEvent<C, D>) => void) => {
        if (this.destroyed || !idList || !this.callbacks)
          return listener
        let cbList = this.callbacks.get(eventName)
        if (!cbList)
          this.callbacks.set(eventName, cbList = [])
        const id = cbList.length
        idList.push(id)
        cbList[id] = {
          callback: callback,
          filter: filter
        }
        return listener
      },
      cancel: () => {
        if (this.destroyed || !idList || !this.callbacks)
          return
        let cbList = this.callbacks.get(eventName)
        if (cbList) {
          for (const id of idList)
            delete cbList[id]
        }
        idList = null
      }
    }
    return listener
  }

  public destroy(): void {
    this.callbacks = null
    this.destroyed = true
  }

  public static empty(): ComponentListener<any, any> {
    const listener = {
      call: () => {
        return listener
      },
      cancel: () => {
      }
    }
    return listener
  }

  private static hasGroup(needle: string | string[], groupNames: Set<string>) {
    const groups = <string[]>(typeof needle === 'string' ? [needle] : needle)
    for (const group of groups) {
      if (groupNames.has(group))
        return true
    }
    return false
  }

  private callCbList<C, D>(cbList: ((evt: ComponentEvent<C, D>) => void)[], evt: ComponentEvent<C, D>) {
    for (const cb of cbList) {
      try {
        cb(evt)
      } catch (e) {
        this.app.errorHandler(e)
      }
    }
  }
}