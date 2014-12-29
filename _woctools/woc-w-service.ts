/// <reference path='lib/node.d.ts' />
'use strict';

var argv: any = require('optimist').argv;
import WocWService = require('./woc-w-service/index');

if (argv['h'] || argv['help']) {
  console.log('Syntax: node _woctools/woc-w-service.js OPTIONS\n' +
    '\t-h --help\n' +
    '\t-p --project-path path-to-project-directory (default is current)\n' +
    '\t-o --out-sync-file-path path-to-output-file (default is in the project directory)\n' +
    '\t-i --include-files (default is "js css html png gif jpeg json map")\n' +
    '\t-x --exclude (default is "_wocscripts _woctools node_modules w-sync.json")\n' +
    '\t-X --excludePattern (default is "__jb_.+__", JetBrains temporary files)'
  );
  process.exit(0);
}

var tool = new WocWService({
  'projectPath': argv['p'] || argv['project-path'] || process.cwd(),
  'outSyncFilePath': argv['o'] || argv['out-sync-file-path'],
  'includeFiles': argv['i'] || argv['include-files'] || 'js css html png gif jpeg json map',
  'exclude': argv['e'] || argv['exclude'] || '_wocscripts _woctools node_modules w-sync.json',
  'excludePattern': argv['E'] || argv['exclude-pattern'] || '__jb_.+__'
});

tool.run().catch(function (err) {
  console.log(err['stack']);
  return tool.close();
});

process.on('SIGINT', () => {
  tool.close().then(() => {
    process.exit();
  });
});
