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

export type OrderCallback<OD = any> = (orderData: OD) => void
export type OrderName = string | string[]

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

export interface UnmanagedListeners {
  /**
   * Add a `listener` to this component.
   */
  on<ED = any>(eventName: EventName, listener: EventCallback<ED>, thisArg?: any): void

  /**
   * Remove a `listener` to this component.
   */
  off(eventName: EventName, listener: EventCallback, thisArg?: any): void
}

export interface AppScopeMembers<A = any> {
  /**
   * Test if the provided `obj` exists in the component tree.
   *
   * This dash method is common for the whole application.
   */
  isComponent(obj: object): boolean

  /**
   * This dash method is common for the whole application.
   *
   * @returns The public dash of the provided `component`.
   * @throws An `Error` if the `component` doesn't exist in the component tree.
   */
  getPublicDashOf(component: object): PublicDash<A>

  /**
   * @returns The parent component, or `undefined` when the current component is the application root component.
   *
   * Available only when the parent instance is defined: after the constructor is executed, or after it calls `setInstance()` from its dash.
   *
   * Warning: This method is provided for introspection only. If a component needs to get its parent component, then it is recommanded to pass the parent as a contructor parameter of the child.
   */
  getParentOf(component: object): object | undefined

  /**
   * This dash property is common for the whole application.
   */
  readonly log: Log

  /**
   * This is the application root component.
   *
   * This dash property is common for the whole application.
   */
  readonly app: A
}

export interface PublicDash<A = any> extends AppScopeMembers<A> {

  /**
   * Contains the API to manually add and remove listeners to this component.
   */
  readonly unmanagedListeners: UnmanagedListeners

  /**
   * @returns The children that satisfy the provided optional filter.
   */
  children<C = any>(filter?: FindChildFilter): C[]

  /**
   * @returns `true` if there is at least one child that satisfies the provided optional filter.
   */
  hasChildren(filter?: FindChildFilter): boolean

  /**
   * @returns `true` if `obj` is a child component.
   */
  isChild(obj: object): boolean

  /**
   * Unsubscribe all listeners, and remove the component from the component tree.
   *
   * The component can listen to its own `destroy` event if there is anything to do before to destroy. Notice: The `destroy` event doesn't bubble up.
   */
  destroy(): void

  /**
   * The component.
   *
   * Available only when the component instance is defined: after the constructor is executed, or after a call of `setInstance()` from its dash.
   */
  getComponent(): object

  /**
   * Execute a descending order. Propagate it to all the descendents.
   */
  invokeDescendingOrder(orderName: OrderName, orderData: any): this
}

export interface Dash<A = any> extends PublicDash<A> {
  /**
   * This is the public dash of the component.
   */
  readonly publicDash: PublicDash<A>

  /**
   * Call this method if the component instance must be available from other components before the end of the execution of the constructor.
   */
  setInstance(component: any): this

  /**
   * Declare the event names that can be emitted by the component. If this method is not called, then any event names can be emitted or listened.
   */
  exposeEvent(...eventNames: string[]): this

  /**
   * Declare the event names that can be emitted by the component. If this method is not called, then any event names can be emitted or listened.
   */
  exposeEvent(eventNames: string[]): this

  /**
   * Create a child component by instantiating the `Class` without options.
   */
  create<C = any, D extends Dash = Dash<A>>(Class: { new (dash: D): C }): C

  /**
   * Create a child component by instantiating the `Class`. The options will be passed to the constructor at second constructor parameter.
   */
  create<C = any, OPT = any, D extends Dash = Dash<A>>(Class: { new (dash: D, options: OPT): C }, options: OPT): C

  /**
   * Make the `obj` a child component.
   *
   * @returns The `Dash` of the child component.
   */
  registerComponent(obj: object): Dash<A>

  /**
   * Add an existing `child` to a group. Groups help the parent component to process or destroy children.
   */
  addToGroup(child: object, ...groups: string[]): this

  /**
   * Add an existing `child` to a group. Groups help the parent component to process or destroy children.
   */
  addToGroup(child: object, groups: string[]): this

  /**
   * Test if the `child` is at least in one of these `groups`.
   */
  inGroup(child: object, ...groups: string[]): boolean

  /**
   * Test if the `child` is at least in one of these `groups`.
   */
  inGroup(child: object, groups: string[]): boolean

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   */
  emit(eventName: EventName, data?: any, options?: EmitOptions): this

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   *
   * The event will NOT bubble up to the parent hierarchy.
   */
  broadcast(ev: ComponentEvent, options?: EmitOptions): this

  /**
   * Listen to `eventName` on the current component.
   */
  listenTo<ED = any>(eventName: EventName, listener: EventCallback<ED>, thisArg?: any): this

  /**
   * Listen to `eventName` on the target `component`.
   */
  listenTo<ED = any>(component: object, eventName: EventName, listener: EventCallback<ED>, thisArg?: any): this

  /**
   * Stop to listen everything for the `listener`.
   */
  stopListening(listener: EventCallback, thisArg?: any): this

  /**
   * Stop to listen to `eventName` on the current component.
   */
  stopListening(eventName: EventName, listener: EventCallback, thisArg?: any): this

  /**
   * Stop to listen to `eventName` on the target `component`.
   */
  stopListening(component: object, eventName: EventName, listener: EventCallback, thisArg?: any): this

  /**
   * Listen to `orderName` from the parents.
   */
  listenToDescendingOrder<OD = any>(orderName: OrderName, listener: OrderCallback<OD>, thisArg?: any): this

  /**
   * Stop to listen to `orderName` from the parents.
   */
  stopListeningDescendingOrder(orderName: OrderName, listener: OrderCallback, thisArg?: any): this

  /**
   * @returns Destroy the children that satisfy the provided optional filter.
   */
  destroyChildren(filter?: FindChildFilter): this
}

/**
 * These members will be assigned (`Object.assign`) to a new `Dash`.
 */
export interface DashAugmentation {
  [property: string]: any
}

/**
 * The dash of the root component of an application.
 */
export interface AppDash<A = any> extends Dash<A> {
  /**
   * Register a function `augment` that will be called in order to augment each new `Dash`.
   */
  addDashAugmentation(augment: (dash: Dash<A>) => DashAugmentation): void
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