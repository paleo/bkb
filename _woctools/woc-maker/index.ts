/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import path = require("path");
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

import Project = require('./Project');
import BundleWReader = require('./BundleWReader');
import BundleWriter = require('./BundleWriter');

class WocMaker {
	private opt: {};

	/**
	 * @param opt object
	 *
	 * <pre><code>opt: {
	 * 	'inProjectPath': dir,
	 * 	'outProjectPath': dir,
	 * 	'defaultEncoding': 'utf8',
	 * 	'outEncoding': 'utf8',
	 * 	'includeFiles': 'png gif',
	 * 	'minifyJs': true,
	 * 	'minifyCss': true,
	 * 	'minifyHtml': true
	 * }</code></pre>
	*/
	constructor(opt: {}) {
		this.opt = WocMaker.formatOptions(opt);
		Object.freeze(this.opt);
	}

	public processBundles(bundleNames: string[], rmDestination: boolean): Promise<void> {
		return Project.makeInstance(this.opt).then<void>((prj: Project) => {
			return bundleNames.map((bundleName) => {
				return BundleWReader.makeInstance(prj, Project.makeDirW(bundleName)).then((reader: BundleWReader) => {
					var writer = new BundleWriter(prj, bundleName, reader.getBundleVersion());
					return reader.process(writer).then(() => {
						return writer.write(rmDestination);
					});
				});
			}).reduce((sequence: Promise<any>, bundlePromise: Promise<any>) => {
				return sequence.then(() => {
					return bundlePromise;
				});
			}, Promise.resolve());
		});
	}

	private static formatOptions(opt: {}): {} {
		if (!opt['inProjectPath'])
			throw Error('Parameter "' + 'inProjectPath' + '" is required');
		return {
			'inProjectPath': opt['inProjectPath'],
			'outProjectPath': opt['outProjectPath'] || opt['inProjectPath'],
			'defaultEncoding': opt['defaultEncoding'] || 'utf8',
			'outEncoding': opt['outEncoding'] || opt['defaultEncoding'] || 'utf8',
			'includeFiles': opt['includeFiles'] ? opt['includeFiles'].split(' ') : [],
			'minifyJs': opt['minifyJs'] === undefined ? true : (opt['minifyJs'] ? true : false),
			'minifyCss': opt['minifyCss'] === undefined ? true : (opt['minifyCss'] ? true : false),
			'minifyHtml': opt['minifyHtml'] === undefined ? true : (opt['minifyHtml'] ? true : false)
		};
	}
}

export = WocMaker;
