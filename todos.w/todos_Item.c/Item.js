/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
/// <reference path='../../ext.w/wotsingle_Button.c/Button.ts' />
/// <reference path='../todos_List.c/List.ts' />
var todos;
(function (todos) {
    'use strict';

    var Item = (function () {
        function Item(cc, props) {
            this.cc = cc;
            this.btn = cc.createComponent('wotsingle.Button', { 'label': '×' });
            this.$bloc = $(cc.getTemplate('.todos-item', { 'button': this.btn.getElement() }));
            var that = this;
            this.btn.click(function (e) {
                e.preventDefault();
                that.removeFromList();
            });
            this.curItemId = props['itemId'];
            this.curList = props['list'];
            this.$bloc.find('.lbl').text(props['label']);
        }
        Item.prototype.destroy = function () {
            this.btn.destroy();
        };

        Item.prototype.getElement = function () {
            return this.$bloc[0];
        };

        Item.prototype.removeFromList = function () {
            if (this.curList)
                this.curList.removeItem(this.curItemId);
        };
        return Item;
    })();
    todos.Item = Item;
})(todos || (todos = {}));
//# sourceMappingURL=Item.js.map
