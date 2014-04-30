/// <reference path='../../wot.d.ts' />
/// <reference path='../jquery.d.ts' />
/// <reference path='../../ext.w/wotsingle_Button.c/Button.ts' />
/// <reference path="../todos_Item.c/Item.ts" />
var todos;
(function (todos) {
    'use strict';

    var List = (function () {
        function List(cc, props) {
            this.cc = cc;
            this.items = null;
            this.btn = cc.createComponent('wotsingle.Button', { 'label': '+' });
            this.$bloc = $(cc.getTemplate('.todos-list', {
                'addBtn': this.btn.getElement()
            }));
            this.$ul = this.$bloc.find('ul');
            var that = this;
            this.btn.click(function (e) {
                e.preventDefault();
                that.createItem();
            });
            this.$bloc.find('h1').text(props['title']);
            this.items = [];
            for (var i = 0; i < props['count']; ++i)
                this.createItem();
        }
        List.prototype.destroy = function () {
            this.clear();
            this.btn.destroy();
        };

        List.prototype.getElement = function () {
            return this.$bloc[0];
        };

        List.prototype.removeItem = function (itemId) {
            var prop = this.items[itemId];
            prop['item'].destroy();
            prop['$li'].remove();
            delete this.items[itemId];
        };

        List.prototype.createItem = function () {
            var id = this.items.length;
            var item = this.cc.createComponent('todos.Item', {
                'list': this,
                'itemId': id,
                'label': 'TODO ' + (id + 1)
            });
            var $li = $('<li></li>').append(item.getElement()).appendTo(this.$ul);
            this.items[id] = {
                'item': item,
                '$li': $li
            };
        };

        List.prototype.clear = function () {
            if (!this.items)
                return;
            this.$ul.empty();
            for (var k in this.items) {
                if (this.items.hasOwnProperty(k))
                    this.items[k]['item'].destroy();
            }
            this.items = null;
        };
        return List;
    })();
    todos.List = List;
})(todos || (todos = {}));
//# sourceMappingURL=List.js.map
