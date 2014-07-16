// Object.create
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
if (typeof Object.create != 'function') {
	(function () {
		var F = function () {
		};
		Object.create = function (o) {
			if (arguments.length > 1)
				throw Error('Second argument not supported');
			if (o === null)
				throw Error('Cannot set a null [[Prototype]]');
			if (typeof o != 'object')
				throw new TypeError('Argument must be an object');
			F.prototype = o;
			return new F();
		};
	})();
}

// Array.isArray
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
if (!Array.isArray) {
	Array.isArray = function (arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}
