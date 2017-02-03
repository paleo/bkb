interface Component {
  readonly bkb: Bkb
}

interface ComponentEvent<D> {
  readonly eventName: string
  readonly sourceName: string
  readonly sourceId: number
  readonly source: Component
  readonly data?: D
  stopPropagation(): void
}

interface Transmitter<D> {
  call(callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: 'eventOnly', callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: 'dataFirst', callback: (data: D, evt: ComponentEvent<D>) => void, thisArg?: any): this
  call(mode: 'arguments', callback: (...args: any[]) => void, thisArg?: any): this
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
  on<D>(eventName: string, callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: 'eventOnly', callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: 'dataFirst', callback: (data: D, evt: ComponentEvent<D>) => void, thisArg?: any): this
  on(eventName: string, mode: 'arguments', callback: (...args: any[]) => void, thisArg?: any): this
  listen<D>(eventName: string): Transmitter<D>
  /**
   * Find children
   *
   * Notice: Cannot be accessed during the initialization.
   */
  find<E>(filter?: ChildFilter): E[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<E>(filter?: ChildFilter): E
  /**
   * @returns The count of children that validate the filter
   *
   * Notice: Cannot be accessed during the initialization.
   */
  count(filter?: ChildFilter): number
  /**
   * @returns true if there is one or more children that validate the filter
   *
   * Notice: Cannot be accessed during the initialization.
   */
  has(filter?: ChildFilter): boolean

  destroy(): void
  readonly componentName: string
  readonly componentId: number
  /**
   * Notice: Cannot be accessed during the initialization.
   */
  readonly instance: Component // TODO: Not during init & use getter `instance`
  readonly parent: Component | undefined // TODO: Not during init & use getter `instance`
  getParent(filter?: ParentFilter): Component | undefined // TODO: add a getter `parent`
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

  /**
   * Notice: Cannot be accessed during the initialization. // TODO: allow on init
   */
  create<C>(Cl: { new (dash: Dash<A>, ...args: any[]): C }, properties?: NewComponentProperties): C & Component

  /**
   * Notice: Cannot be accessed during the initialization. // TODO: allow on init
   */
  toComponent(obj: any, properties?: NewComponentProperties): Dash<A>

  /**
   * Notice: Cannot be accessed during the initialization.
   */
  emit(eventName: string, data?: any, options?: EmitterOptions): this // TODO: allow on init when deferred

  /**
   * Notice: Cannot be accessed during the initialization.
   *
   * The event will NOT bubble up to parent hierarchy.
   */
  broadcast(evt: ComponentEvent<any>, options?: EmitterOptions): this // TODO: allow on init when deferred

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

  listenTo<D>(component: Component, eventName: string): Transmitter<D>
}

interface Dash<A> extends BasicDash<A> {
  readonly app: Application & A
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

interface Application extends Component {
  readonly bkb: ApplicationBkb
}