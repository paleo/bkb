import * as $ from 'jquery'
import {createApplication, Log, Application, LogItem} from 'bkb-framework'
import TodoList from "./components/TodoList/TodoList"
import {createEasyRouter, EasyRouter} from './libraries-ts/EasyRouter'

export interface TestApp extends Application<TestApp> {
  log: Log,
  router: EasyRouter
}

//aaa.
//aaa.
$(() => {
  const app = createApplication<TestApp>()
  app.log = app.bkb.log

//app.r
  // const aaa: Application;
  //app.router;

  app.bkb.listen<LogItem>('log').call((evt) => {
    console.log(`[LOG] ${evt.data.type} `, evt.data.messages)
  })

  // private fireEventStringMsg(type: LogType, something: any) {
  //   this.hasConsole = typeof console !== 'undefined'
  //   var msgStr,
  //     stack = null
  //   switch (typeof something) {
  //     case 'string':
  //       msgStr = something
  //       break
  //     case 'object':
  //       if (something['message'] !== undefined)
  //         msgStr = something['message']
  //       else
  //         msgStr = something.toString()
  //       if (something['stack'] !== undefined)
  //         stack = something['stack']
  //       break
  //     default:
  //       msgStr = '[unknown error type] ' + (typeof something)
  //       try {
  //         msgStr += ': ' + something
  //       } catch (e) {
  //       }
  //   }
  //   var inConsole = this.hasConsole
  //   for (var i = 0, len = this.listeners.length; i < len; ++i) {
  //     if (this.listeners[i](type, msgStr, stack) === true)
  //       inConsole = false
  //   }
  //   if (inConsole) {
  //     console.log('[' + LogType[type] + '] ' + msgStr)
  //     if (stack !== null)
  //       console.log(stack)
  //   }
  // }

  app.bkb.listen<any>('changeComponent').call((evt) => {
    // console.log('EVENT', evt)
    const type = evt.data.type,
      bkb = evt.data.component.bkb,
      msg = `change component (${type} ${bkb.componentName} ${bkb.componentId})\n`
    app.bkb.nextTick(() => {
      console.log(msg, publicNodesToString(app.bkb.find()))
    })
  })

  const $app = $('.js-app')
  const router = createEasyRouter()
  app.router = router
  router.addAsyncErrorListener(err => app.log.error(err))
  router.addUnknownRouteListener(query => app.log.warn(`Unknown route: ${query.queryString}`))
  router.addRejectListener((err, query?) => app.log.warn(`Rejected: ${query ? query.queryString : ''}`, err))
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
    baseUrl: $app.attr('data-base-url'),
    firstQueryString: $app.attr('data-first'),
    hashMode: true
  })

  //const router = app.createComponent(BkbEasyRouter, 'My TODO List').start()

  const list = app.bkb.createComponent(TodoList, 'My TODO List')
  list.attachTo($app[0])

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
})