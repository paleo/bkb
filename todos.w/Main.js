/// <reference path="jquery.d.ts" />
/// <reference path="../wot.d.ts" />
/// <reference path='../ext.w/wotext_helpers.l/helpers.ts' />
/// <reference path='todos_List.c/List.ts' />
var todos;
(function (todos) {
    'use strict';

    var Main = (function () {
        function Main(ac) {
            this.ac = ac;
            var log = this.ac.getService('wot.Log');
            log.addListener(function (type, msg, errStack) {
                console.log('[' + type + '] ' + msg);
                if (errStack)
                    console.log(errStack);
            });
        }
        Main.prototype.start = function (element) {
            var st = new wotext.helpers.GenericLiveState(true);
            var list = this.ac.createComponent('todos.List', { 'title': 'My First List', 'count': 3 }, st);
            $(element).append(list.getElement());
        };
        return Main;
    })();
    todos.Main = Main;
})(todos || (todos = {}));
//# sourceMappingURL=Main.js.map
