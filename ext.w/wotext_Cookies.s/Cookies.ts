module wotext {
	'use strict';

	export class Cookies {
		public put(name, value, days: number = null, path = null) {
			var exDate = new Date();
			exDate.setDate(exDate.getDate() + days);
			var cValue = encodeURI(value);
			if (days !== null)
				cValue += "; expires=" + exDate.toUTCString();
			if (path !== null)
				cValue += "; path=" + path;
			document.cookie = name + "=" + cValue;
		}

		public read(name) {
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
		}

		public erase(name, path = null) {
			this.put(name, "", -1, path);
		}
	}
}
