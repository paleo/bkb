import { ComponentEvent, EventCallback } from "./interfaces"
import { InternalLog } from "./Application"
import { Container } from "./Container"

export interface Listener {
  cb: EventCallback
  thisArg?: any
}

function call(listener: Listener, ev: ComponentEvent) {
  if (listener.thisArg)
    listener.cb.call(listener.thisArg, ev.data, ev)
  else
    listener.cb(ev.data, ev)
}

export class Emitter {
  private eventNames = new Set<string>()
  private strictEvents = false
  private listeners: Map<string, Listener[]> | undefined
  private destroyed = false

  constructor(private log: InternalLog, eventNames?: string[]) {
    if (eventNames)
      this.exposeEvent(eventNames, false)
  }

  exposeEvent(eventNames: string[], strictEventsMode: boolean): void {
    if (this.destroyed)
      throw new Error(`Cannot call exposeEvent in a destroyed transmitter`)
    for (let name of eventNames)
      this.eventNames.add(name)
    if (strictEventsMode)
      this.strictEvents = true
  }

  emit(ev: ComponentEvent) {
    if (this.destroyed || !this.listeners)
      return
    if (this.strictEvents && !this.eventNames.has(ev.eventName))
      throw new Error(`Unexposed event: ${ev.eventName}`)
    let list = this.listeners.get(ev.eventName)
    if (list) {
      for (let item of list) {
        try {
          call(item, ev)
        } catch (e) {
          this.log.errorHandler(e)
        }
      }
    }
  }

  on(eventNames: string[], listener: EventCallback, thisArg?) {
    if (this.destroyed)
      return
    if (!this.listeners)
      this.listeners = new Map()
    for (let evName of eventNames) {
      let list = this.listeners.get(evName)
      if (!list)
        this.listeners.set(evName, list = [])
      list.push({
        cb: listener,
        thisArg
      })
    }
  }

  /**
   * This method doesn't need any optimisation. Because during the life of the `Emitter`, the arrays of listeners are inevitably scanned for each `emit`.
   */
  off(eventNames: Set<string> | undefined, listener: EventCallback, thisArg?: any) {
    if (this.destroyed || !this.listeners)
      return
    for (let [evName, list] of this.listeners) {
      if (eventNames && !eventNames.has(evName))
        continue
      for (let i = 0; i < list.length; ++i) {
        let item = list[i]
        if (item.cb === listener && item.thisArg === thisArg) {
          list.splice(i, 1)
          --i
        }
      }
    }
  }

  destroy() {
    this.listeners = undefined
    this.destroyed = true
  }
}