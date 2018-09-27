import { Emitter } from "./Emitter"
import { EventCallback } from "./exported-definitions"

export class Subscriber {
  /**
   * listener => thisArg | null => emitter => eventNames
   */
  private map: Map<EventCallback, Map<any, Map<Emitter, Set<string>>>> | undefined

  listenTo(emitter: Emitter, eventNames: string[], listener: EventCallback, thisArg: any = null) {
    emitter.on(eventNames, listener, thisArg)
    if (!this.map)
      this.map = new Map()
    let map2 = this.map.get(listener)
    if (!map2)
      this.map.set(listener, map2 = new Map())
    let map3 = map2.get(thisArg)
    if (!map3)
      map2.set(thisArg, map3 = new Map())
    let set1 = map3.get(emitter)
    if (!set1)
      map3.set(emitter, set1 = new Set())
    for (let evName of eventNames)
      set1.add(evName)
  }

  stopListeningEverywhere(listener: EventCallback, thisArg: any = null) {
    if (!this.map)
      return
    let map2 = this.map.get(listener)
    if (!map2)
      return
    let map3 = map2.get(thisArg)
    if (!map3)
      return
    for (let [emitter, set1] of map3)
      emitter.off(set1, listener, thisArg)

    map2.delete(thisArg)
    if (map2.size === 0)
      this.map.delete(listener)
  }

  stopListening(emitter: Emitter, eventNames: string[], listener: EventCallback, thisArg: any = null) {
    if (!this.map)
      return
    let map2 = this.map.get(listener)
    if (!map2)
      return
    let map3 = map2.get(thisArg)
    if (!map3)
      return
    let set1 = map3.get(emitter)
    if (!set1)
      return

    let validNames = new Set<string>()
    for (let evName of eventNames) {
      if (set1.delete(evName))
        validNames.add(evName)
    }
    emitter.off(validNames, listener, thisArg)

    if (set1.size === 0) {
      map3.delete(emitter)
      if (map3.size === 0) {
        map2.delete(thisArg)
        if (map2.size === 0)
          this.map.delete(listener)
      }
    }
  }

  destroy() {
    if (!this.map)
      return

    for (let [listener, map2] of this.map) {
      for (let [thisArg, map3] of map2) {
        for (let [emitter, set1] of map3)
          emitter.off(set1, listener, thisArg)
      }
    }

    this.map = undefined
  }
}