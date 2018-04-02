export interface ComponentFilter {
  (component: any): boolean
}

export interface FindChildFilter {
  /**
   * This optional filter defines one or several group names the children will have to match.
   */
  group?: string | string[]

  /**
   * This optional filter is a test function that takes a `component` as parameter and returns a `boolean`.
   */
  filter?: ComponentFilter
}

export interface ComponentEvent<ED = any> {
  /**
   * The event name.
   */
  readonly eventName: string

  /**
   * The source component.
   */
  readonly source: object

  /**
   * The event data.
   */
  readonly data?: ED

  /**
   * Stop the propagation of the event. The event won't bubble up after the call to this method.
   */
  stopPropagation(): void
}

export type EventCallback<ED = any> = (evData: ED, compEv: ComponentEvent<ED>) => void
export type EventName = string | string[]

export interface EmitOptions {
  /**
   * When this option is set to `true`, then the event is emitted (and the listeners are called) synchronously.
   *
   * Default value is `false`
   */
  sync?: boolean

  /**
   * When this option is set to `true`, then the event is emitted only on its component. It will not bubble up.
   *
   * This option has no effect on broadcasted events.
   *
   * Default value is `false`
   */
  cancelPropagation?: boolean
}

export interface UnattendedEvents {
  /**
   * Add a `listener` to this component.
   */
  on<ED = any>(eventName: EventName, listener: EventCallback<ED>, thisArg?: any): void

  /**
   * Remove a `listener` to this component.
   */
  off(eventName: EventName, listener: EventCallback, thisArg?: any): void
}

export interface DashAppMembers {
  /**
   * Test if the provided `obj` exists in the component tree.
   *
   * This dash method is inherited from the application.
   */
  isComponent(obj: object): boolean

  /**
   * This dash method is inherited from the application.
   *
   * @returns The public dash of the provided `component`.
   * @throws An `Error` if the `component` doesn't exist in the component tree.
   */
  getPublicDashOf(component: object): PublicDash

  /**
   * This dash member is inherited from the application.
   */
  readonly log: Log
}

export interface PublicDash extends DashAppMembers {

  /**
   * Contains the API to manually add and remove listeners to this component.
   */
  readonly unattendedEvents: UnattendedEvents

  /**
   * @returns The children.
   */
  children<C = any>(filter?: FindChildFilter): C[]

  /**
   * @returns `true` if there is at least one child that satisfies the provided filter.
   */
  hasChildren(filter?: FindChildFilter): boolean

  /**
   * @returns `true` if `obj` is a child component.
   */
  isChild(obj: object): boolean

  /**
   * Unsubscribe all listeners, and remove the component from the component tree. The component can listen to its own `destroy` event if there is anything to do before to destroy.
   *
   * Notice: The `destroy` event doesn't bubble up.
   */
  destroy(): void

  /**
   * The component.
   *
   * This property is available only when the component instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly component: object

  /**
   * The parent component.
   *
   * This property is available only when the parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly parent: object | undefined

  /**
   * Find a parent component.
   *
   * This method is available only when the targeted parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  getParent(filter?: ComponentFilter): object | undefined

  /**
   * Find a list of parent components.
   *
   * This method is available only when the targeted parent instances are defined: after the initialisation, or after a call of `setInstance()` from their dash.
   */
  getParents(filter?: ComponentFilter): object[]
}

export interface Dash<A = any> extends PublicDash {
  readonly publicDash: PublicDash
  readonly app: A

  /**
   * Call this method if the instance must be available from other components before the end of the execution of the constructor.
   */
  setInstance(component: any): this

  exposeEvent(...eventNames: string[]): this
  exposeEvent(eventNames: string[]): this

  create<C, D extends Dash<A>>(Class: { new(dash: D, ...args: any[]): C }, ...args: any[]): C
  toComponent(obj: object): Dash<A>

  addToGroup(child: object, group: string, ...groups: string[]): this
  addToGroup(child: object, groups: string[]): this

  inGroup(child: object, group: string, ...groups: string[]): boolean
  inGroup(child: object, groups: string[]): boolean

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   */
  emit(eventName: EventName, data?: any, options?: EmitOptions): this

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   *
   * The event will NOT bubble up to parent hierarchy.
   */
  broadcast(ev: ComponentEvent, options?: EmitOptions): this

  /**
   * Listen to `eventName` on the current component
   */
  listenTo<ED = any>(eventName: EventName, listener: EventCallback<ED>, thisArg?: any): this

  /**
   * Listen to `eventName` on the target `component`
   */
  listenTo<ED = any>(component: object, eventName: EventName, listener: EventCallback<ED>, thisArg?: any): this

  /**
   * Stop to listen everything for the `listener` and `thisArg`
   */
  stopListening(listener: EventCallback, thisArg?: any): this

  /**
   * Stop to listen to `eventName` on the current component
   */

  stopListening(eventName: EventName, listener: EventCallback, thisArg?: any): this
  /**
   * Stop to listen to `eventName` on the target `component`
   */
  stopListening(component: object, eventName: EventName, listener: EventCallback, thisArg?: any): this

  destroyChildren(filter?: FindChildFilter): this
}

export interface DashAugmentation {
  [property: string]: any
}

export interface AppDash<A = any> extends Dash<A> {
  registerDashAugmentation(augment: (dash: Dash<A>) => DashAugmentation): void
}

export interface Log {
  fatal(...messages: any[]): void
  error(...messages: any[]): void
  warn(...messages: any[]): void
  info(...messages: any[]): void
  debug(...messages: any[]): void
  trace(...messages: any[]): void
}

export interface LogEvent {
  level: keyof Log
  levelNumber: number
  messages: any[]
}