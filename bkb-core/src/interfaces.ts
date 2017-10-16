export interface ComponentEvent<D = any> {
  readonly eventName: string
  /**
   * The component source
   */
  readonly source: object
  readonly data?: D
  stopPropagation(): void
}

export interface Transmitter<D = any> {
  onData(callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  onEvent(callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  disable(): void
  readonly isDisabled: boolean
}

export interface ParentFilter {
  (parent: any): boolean
}

export interface FindChildOptions {
  group?: string | string[]
  filter?: (child: any) => boolean
}

export interface ListenChildOptions extends FindChildOptions {
  /**
   * Default value is <code>false</code>
   */
  deep?: boolean
}

export interface EmitterOptions {
  /**
   * Default value is <code>false</code>
   */
  sync?: boolean
}

interface ApplicationMembers {
  /**
   * This method is inherited from the application.
   */
  isComponent(obj: object): boolean
  /**
   * This method is inherited from the application.
   */
  getBkbOf(component: object): Bkb
  /**
   * This member is inherited from the application.
   */
  readonly log: Log
}

export interface Bkb extends ApplicationMembers {
  onEvent<D = any>(eventName: string | string[], callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  onData<D = any>(eventName: string | string[], callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  listen<D = any>(eventName: string | string[]): Transmitter<D>

  /**
   * Find children
   */
  children<C = any>(filter?: FindChildOptions): C[]
  /**
   * Find a single child (or throws an Error if there isn't one result)
   */
  getChild<C = any>(filter?: FindChildOptions): C
  /**
   * @returns The count of children that validate the filter
   */
  countChildren(filter?: FindChildOptions): number
  /**
   * @returns true if there is one or more children that validate the filter
   */
  hasChildren(filter?: FindChildOptions): boolean

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
  getParent(filter?: ParentFilter): object | undefined
  /**
   * This method is available only when the targeted parent instances are defined: after the initialisation, or after a call of `setInstance()` from their dash.
   */
  getAllParents(filter?: ParentFilter): object[]
}

export interface BasicDash<A = any> extends Bkb {
  /**
   * Call this method if the instance must be available during the execution of the constructor
   */
  setInstance(inst: any): void

  exposeEvent(...eventNames: string[]): this
  exposeEvent(eventNames: string[]): this

  create<C>(Class: { new(dash: Dash<A>, ...args: any[]): C }, ...args: any[]): C
  asComponent(obj: object): Dash<A>

  addToGroup(child: object, group: string, ...groups: string[]): this
  isInGroup(child: object, group: string, ...groups: string[]): boolean

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   */
  emit(eventName: string | string[], data?: any, options?: EmitterOptions): this

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   *
   * The event will NOT bubble up to parent hierarchy.
   */
  broadcast(ev: ComponentEvent, options?: EmitterOptions): this

  /**
   * Listen the nearest parent. If the parameter <code>filter<code> is defined, search the nearest ancestor that matches
   * this filter.
   *
   * @param eventName The event to listen
   * @param filter A filter that has to match with the targeted parent
   */
  listenToParent<D = any>(eventName: string | string[], filter?: ParentFilter): Transmitter<D>

  listenToAllParents<D = any>(eventName: string | string[], filter?: ParentFilter): Transmitter<D>

  /**
   * Listen the children and descendants. If the parameter <code>filter<code> is defined, listen only the children or
   * descendant that match the filter.
   */
  listenToChildren<D = any>(eventName: string | string[], filter?: ListenChildOptions): Transmitter<D>

  listenTo<D = any>(component: object, eventName: string | string[]): Transmitter<D>

  destroyChildren(filter?: FindChildOptions): this

  readonly bkb: Bkb
}

export interface ApplicationDash<A = any> extends BasicDash<A> {
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
