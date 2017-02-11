type Component<T> = T & {
  readonly bkb: Bkb
}

type Application<T> = T & {
  readonly bkb: ApplicationBkb
}

interface ComponentEvent<D> {
  readonly eventName: string
  readonly sourceName: string
  readonly sourceId: number
  readonly source: Component<Object>
  readonly data?: D
  stopPropagation(): void
}

interface Transmitter<D> {
  call(callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: "eventOnly", callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: "dataFirst", callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: "arguments", callback: (...args: any[]) => void, thisArg?: any): this
  disable(): void
  isDisabled(): boolean
}

interface ParentFilter {
  componentName?: string
}

interface ChildFilter {
  group?: string | string[]
  componentName?: string
  /**
   * Default value is <code>false</code>
   */
  deep?: boolean
}

interface NewComponentProperties {
  group?: string | string[]
  componentName?: string
  /**
   * NB: Used only with instance components. Ignored for object components.
   */
  args?: any[]
}

interface EmitterOptions {
  /**
   * Default value is <code>false</code>
   */
  sync?: boolean
}

interface Bkb {
  on<D>(eventName: string, callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: "eventOnly", callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: "dataFirst", callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  on(eventName: string, mode: "arguments", callback: (...args: any[]) => void, thisArg?: any): this
  listen<D>(eventName: string): Transmitter<D>
  /**
   * Find children
   */
  find<E>(filter?: ChildFilter): E[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<E>(filter?: ChildFilter): E
  /**
   * @returns The count of children that validate the filter
   */
  count(filter?: ChildFilter): number
  /**
   * @returns true if there is one or more children that validate the filter
   */
  has(filter?: ChildFilter): boolean

  destroy(): void
  readonly componentName: string
  readonly componentId: number
  /**
   * This property is available only when the component instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly instance: Component<Object>
  /**
   * This property is available only when the parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly parent: Component<Object> | undefined
  /**
   * This method is available only when the targeted parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  getParent(filter?: ParentFilter): Component<Object> | undefined
}

interface ApplicationBkb extends Bkb {
  nextTick(cb: () => void): void
  readonly log: Log
}

interface BasicDash<A> extends Bkb {
  /**
   * Call this method if the instance must be available during the execution of the constructor
   */
  setInstance(inst: any): void
  exposeEvents(eventNames: string[]): this

  create<C>(Cl: { new (dash: Dash<A>, ...args: any[]): C }, properties?: NewComponentProperties): Component<C>

  toComponent(obj: any, properties?: NewComponentProperties): Dash<A>

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   */
  emit(eventName: string, data?: any, options?: EmitterOptions): this

  /**
   * If the option `sync` is activated, the method is allowed only when the component instance is defined: after the initialisation, or after a call of `setInstance()`.
   *
   * The event will NOT bubble up to parent hierarchy.
   */
  broadcast(ev: ComponentEvent<any>, options?: EmitterOptions): this

  /**
   * Listen the nearest parent. If the parameter <code>filter<code> is defined, search the nearest ancestor that matches
   * this filter.
   *
   * @param eventName The event to listen
   * @param filter A filter that has to match with the targeted parent
   */
  listenToParent<D>(eventName: string, filter?: ParentFilter): Transmitter<D>

  /**
   * Listen the children and descendants. If the parameter <code>filter<code> is defined, listen only the children or
   * descendant that match the filter.
   */
  listenToChildren<D>(eventName: string, filter?: ChildFilter): Transmitter<D>

  listenTo<D>(component: Component<Object>, eventName: string): Transmitter<D>
}

interface Dash<A> extends BasicDash<A> {
  readonly app: Application<A>
  readonly bkb: Bkb
}

interface ApplicationDash<A> extends BasicDash<A>, ApplicationBkb {
  readonly bkb: ApplicationBkb
}

/**
 * The type of data for log event
 */
interface LogItem {
  type: string
  messages: any[]
}

interface Log {
  error(...messages: any[]): void
  warn(...messages: any[]): void
  info(...messages: any[]): void
  debug(...messages: any[]): void
  trace(...messages: any[]): void
}
