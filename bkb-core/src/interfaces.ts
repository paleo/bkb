interface Listener {
  call(callback: (...args: any[]) => void): this
  cancel(): void
}

interface Component<C> {
  bkb: Bkb<C>
}

interface ComponentEvent<C, D> {
  eventName: string
  sourceName: string
  sourceId: number
  source: C
  data?: D
  stopPropagation: () => void
}

interface ComponentListener<C, D> {
  call(callback: (evt: ComponentEvent<C, D>) => void): this
  cancel(): void
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
  /**
   * Default is <code>false</code>
   * NB: Used only with object components. Ignored for instance components.
   */
  freeze?: boolean
}

interface EmitterOptions {
  /**
   * Default value is <code>false</code>
   */
  sync?: boolean
}

interface BasicContext {
  instanceComponent<C>(Cl, properties?: NewComponentProperties): C
  objectComponent<C>(obj, properties?: NewComponentProperties): [C, Context<any>]
}

interface Context<A> extends BasicContext {
  app: Application<A> & A

  bkb: Bkb<any>

  exposeEvents(eventNames: string[]): this

  emit<D>(eventName: string, data?: D, options?: EmitterOptions): this

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
  listenParent<C, D>(eventName: string, filter?: ParentFilter): ComponentListener<C, D>

  /**
   * Listen the children and descendants. If the parameter <code>filter<code> is defined, listen only the children or
   * descendant that match the filter.
   */
  listenChildren<C, D>(eventName: string, filter?: ChildFilter): ComponentListener<C, D>

  listenComponent<C, D>(component: Component<C>, eventName: string): ComponentListener<C, D>

  find<C>(filter?: ChildFilter): C[]
  findSingle<C>(filter?: ChildFilter): C
}

interface BasicBkb<C> {
  on<D>(eventName: string, callback: (evt: ComponentEvent<C, D>) => void): this
  listen<D>(eventName: string): ComponentListener<C, D>
  find<E>(filter?: ChildFilter): E[]
  findSingle<E>(filter?: ChildFilter): E
}

interface Bkb<C> extends BasicBkb<C> {
  destroy(): void
  componentName: string
  componentId: number
  getInstance(): C & Component<C>
  getParent(): Component<any>
}

interface Log {
  error(...messages: any[]): void
  warn(...messages: any[]): void
  info(...messages: any[]): void
  debug(...messages: any[]): void
  trace(...messages: any[]): void
}

interface ApplicationBkb<A> extends Bkb<A>, BasicContext {
  nextTick(cb: () => void): void
  log: Log
}

interface Application<A> extends Component<A> {
  bkb: ApplicationBkb<A>
}