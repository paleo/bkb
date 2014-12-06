/// <reference path='../Tarh.Tools.d.ts' />

module Tarh.Tools {
  'use strict';
  var $ = jQuery;

  export interface Screen {
    route: string;
    comp: Woc.Component;
    /**
     * A string or a callback(query: RouteProperties) that returns a string or a Promise&lt;string&gt;
     */
    title: any;
    activate?: (query: EasyRouter.Query, comp: Woc.Component) => void;
  }

  interface ScreenProp {
    $sd: JQuery;
    comp: Woc.Component;
  }

  export class ScreenSwitcher implements Woc.Component {

    private router: WocGeneric.WocEasyRouter;
    private $comp: JQuery;
    private propMap = {};
    private $404: JQuery;

    constructor(private cc: Woc.HBComponentContext, private screens: Screen[]) {
      this.router = this.cc.getService('WocGeneric.WocEasyRouter');
    }

    public attachTo(el: HTMLElement): ScreenSwitcher {
      this.$comp = $('<div class="ScreenSwitcher"></div>').appendTo(el);
      for (var i = 0, len = this.screens.length; i < len; ++i)
        this.addScreen(this.screens[i]);
      this.add404Screen();
      this.router.start({
        hashBangMode: true
      });
      return this;
    }

    private addScreen(screen: Screen): ScreenProp {
      var route = screen.route,
        comp = screen.comp,
        title = screen.title,
        activate = screen.activate;
      this.router.map([{
        route: route,
        activate: (query: EasyRouter.Query) => {
          if (activate)
            activate(query, comp);
          this.activateScreen(route);
        },
        title: title
      }]);
      var $sd = $('<div class="ScreenSwitcher-screen"></div>').appendTo(this.$comp);
      return this.propMap[route] = {
        $sd: $sd,
        comp: comp.attachTo($sd[0])
      };
    }

    private add404Screen() {
      this.router.mapUnknownRoutes({
        useQueryString: '404',
        activate: (query: EasyRouter.Query) => { this.activate404(query); },
        title: '404 Not Found'
      });
      this.$404 = $('<div class="ScreenSwitcher-screen"></div>').appendTo(this.$comp);
    }

    private activateScreen(route: string): void {
      var screen: ScreenProp = this.propMap[route];
      this.$comp.children().hide();
      screen.$sd.show();
    }

    private activate404(query: EasyRouter.Query): void {
      this.$comp.children().hide();
      this.$404.text('Unknown page: ' + query.queryString).show();
    }
  }
}
