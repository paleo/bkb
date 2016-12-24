import * as $ from 'jquery'
import {createApplication} from 'bkb-framework'
import TestApp from './components/TestApp/TestApp'

$(() => {
  createApplication(TestApp)
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
