#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR/..
uglifyjs woc.w/comptree.js woc.w/contexts.js woc.w/loader.js woc.w/loader-w.js woc.w/main.js  woc.w/serv-ajax.js  woc.w/serv-log.js  woc.w/serv-router.js  woc.w/utils.js -o woc.min.js

