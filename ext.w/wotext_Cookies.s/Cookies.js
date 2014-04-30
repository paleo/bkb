var wotext;
(function (wotext) {
    'use strict';

    var Cookies = (function () {
        function Cookies() {
        }
        Cookies.prototype.put = function (name, value, days, path) {
            if (typeof days === "undefined") { days = null; }
            if (typeof path === "undefined") { path = null; }
            var exDate = new Date();
            exDate.setDate(exDate.getDate() + days);
            var cValue = encodeURI(value);
            if (days !== null)
                cValue += "; expires=" + exDate.toUTCString();
            if (path !== null)
                cValue += "; path=" + path;
            document.cookie = name + "=" + cValue;
        };

        Cookies.prototype.read = function (name) {
            var cValue = document.cookie;
            var needle = name + "=";
            var i = cValue.indexOf("; " + needle);
            if (i === -1) {
                i = cValue.indexOf(needle);
                if (i !== 0)
                    return null;
            }
            i = cValue.indexOf("=", i) + 1;
            var iEnd = cValue.indexOf(";", i);
            if (iEnd === -1)
                return decodeURI(cValue.substring(i));
            return decodeURI(cValue.substring(i, iEnd));
        };

        Cookies.prototype.erase = function (name, path) {
            if (typeof path === "undefined") { path = null; }
            this.put(name, "", -1, path);
        };
        return Cookies;
    })();
    wotext.Cookies = Cookies;
})(wotext || (wotext = {}));
//# sourceMappingURL=Cookies.js.map
