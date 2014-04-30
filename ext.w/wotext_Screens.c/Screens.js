/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
/// <reference path='../wotext_helpers.l/helpers.ts' />
var wotext;
(function (wotext) {
    'use strict';

    

    // ##
    // ## Screens
    // ##
    var Screens = (function () {
        // --
        // -- Component
        // --
        function Screens(cc) {
            this.cc = cc;
            this.unregisteredSelList = [];
            this.uspBySel = {};
            this.elements = [];
            this.$curScreenEl = null;
            this.lastUp = null;
            this.lastScreen = null;
            this.$container = $(this.cc.getTemplate('.screens'));
            this.router = this.cc.getService('wot.Router');
            var that = this;
            this.cc.addListenerRm(this.router.addBeforeListener(function (up) {
                return that.getScreen(up) !== null;
            }));
            this.cc.addListenerRm(this.router.addChangeListener(function (up) {
                that.switchTo(up);
            }));
        }
        Screens.prototype.getElement = function () {
            return this.$container[0];
        };

        Screens.prototype.destroy = function () {
            this.cc.propagDestroy();
        };

        // --
        // -- Public
        // --
        Screens.prototype.addRoutes = function (usp, routes) {
            for (var i = 0, len = routes.length; i < len; ++i) {
                this.unregisteredSelList.push(routes[i]);
                this.uspBySel[routes[i]] = usp;
            }
        };

        Screens.prototype.register = function () {
            this.cc.addListenerRm(this.router.addSelectors(this.unregisteredSelList, this));
            this.unregisteredSelList = [];
        };

        // --
        // -- ScreenElHandler
        // --
        Screens.prototype.addScreenElement = function (el) {
            var elId = this.elements.length;
            this.elements[elId] = $(el).appendTo(this.$container);
            return elId;
        };

        // --
        // -- wot.UrlController
        // --
        Screens.prototype.fillUrlProps = function (up) {
            var screen = this.getScreen(up);
            if (screen === null)
                return false;
            up['title'] = screen.getUrlTitle();
            return true;
        };

        // --
        // -- Private
        // --
        Screens.prototype.switchTo = function (up) {
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
        };

        Screens.prototype.getScreen$Element = function (screen) {
            var elId = screen.getScreenElementId();
            var $el = this.elements[elId];
            if ($el === undefined)
                throw new Error('Missing screen element for ID "' + elId + '"');
            return $el;
        };

        Screens.prototype.getScreen = function (up) {
            if (up === this.lastUp)
                return this.lastScreen;
            var provider = this.uspBySel[up['sel']];
            if (provider === undefined)
                return null;
            this.lastUp = up;
            this.lastScreen = provider.getScreen(up, this);
            return this.lastScreen;
        };
        return Screens;
    })();
    wotext.Screens = Screens;
})(wotext || (wotext = {}));
//# sourceMappingURL=Screens.js.map
