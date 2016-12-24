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
  groupName?: string | string[]
  componentName?: string
  /**
   * Default value is <code>false</code>
   */
  deep?: boolean
}

interface NewComponentProperties {
  groupName?: string | string[]
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

interface Dash<A> {
  readonly app: Application & A
  readonly bkb: Bkb

  create<C>(Cl: { new(dash: Dash<A>, ...args: any[]): C }, properties?: NewComponentProperties): C & Component
  toComponent(obj: any, properties?: NewComponentProperties): Dash<A>

  exposeEvents(eventNames: string[]): this

  emit(eventName: string, data?: any, options?: EmitterOptions): this

  /**
   * Notice: The event will NOT bubble up to parent hierarchy
   */
  broadcast(evt: ComponentEvent<any>, options?: EmitterOptions): this

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

  onDestroy(cb: (evt: ComponentEvent<void>) => void): void

  /**
   * Find children
   */
  find<C>(filter?: ChildFilter): C[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<C>(filter?: ChildFilter): C

  getParent(filter?: ParentFilter): Component|undefined
}

interface BasicBkb {
  on<D>(eventName: string, callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: 'eventOnly', callback: (evt: ComponentEvent<D>) => void, thisArg?: any): this
  on<D>(eventName: string, mode: 'dataFirst', callback: (data: D, evt: ComponentEvent<D>) => void, thisArg?: any): this
  on(eventName: string, mode: 'arguments', callback: (...args: any[]) => void, thisArg?: any): this
  listen<D>(eventName: string): Transmitter<D>
  /**
   * Find children
   */
  find<E>(filter?: ChildFilter): E[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<E>(filter?: ChildFilter): E
}

interface Bkb extends BasicBkb {
  destroy(): void
  readonly componentName: string
  readonly componentId: number
  getInstance(): Component
  getParent(filter?: ParentFilter): Component|undefined
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

interface ApplicationBkb extends Bkb {
  nextTick(cb: () => void): void
  readonly log: Log
}

interface ApplicationDash<A> extends Dash<A> {
  readonly bkb: ApplicationBkb
}

interface Application extends Component {
  readonly bkb: ApplicationBkb
}