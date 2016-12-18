interface Component<C> {
  readonly bkb: Bkb<C>
}

interface ComponentEvent<C, D> {
  readonly eventName: string
  readonly sourceName: string
  readonly sourceId: number
  readonly source: C
  readonly data?: D
  stopPropagation(): void
}

interface Transmitter<C, D> {
  call(callback: (evt: ComponentEvent<C, D>) => void, thisArg?: any): this
  call(mode: 'eventOnly', callback: (evt: ComponentEvent<C, D>) => void, thisArg?: any): this
  call(mode: 'dataFirst', callback: (data: D, evt: ComponentEvent<C, D>) => void, thisArg?: any): this
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

interface BasicDash<A> {
  createComponent<C>(Cl: { new(dash: Dash<A>, ...args): C }, properties?: NewComponentProperties): C & Component<C>
  toComponent(obj: any, properties?: NewComponentProperties): Dash<A>
}

interface Dash<A> extends BasicDash<A> {
  readonly app: Application<A> & A

  readonly bkb: Bkb<any>

  exposeEvents(eventNames: string[]): this

  emit(eventName: string, data?: any, options?: EmitterOptions): this

  /**
   * Notice: The event will NOT bubble up to parent hierarchy
   */
  broadcast(evt: ComponentEvent<any, any>, options?: EmitterOptions): this

  /**
   * Listen the nearest parent. If the parameter <code>filter<code> is defined, search the nearest ancestor that matches
   * this filter.
   *
   * @param eventName The event to listen
   * @param filter A filter that has to match with the targeted parent
   */
  listenToParent<C, D>(eventName: string, filter?: ParentFilter): Transmitter<C, D>

  /**
   * Listen the children and descendants. If the parameter <code>filter<code> is defined, listen only the children or
   * descendant that match the filter.
   */
  listenToChildren<C, D>(eventName: string, filter?: ChildFilter): Transmitter<C, D>

  listenTo<C, D>(component: Component<C>, eventName: string): Transmitter<C, D>

  onDestroy(cb: (evt: ComponentEvent<any, {}>) => void): void

  /**
   * Find children
   */
  find<C>(filter?: ChildFilter): C[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<C>(filter?: ChildFilter): C

  getParent(filter?: ParentFilter): Component<any>|undefined
}

interface BasicBkb<C> {
  on<D>(eventName: string, callback: (evt: ComponentEvent<C, D>) => void, thisArg?: any): this // TODO implement
  on<D>(eventName: string, mode: 'eventOnly', callback: (evt: ComponentEvent<C, D>) => void, thisArg?: any): this // TODO implement
  on<D>(eventName: string, mode: 'dataFirst', callback: (data: D, evt: ComponentEvent<C, D>) => void, thisArg?: any): this // TODO implement
  on(eventName: string, mode: 'arguments', callback: (...args: any[]) => void, thisArg?: any): this // TODO implement
  listen<D>(eventName: string): Transmitter<C, D>
  /**
   * Find children
   */
  find<E>(filter?: ChildFilter): E[]
  /**
   * Find a single child (an Error is thrown if there isn't one result)
   */
  findSingle<E>(filter?: ChildFilter): E
}

interface Bkb<C> extends BasicBkb<C> {
  destroy(): void
  readonly componentName: string
  readonly componentId: number
  getInstance(): C & Component<C>
  getParent(filter?: ParentFilter): Component<any>|undefined
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

interface ApplicationBkb<A> extends Bkb<A>, BasicDash<A> {
  nextTick(cb: () => void): void
  readonly log: Log
}

interface Application<A> extends Component<A> {
  readonly bkb: ApplicationBkb<A>
}