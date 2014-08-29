/// <reference path='../../d.ts/wocbundle.d.ts' />
/// <reference path='../../d.ts/jquery.d.ts' />

module WocGeneric {
  'use strict';

  // ##
  // ## Interfaces
  // ##

  export interface ScreenElHandler {
    /**
     * @returns The screen element ID
     */
    addScreenElement(el: HTMLElement): number;
  }

  export interface Screen {
    getUrlTitle();
    /**
     * @returns NULL or UNDEFINED if still undefined, or the screen element ID
     */
    getScreenElementId(): number;
    activate(): void;
    readyToDeactivate(): boolean;
    deactivate(): void;
  }

//  export interface SimpleScreen {
//    getUrlTitle();
//    createScreenElement(): HTMLElement;
//    activate(): void;
//    readyToDeactivate(): boolean;
//    deactivate(): void;
//  }

  export interface ScreenProvider {
    /**
     * @return Screen NULL when no screen
     */
    getScreen(up: Woc.UrlProps, seh: ScreenElHandler): Screen;
  }

  // ##
  // ## Screens
  // ##

  export class Screens implements Woc.Component, Woc.UrlController, ScreenElHandler {

    // --
    // -- Fields & Initialisation
    // --

    private router: WocGeneric.FirstRouter;
    private $container: JQuery;
    private unregisteredSelList = [];
    private uspBySel = {};
    private elements: JQuery[] = [];
    private $curScreenEl: JQuery = null;
    private curScreen: Screen;
    private lastUp: Woc.UrlProps = null;
    private lastScreen: Screen = null;
    private rmCbList: Function[] = [];

    // --
    // -- Component
    // --

    constructor(private cc: Woc.FirstComponentContext) {
      this.$container = $(this.cc.getTemplate('.screens'));
      this.router = this.cc.getService('WocGeneric.FirstRouter');
      this.rmCbList.push(this.router.addBeforeListener((up: Woc.UrlProps): boolean => {
        return this.getScreen(up) !== null;
      }));
      this.rmCbList.push(this.router.addChangeListener((up: Woc.UrlProps) => {
        this.switchTo(up);
      }));
    }

    public getElement(): HTMLElement {
      return this.$container[0];
    }

    public destructInDOM() {
      this.$container.remove();
    }

    public destruct() {
      for (var i = 0, len = this.rmCbList.length; i < len; ++i)
        this.rmCbList[i]();
    }

    // --
    // -- Public
    // --

//    public addScreen(screen: Screen, route: string) {
//      this.gsp.addScreen(screen, route);
//    }

    public addScreenProvider(usp: ScreenProvider, routes: string[]) {
      for (var i = 0, len = routes.length; i < len; ++i) {
        this.unregisteredSelList.push(routes[i]);
        this.uspBySel[routes[i]] = usp;
      }
    }

    public register(): void {
      this.rmCbList.push(this.router.addSelectors(this.unregisteredSelList, this));
      this.unregisteredSelList = [];
    }

    // --
    // -- ScreenElHandler
    // --

    public addScreenElement(el: HTMLElement): number {
      var elId = this.elements.length;
      this.elements[elId] = $(el).appendTo(this.$container);
      return elId;
    }

    // --
    // -- Woc.UrlController
    // --

    public fillUrlProps(up: Woc.UrlProps): boolean {
      var screen = this.getScreen(up);
      if (screen === null)
        return false;
      up['title'] = screen.getUrlTitle();
      return true;
    }

    // --
    // -- Private
    // --

    private switchTo(up: Woc.UrlProps): boolean {
      var screen = this.getScreen(up);
      if (screen === null)
        return false;
      if (this.curScreen) {
        if (!this.curScreen.readyToDeactivate())
          return false;
        this.curScreen.deactivate();
      }
      screen.activate();
      this.curScreen = screen;
      var $el = this.getScreen$Element(screen);
      if ($el !== this.$curScreenEl) {
        $el.show();
        for (var i = 0, len = this.elements.length; i < len; ++i) {
          if (this.elements[i] !== $el)
            this.elements[i].hide();
        }
        this.$curScreenEl = $el;
      }
      return true;
    }

    private getScreen$Element(screen: Screen): JQuery {
      var elId = screen.getScreenElementId();
      var $el: JQuery = this.elements[elId];
      if ($el === undefined)
        throw Error('Missing screen element for ID "' + elId + '"');
      return $el;
    }

    private getScreen(up: Woc.UrlProps): Screen {
      if (up === this.lastUp)
        return this.lastScreen;
      var provider: ScreenProvider = this.uspBySel[up['sel']];
      if (provider === undefined)
        return null;
      this.lastUp = up;
      this.lastScreen = provider.getScreen(up, this);
      return this.lastScreen;
    }
  }

//  // ##
//  // ## GenericScreenProvider
//  // ##
//
//  class GenericScreenProvider implements ScreenProvider, Screen {
//    private map = {};
//    private elId: number;
//
//    constructor(private screens: Screens) {
//    }
//
//    public addScreen(screen: SimpleScreen, route: string) {
//      this.map[route] = screen;
//      this.screens.addScreenProvider(this, [route]);
//    }
//
//    public getScreen(up: Woc.UrlProps, seh: ScreenElHandler): Screen {
//      var screen = this.map[up.sel];
//      if (screen === undefined)
//        throw Error('Unknown route "' + up.sel + '"');
//      if (this.elId === undefined)
//        this.elId = seh.addScreenElement(screen.createScreenElement());
//
//      return {
//        getUrlTitle();
//    /**
//     * @returns NULL or UNDEFINED if still undefined, or the screen element ID
//     */
//    getScreenElementId(): number;
//    activate(): void;
//    readyToDeactivate(): boolean;
//    deactivate(): void;
//
//      };
//    }
//  }
}
