import { ComponentEvent, Transmitter, ListenChildOptions } from "./interfaces"
import { Listener, call } from "./Emitter"
import { InternalApplicationContainer } from "./Application";

type ChildCallback = Listener & {
  filter: ListenChildOptions
}

export class ChildEmitter {
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
      if ((cb.filter.filter && cb.filter.filter(ev.source))
        || (!cb.filter.deep && deep)
        || (cb.filter.group && !ChildEmitter.hasGroup(cb.filter.group, groupNames)))
        continue
      filtered.push(cb)
    }
    this.callCbList<D>(filtered, ev)
  }

  public listen<D>(eventNames: string | string[], filter: ListenChildOptions = {}): Transmitter<D> {
    if (this.destroyed)
      throw new Error("Cannot call 'listen' in a destroyed child-emitter")
    if (typeof eventNames === "string")
      eventNames = [eventNames]
    if (!this.callbacks)
      this.callbacks = new Map()
    let idList: number[] | null = []
    let isDisabled = () => this.destroyed || !idList

    const on = (mode: "event" | "data", cb: any, thisArg?: any) => {
      if (this.destroyed || !idList || !this.callbacks)
        return transmitter
      for (let evName of eventNames) {
        let cbList = this.callbacks.get(evName)
        if (!cbList)
          this.callbacks.set(evName, cbList = [])
        let id = cbList.length
        idList.push(id)
        cbList[id] = {
          mode: mode as any,
          cb,
          thisArg,
          filter
        }
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
        for (let evName of eventNames) {
          let cbList = this.callbacks.get(evName)
          if (cbList) {
            for (let id of idList!)
              delete cbList[id]
          }
        }
        idList = null
      },
      get isDisabled() {
        return isDisabled()
      }
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