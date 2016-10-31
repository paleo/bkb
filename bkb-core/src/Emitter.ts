class Emitter {
  private eventNames: Set<string>|null
  private strictEvents = false
  private callbacks: Map<string, ((...args: any[]) => void)[]>|null
  private destroyed = false
  private fromEolCancelers: Listener[]|null = []

  constructor(private app: InternalApplicationContainer, eventNames?: string[]) {
    if (eventNames)
      this.exposeEvents(eventNames, false)
  }

  public exposeEvents(eventNames: string[], strictEventsMode: boolean): void {
    if (this.destroyed)
      throw new Error(`Cannot call exposeEvents in a destroyed listener`)
    if (!this.eventNames)
      this.eventNames = new Set()
    for (const name of eventNames)
      this.eventNames.add(name)
    if (strictEventsMode)
      this.strictEvents = true
  }

  public emit(eventName: string, args?: any[]): void {
    if (!this.callbacks)
      return
    if (this.strictEvents && this.eventNames && !this.eventNames.has(eventName))
      throw new Error(`Unexposed event: ${eventName}`)
    let cbList = this.callbacks.get(eventName)
// console.log('emit', args)
    if (cbList)
      this.callCbList(cbList, args)
  }

  public listen(eventName: string, from?: Container<any>): Listener {
    if (this.destroyed || !this.fromEolCancelers)
      throw new Error(`Cannot call listen in a destroyed emitter`)
    if (!this.callbacks)
      this.callbacks = new Map()
    let idList: number[]|null = []
    const listener = {
      call: (callback: (...args: any[]) => void) => {
        if (this.destroyed || !idList || !this.callbacks)
          return listener
        let cbList = this.callbacks.get(eventName)
        if (!cbList)
          this.callbacks.set(eventName, cbList = [])
        const id = cbList.length
        idList.push(id)
        cbList[id] = callback
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
        if (fromEolCanceler) {
          fromEolCanceler()
          fromEolCanceler = null
        }
      }
    }
    let fromEolCanceler
    if (from && from.bkb) {
      const destroyListener = from.bkb.listen('destroy').call(() => listener.cancel()),
        cancelerId = this.fromEolCancelers.length
      this.fromEolCancelers[cancelerId] = destroyListener
      fromEolCanceler = () => {
        destroyListener.cancel()
        if (this.fromEolCancelers)
          delete this.fromEolCancelers[cancelerId]
      }
    } else
      fromEolCanceler = null
    return listener
  }

  public destroy(): void {
    if (this.fromEolCancelers) {
      for (const i in this.fromEolCancelers) {
        if (this.fromEolCancelers.hasOwnProperty(i))
          this.fromEolCancelers[i].cancel()
      }
    }
    this.fromEolCancelers = null
    this.callbacks = null
    this.eventNames = null
    this.destroyed = true
  }

  private callCbList(cbList: ((...args: any[]) => void)[], args?: any[]) {
    for (const i in cbList) {
      if (!cbList.hasOwnProperty(i))
        continue
      const cb = cbList[i]
      try {
        if (args)
          cb(...args)
        else
          cb()
      } catch (e) {
        this.app.errorHandler(e)
      }
    }
  }
}