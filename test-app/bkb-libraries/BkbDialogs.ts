import {Dash, PublicDash} from 'bkb'
import {EasyRouter} from '../libraries-ts/EasyRouter'
import 'dialog-polyfill'

declare const dialogPolyfill;

enum SmallDialogType {
  Info, Warning, Error, Confirm
}

export default class BkbDialogs {

  // --
  // -- Initialisation
  // --

  private smallDialogMap = {}
  private smallMsgQueue = []
  private curSmallProp: {} = null
  private smallDialogCount = 0

  private registeredMap = {}
  private regOpenedStack = []

  constructor(private dash: Dash<any>) {
    this.initShortDialogs()
  }

  public setRouter(router: EasyRouter) {
    router.addCanLeaveListener(() => this.canLeave())
    router.addLeaveListener(() => this.leave())
  }

  // --
  // -- Public
  // --

  public showInfo(msgHtml: string): void {
    this.smallMsgQueue.push({
      'msgHtml': msgHtml,
      'type': SmallDialogType.Info,
      'delayInMs': 1600
    })
    this.pleaseProcessShortDialogs()
  }

  public showWarning(msgHtml: string): void {
    this.smallMsgQueue.push({
      'msgHtml': msgHtml,
      'type': SmallDialogType.Warning,
      'delayInMs': 2000
    })
    this.pleaseProcessShortDialogs()
  }

  public showError(msgHtml: string): Promise<void> {
    return new Promise<void>((resolve) => {
      this.smallMsgQueue.push({
        'msgHtml': msgHtml,
        'type': SmallDialogType.Error,
        'resolve': resolve
      })
      this.pleaseProcessShortDialogs()
    })
  }

