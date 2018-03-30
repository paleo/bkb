export interface ComponentFilter {
  (comp: any): boolean
}

export interface FindChildFilter {
  group?: string | string[]
  filter?: ComponentFilter
}

export interface ApplicationMembers {
  /**
   * This method is inherited from the application.
   */
  isComponent(obj: object): boolean
  /**
   * This method is inherited from the application.
   */
  getPublicDashOf(component: object): PublicDash
  /**
   * This member is inherited from the application.
   */
  readonly log: Log
}

export interface ComponentEvent<ED = any> {
  readonly eventName: string
  /**
   * The component source
   */
  readonly source: object
  readonly data?: ED
  stopPropagation(): void
}

export type EventCallback<ED = any> = (evData: ED, compEv: ComponentEvent<ED>) => void
export type EventName = string | string[]

export interface EmitOptions {
  /**
   * Default value is `false`
   */
  sync?: boolean
}

export interface UnattendedEvents {
  on<ED = any>(eventName: EventName, listener: EventCallback<ED>, thisArg?: any): void
  off(eventName: EventName, listener: EventCallback, thisArg?: any): void
}

export interface PublicDash extends ApplicationMembers {
  readonly unattendedEvents: UnattendedEvents

  /**
   * Find children
   */
  children<C = any>(filter?: FindChildFilter): C[]
  /**
   * Find a single child (or throws an Error if there isn't one result)
   */
  getChild<C = any>(filter?: FindChildFilter): C
  /**
   * @returns The count of children that validate the filter
   */
  countChildren(filter?: FindChildFilter): number
  /**
   * @returns true if there is one or more children that validate the filter
   */
  hasChildren(filter?: FindChildFilter): boolean

  isChild(obj: object): boolean

  destroy(): void

  /**
   * This property is available only when the component instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly instance: object
  /**
   * This property is available only when the parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly parent: object | undefined
  /**
   * This method is available only when the targeted parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  getParent(filter?: ComponentFilter): object | undefined
  /**
   * This method is available only when the targeted parent instances are defined: after the initialisation, or after a call of `setInstance()` from their dash.
   */
  getParents(filter?: ComponentFilter): object[]
}

export interface BasicDash<A = any> extends PublicDash {
  readonly publicDash: PublicDash

  /**
   * Call this method if the instance must be available during the execution of the constructor
   */
  setInstance(inst: any): this

  exposeEvent(...eventNames: string[]): this
  exposeEvent(eventNames: string[]): this

  create<C>(Class: { new(dash: Dash<A>, ...args: any[]): C }, ...args: any[]): C
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

export interface ApplicationDash<A = any> extends BasicDash<A> {
  registerDashAugmentation(augment: (dash: Dash) => DashAugmentation): void
}

export interface Dash<A = any> extends BasicDash<A> {
  readonly app: A
}

/**
 * The type of data for log event
 */
export interface LogItem {
  type: string
  messages: any[]
}

export interface Log {
  error(...messages: any[]): void
  warn(...messages: any[]): void
  info(...messages: any[]): void
  debug(...messages: any[]): void
  trace(...messages: any[]): void
}