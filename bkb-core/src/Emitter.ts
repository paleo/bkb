interface ListenerEventMode {
  mode: "event"
  cb: (ev: ComponentEvent<any>) => void
  thisArg?: any
}
interface ListenerDataMode {
  mode: "data"
  cb: (data: any, ev: ComponentEvent<any>) => void
  thisArg?: any
}
type Listener = ListenerEventMode | ListenerDataMode

class Emitter {
  public static empty(): Transmitter<any> {
    let transmitter = {
      onData: () => {
        return transmitter
      },
      onEvent: () => {
        return transmitter
      },
      disable: () => {
      },
      isDisabled: () => false
    }
    return transmitter
  }

  private eventNames: Set<string> | null
  private strictEvents = false
  private callbacks: Map<string, Listener[]> | null
  private destroyed = false
  private fromEolCancelers: Transmitter<any>[] | null = []

  constructor(private app: InternalApplicationContainer, eventNames?: string[]) {
    if (eventNames)
      this.exposeEvents(eventNames, false)
  }

  public exposeEvents(eventNames: string[], strictEventsMode: boolean): void {
    if (this.destroyed)
      throw new Error(`Cannot call exposeEvents in a destroyed transmitter`)
    if (!this.eventNames)
      this.eventNames = new Set()
    for (let name of eventNames)
      this.eventNames.add(name)
    if (strictEventsMode)
      this.strictEvents = true
  }

  public emit(ev: ComponentEvent<any>): void {
    if (!this.callbacks)
      return
    if (this.strictEvents && this.eventNames && !this.eventNames.has(ev.eventName))
      throw new Error(`Unexposed event: ${ev.eventName}`)
    let cbList = this.callbacks.get(ev.eventName)
    if (cbList)
      this.callCbList(cbList, ev)
  }

  public listen(eventName: string, from?: Container<any>): Transmitter<any> {
    if (this.destroyed || !this.fromEolCancelers)
      throw new Error(`Cannot call listen in a destroyed emitter`)
    if (from && !from.bkb)
      throw new Error(`Cannot call listen from a destroyed component`)
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
        thisArg
      }
    }

    let transmitter: Transmitter<any> = {
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
        if (fromEolCanceler) {
          fromEolCanceler()
          fromEolCanceler = null
        }
      },
      isDisabled
    }

    let fromEolCanceler
    if (from) {
      let destroyTransmitter = from.bkb!.listen("destroy").onEvent(() => transmitter.disable()),
        cancelerId = this.fromEolCancelers.length
      this.fromEolCancelers[cancelerId] = destroyTransmitter
      fromEolCanceler = () => {
        destroyTransmitter.disable()
        if (this.fromEolCancelers)
          delete this.fromEolCancelers[cancelerId]
      }
    } else
      fromEolCanceler = null
    return transmitter
  }

  public destroy(): void {
    if (this.fromEolCancelers) {
      for (let i in this.fromEolCancelers) {
        if (this.fromEolCancelers.hasOwnProperty(i))
          this.fromEolCancelers[i].disable()
      }
    }
    this.fromEolCancelers = null
    this.callbacks = null
    this.eventNames = null
    this.destroyed = true
  }

  private callCbList(cbList: Listener[], ev: ComponentEvent<any>) {
    for (let i in cbList) {
      if (!cbList.hasOwnProperty(i))
        continue
      try {
        call(cbList[i], ev)
      } catch (e) {
        this.app.errorHandler(e)
      }
    }
  }
}

function call(cb: Listener, ev: ComponentEvent<any>) {
  switch (cb.mode) {
    case "data":
      if (cb.thisArg)
        cb.cb.call(cb.thisArg, ev.data, ev)
      else
        cb.cb(ev.data, ev)
      break
    case "event":
    default:
      if (cb.thisArg)
        cb.cb.call(cb.thisArg, ev)
      else
        cb.cb(ev)
      break
  }
}