  public confirm(msgHtml: string, buttons: {
    label: string
    returnValue: any
    isDefault?: boolean
    isCancel?: boolean
  }[]): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.smallMsgQueue.push({
        'msgHtml': msgHtml,
        'type': SmallDialogType.Confirm,
        'buttons': buttons,
        'resolve': resolve,
        'reject': reject
      })
      this.pleaseProcessShortDialogs()
    })
  }

  public register(handle: string, makeDialog: () => HTMLElement): void {
    if (this.registeredMap[handle])
      throw Error('The dialog "' + handle + '" is already registered')
    this.registeredMap[handle] = {
      'maker': makeDialog,
      'dialog': null,
      'rmDialog': null
    }
  }

  public unregister(handle: string): void {
    if (!this.registeredMap[handle])
      return
    this.registeredMap[handle]['rmDialog']()
    delete this.registeredMap[handle]
  }

  public showModal(dialog: any): Promise<any> {
    let handle: string,
      onClose = () => {
        this.closeRegistered(dialog.returnValue, handle)
      },
      rmDialog: Function = null
    if (typeof dialog === 'string') {
      handle = dialog
      if (!this.registeredMap[handle])
        throw Error('Unknown dialog "' + handle + '"')
      if (this.registeredMap[handle]['dialog'] === null) {
        dialog = this.registeredMap[handle]['maker']()
        this.registeredMap[handle]['dialog'] = BkbDialogs.appendDialog(dialog, onClose)
        this.registeredMap[handle]['rmDialog'] = BkbDialogs.makeRmDialogCb(dialog, onClose)
        this.registeredMap[handle]['maker'] = null
      } else
        dialog = this.registeredMap[handle]['dialog']
    } else {
      handle = null
      BkbDialogs.appendDialog(dialog, onClose)
      rmDialog = BkbDialogs.makeRmDialogCb(dialog, onClose)
    }
    return new Promise<any>((resolve, reject) => {
      this.regOpenedStack.push({
        'handle': handle,
        'rmDialog': rmDialog,
        'resolve': resolve,
        'reject': reject
      })
      dialog.returnValue = null
      dialog.showModal()
    })
  }

  // --
  // -- Private
  // --

  private closeRegistered(val: any, handle: string) {
    var props = this.regOpenedStack.pop()
    if (!props)
      return
    if (props['rmDialog'])
      props['rmDialog']()
    if (props['handle'] !== handle) {
      var err = Error('Current dialog handle "' + handle + '" should match with "' + props['handle'] + '"')
      this.dash.log.error(err)
      props['reject'](err)
    } else
      props['resolve'](val)
  }

  private static appendDialog(dialog: HTMLElement, onClose: (event) => void = null): HTMLElement {
    document.body.appendChild(dialog)
    if (!dialog['show'])
      dialogPolyfill.registerDialog(dialog, true)
    if (onClose)
      dialog.addEventListener('close', onClose)
    return dialog
  }

  private static makeRmDialogCb(dialog: HTMLElement, onClose: (event) => void = null): () => void {
    return function () {
      document.body.removeChild(dialog)
      if (onClose !== null)
        dialog.removeEventListener('close', onClose)
    }
  }

  // --
  // -- Private - Router events
  // --

  private canLeave(): boolean {
    if (this.regOpenedStack.length > 0)
      return false
    var props
    if (this.curSmallProp) {
      props = this.curSmallProp
      if (props['type'] === SmallDialogType.Error || props['type'] === SmallDialogType.Confirm)
        return false
    }
    for (var i = 0, len = this.smallMsgQueue.length; i < len; ++i) {
      props = this.smallMsgQueue[i]
      if (props['type'] === SmallDialogType.Error || props['type'] === SmallDialogType.Confirm)
        return false
    }
    return true
  }

  private leave(): void {
    var props
    while (props = this.regOpenedStack.pop()) {
      this.unregister(props['handle'])
      if (props['reject'])
        props['reject'](Error('Current route is closed'))
    }
    if (this.curSmallProp) {
      props = this.curSmallProp
      if (props['type'] === SmallDialogType.Confirm && props['reject'])
        props['reject'](Error('Current route is closed'))
      this.curSmallProp = null
    }
    var i = 0,
      len = this.smallMsgQueue.length
    while (i < len) {
      props = this.smallMsgQueue[i]
      if (props['type'] === SmallDialogType.Confirm && props['reject']) {
        props['reject'](Error('Current route is closed'))
        this.smallMsgQueue.splice(i, 1)
        --len
      } else
        ++i
    }
    this.pleaseProcessShortDialogs()
  }

  // --
  // -- Private - Short dialogs
  // --

  private initShortDialogs() {
    var el = document.createElement('div')
    el.innerHTML = '<dialog class="SmallDialog info ob-dialog">\
<p class="SmallDialog-msg"></p>\
</dialog>\
<dialog class="SmallDialog warn ob-dialog">\
<p class="SmallDialog-msg"></p>\
</dialog>\
<dialog class="SmallDialog err ob-dialog">\
<form method="dialog">\
  <p class="SmallDialog-msg"></p>\
  <div class="SmallDialog-btnBar js-buttons">\
    <button class="ob-btn" value="ok" autofocus>OK</button>\
  </div>\
</form>\
</dialog>\
<dialog class="SmallDialog confirm ob-dialog">\
<form method="dialog">\
  <p class="SmallDialog-msg"></p>\
  <div class="SmallDialog-btnBar js-buttons">\
    <button value="0" class="ob-btn" style="display: none"></button>\
    <button value="1" class="ob-btn" style="display: none"></button>\
    <button value="2" class="ob-btn" style="display: none"></button>\
    <button value="3" class="ob-btn" style="display: none"></button>\
    <button value="4" class="ob-btn" style="display: none"></button>\
  </div>\
</form>\
</dialog>'
    this.smallDialogMap[SmallDialogType.Info] = BkbDialogs.appendDialog(<HTMLElement>el.firstChild, () => {
      this.smallDialogClose()
    })
    this.smallDialogMap[SmallDialogType.Warning] = BkbDialogs.appendDialog(<HTMLElement>el.firstChild, () => {
      this.smallDialogClose()
    })
    this.smallDialogMap[SmallDialogType.Error] = BkbDialogs.appendDialog(<HTMLElement>el.firstChild, () => {
      this.smallDialogClose()
    })
    var that = this
    this.smallDialogMap[SmallDialogType.Confirm] = BkbDialogs.appendDialog(<HTMLElement>el.firstChild, function () {
      that.smallDialogClose(this.returnValue)
      this.returnValue = null // Next call
    })
  }

  private smallDialogClose(val: string = null) {
    if (this.curSmallProp === null)
      return
    try {
      var cb = this.curSmallProp['resolve']
      var prop = this.curSmallProp
      this.curSmallProp = null
      if (cb) {
        if (prop['buttons']) {
          if (val === null || !prop['buttons'][val])
            cb(BkbDialogs.getCancelReturnValue(prop['buttons']))
          else
            cb(prop['buttons'][val]['returnValue'])
        } else
          cb()
      }
      this.pleaseProcessShortDialogs()
    } catch (e) {
      this.dash.log.error(e)
    }
  }

  private static getCancelReturnValue(buttons): any {
    for (var i = 0, len = buttons.length; i < len; ++i) {
      if (buttons[i]['isCancel'])
        return buttons[i]['returnValue']
    }
    return undefined
  }

  private pleaseProcessShortDialogs() {
    if (this.curSmallProp !== null)
      return
    var props = this.smallMsgQueue.shift()
    if (props === undefined)
      return
    // - Show the dialog
    var cur = ++this.smallDialogCount
    this.curSmallProp = props
    var dialog: any = this.smallDialogMap[props['type']]
    if (props['type'] === SmallDialogType.Confirm)
      this.setConfirmButtons(props['buttons'])
    dialog.querySelector('.SmallDialog-msg').innerHTML = props['msgHtml']
    dialog.showModal()
    if (props['delayInMs'] !== undefined) {
      window.setTimeout(() => {
        if (cur !== this.smallDialogCount)
          return
        try {
          dialog.close()
          if (cur !== this.smallDialogCount)
            return
          this.curSmallProp = null
          this.pleaseProcessShortDialogs()
        } catch (e) {
          this.dash.log.error(e)
        }
      }, props['delayInMs'])
    }
  }

  private setConfirmButtons(buttons: {}[]): HTMLElement {
    var dialog: any = this.smallDialogMap[SmallDialogType.Confirm]
    var action = <HTMLElement>dialog.querySelector('.js-buttons'),
      btnProp,
      btn: any,
      hasDefault = false,
      maxBtn = 5,
      i = 0
    for (var len = buttons.length; i < len && i < maxBtn; ++i) {
      btnProp = buttons[i]
      btn = action.children[i]
      btn.style.display = ''
      btn.innerHTML = btnProp['label']
      if (btnProp['isDefault'] && !hasDefault) {
        btn.setAttribute('autofocus', 'autofocus')
        hasDefault = true
      } else
        btn.removeAttribute('autofocus')
    }
    for (; i < maxBtn; ++i) {
      btn = action.children[i]
      btn.style.display = 'none'
      btn.removeAttribute('autofocus')
    }
    return dialog
  }
}
