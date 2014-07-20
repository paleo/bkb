/// <reference path='lib/node.d.ts' />
'use strict';

var argv: any = require('optimist').argv;
import WocMake = require('./index');

if (argv['h'] || argv['help'] || argv['_'].length === 0) {
	console.log('Syntax: node _woctools/woc-make.js OPTIONS bundle1 bundle2...\n' +
		'\t-h --help\n' +
		'\t-i --in-project-path path-to-input-dir (default is current)\n' +
		'\t-o --out-project-path path-to-output-dir (default is value from -i)\n' +
		'\t-e --default-encoding the default enconding (default utf8)\n' +
		'\t-l --include-files "list of extensions" (default is "png gif jpg jpeg")\n' +
		'\t-j --minify-js true|false (default is true)\n' +
		'\t-c --minify-css true|false (default is true)\n' +
		'\t-m --minify-html true|false (default is true)\n' +
		'\t-r --remove-destination true|false (default is false)'
	);
	process.exit(0);
}

var inPath = argv['i'] || argv['in-project-path'] || process.cwd();

var toBool = function (v: any, def: boolean): boolean {
	return v === undefined ?  def : v;
};

var tool = new WocMake({
	'inProjectPath': inPath,
	'outProjectPath': argv['o'] || argv['out-project-path'] || inPath,
	'defaultEncoding': argv['e'] || argv['default-encoding'] || 'utf8',
	'includeFiles': argv['l'] || argv['include-files'] || 'png gif jpg jpeg',
	'minifyJs': toBool(argv['j'] || argv['minify-js'], true),
	'minifyCss': toBool(argv['c'] || argv['minify-css'], true),
	'minifyHtml': toBool(argv['m'] || argv['minify-html'], true)
});
tool.processBundles(argv['_'], toBool(argv['r'] || argv['remove-destination'], false)).catch(function (err) {
	console.log(err['stack']);
});
