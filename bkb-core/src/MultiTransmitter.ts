import { Transmitter, ComponentEvent } from "./interfaces"

export function createMultiTransmitter(transmitters: Transmitter[]): Transmitter {
  let disabled = false
  return {
    onData(callback: (data: any, ev: ComponentEvent<any>) => void, thisArg?: any) {
      transmitters.forEach(transmitter => transmitter.onData(callback, thisArg))
      return this
    },
    onEvent(callback: (ev: ComponentEvent<any>) => void, thisArg?: any) {
      transmitters.forEach(transmitter => transmitter.onEvent(callback, thisArg))
      return this
    },
    disable(): void {
      disabled = true
      transmitters.forEach(transmitter => transmitter.disable())
    },
    get isDisabled() {
      return disabled
    }
  }
}
