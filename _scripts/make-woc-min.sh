#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" || exit 1;
cd $DIR/.. || exit 1;

if [ -f "woc.min.js" ]; then
	rm -f woc.min.js || exit 1;
fi
if [ -f "woc-w.min.js" ]; then
	rm -f woc-w.min.js || exit 1;
fi

uglifyjs woc/comptree.js woc/contexts.js woc/loader.js woc/main.js woc/log.js woc/httpclient.js woc/utils.js woc/lib/promise-1.0.0.min.js -o woc-nolicense.min.js || exit 1;

uglifyjs woc/comptree.js woc/contexts.js woc/loader.js woc/loader-w.js woc/main.js woc/log.js woc/httpclient.js woc/utils.js woc/lib/promise-1.0.0.min.js -o woc-w-nolicense.min.js || exit 1;

cat LICENSE woc-nolicense.min.js > woc.min.js || exit 1;
cat LICENSE woc-w-nolicense.min.js > woc-w.min.js || exit 1;

rm -f woc-nolicense.min.js || exit 1;
rm -f woc-w-nolicense.min.js || exit 1;

