import * as $ from 'jquery'
import {Application, ApplicationDash, ApplicationBkb, Log, LogItem} from 'bkb'
import TodoList from "../TodoList/TodoList"
import {createEasyRouter, EasyRouter} from '../../libraries-ts/EasyRouter'

export default class TestApp implements Application {
  readonly bkb: ApplicationBkb
  readonly log: Log
  readonly nextTick: (cb: () => void) => void

  private $app: JQuery

  public get router() {
    return this._router
  }

  private _router: EasyRouter

  constructor(private dash: ApplicationDash<TestApp>) {
    this.log = dash.bkb.log
    this.nextTick = dash.bkb.nextTick

    this.dash.on<LogItem>('log', 'dataFirst', data => {
      console.log(`[LOG] ${data.type} `, data.messages)
    })

    dash.bkb.listen<any>('changeComponent').call((evt) => {
      // console.log('EVENT', evt)
      const type = evt.data.type,
        evtBkb = evt.data.component.bkb,
        msg = `change component (${type} ${evtBkb.componentName} ${evtBkb.componentId})\n`
      this.bkb.nextTick(() => {
        console.log(msg, publicNodesToString(this.bkb.find()))
      })
    })

    this.$app = $('.js-app')
    this._router = this.createRouter(this.$app.attr('data-base-url'), this.$app.attr('data-first'))
  }

  public start() {
    const list = this.dash.create(TodoList, {
      args: ['My TODO List', this.$app[0]]
    })
  }

  private createRouter(baseUrl: string, firstQueryString: string) {
    let router = createEasyRouter()
    router.addAsyncErrorListener(err => this.log.error(err))
    router.addUnknownRouteListener(query => this.log.warn(`Unknown route: ${query.queryString}`))
    router.addRejectListener((err, query?) => this.log.warn(`Rejected: ${query ? query.queryString : ''}`, err))
    router.map(
      {
        route: '',
        title: 'List of tasks',
        activate: () => {
          console.log('~~ Page: Root')
        }
      },
      {
        route: 'tasks/:id',
        title: query => {
          const id = parseInt(query.routeParams['id'], 10)
          return `Task ${id}`
        },
        activate: query => {
          const id = parseInt(query.routeParams['id'], 10)

          console.log(`~~ Page: Task ${id}`)
        }
      }
    )
    router.start({
      baseUrl,
      firstQueryString,
      hashMode: true
    })
    return router
  }

}

function publicNodesToString(components: any[], indent = '') {
  const lines = []
  for (const comp of components) {
    let line = `${indent}- ${comp.bkb.componentName} (${comp.bkb.componentId})`
    const children = comp.bkb.find()
    if (children.length > 0)
      line += '\n' + publicNodesToString(children, `${indent}  `)
    lines.push(line)
  }
  return lines.join('\n')
}