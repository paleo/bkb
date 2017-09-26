interface ComponentEvent<D = any> {
  readonly eventName: string
  readonly sourceName: string
  readonly sourceId: number
  /**
   * The component source
   */
  readonly source: object
  readonly data?: D
  stopPropagation(): void
}

interface Transmitter<D = any> {
  onData(callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  onEvent(callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
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

interface CreateComponentProperties<A = any, C = any> {
  Class: { new(dash: Dash<A>, ...args: any[]): C },
  arguments?: any[]
  argument?: any
  group?: string | string[]
  componentName?: string
}

interface AsComponentProperties {
  group?: string | string[]
  componentName?: string
}

interface EmitterOptions {
  /**
   * Default value is <code>false</code>
   */
  sync?: boolean
}

interface Bkb {
  onEvent<D = any>(eventName: string, callback: (ev: ComponentEvent<D>) => void, thisArg?: any): this
  onData<D = any>(eventName: string, callback: (data: D, ev: ComponentEvent<D>) => void, thisArg?: any): this
  listen<D = any>(eventName: string): Transmitter<D>

  /**
   * Find children
   */
  find<C = any>(filter?: ChildFilter): C[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<C = any>(filter?: ChildFilter): C
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
  readonly instance: object
  /**
   * This property is available only when the parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  readonly parent: object | undefined
  /**
   * This method is available only when the targeted parent instance is defined: after the initialisation, or after a call of `setInstance()` from its dash.
   */
  getParent(filter?: ParentFilter): object | undefined
}

interface ApplicationBkb extends Bkb {
  nextTick(cb: () => void): void
  readonly log: Log
}

interface BasicDash<A = any> extends Bkb {
  /**
   * Call this method if the instance must be available during the execution of the constructor
   */
  setInstance(inst: any): void

  exposeEvents(...eventNames: string[]): this
  exposeEvents(eventNames: string[]): this

  create<C>(Class: { new(dash: Dash<A>, ...args: any[]): C }, ...args: any[]): C
  customCreate<C>(properties: CreateComponentProperties<A, C>): C
  asComponent(obj: object, properties?: AsComponentProperties): Dash<A>

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
  listenToParent<D = any>(eventName: string, filter?: ParentFilter): Transmitter<D>

  /**
   * Listen the children and descendants. If the parameter <code>filter<code> is defined, listen only the children or
   * descendant that match the filter.
   */
  listenToChildren<D = any>(eventName: string, filter?: ChildFilter): Transmitter<D>

  listenTo<D = any>(component: object, eventName: string): Transmitter<D>

  readonly log: Log
  getBkbOf(component: object): Bkb
}

interface Dash<A = any> extends BasicDash<A> {
  readonly app: A
  readonly bkb: Bkb
}

interface ApplicationDash<A = any> extends BasicDash<A>, ApplicationBkb {
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
