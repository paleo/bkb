#!/bin/bash

# Get parameter

VER=$1
if [[ -z $VER ]]; then
	echo "Usage: _scripts/make-release.sh <version> [--force]"
	exit 1
fi
FORCE=0
if [[ ! -z $2 ]]; then
	if [[ $2 != "--force" ]]; then
		echo "Usage: _scripts/make-release.sh <version> [--force]"
		exit 1
	fi
	FORCE=1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RELEASE_DIRNAME=woc-$VER
RELEASE_FILENAME=woc-$VER.tar.gz
SRC_DIR=$DIR/..

if [ -d "$DIR/releases/$RELEASE_DIRNAME" -o -f "$DIR/releases/$RELEASE_FILENAME" ]; then
	if [[ $FORCE == 0 ]]; then
		echo "Directory releases/$RELEASE_DIRNAME/ already exists"
		exit 1;
	fi
	echo "Remove old $RELEASE_DIRNAME"
	rm -f -r $DIR/releases/$RELEASE_DIRNAME || exit 1;
	rm -f $DIR/releases/$RELEASE_FILENAME || exit 1;
fi

# Make woc.min.js

echo "Make woc.min.js"
cd $SRC_DIR
$DIR/make-woc-min.sh || exit 1;
ls -l woc*.min.js

# Make the target directory

echo "Make releases/$RELEASE_DIRNAME/"
if [ ! -d "$DIR/releases" ]; then
	mkdir $DIR/releases || exit 1;
fi
cd $DIR/releases || exit 1;

mkdir $RELEASE_DIRNAME || exit 1;

# Fill the target directory

cp -r -t $RELEASE_DIRNAME $SRC_DIR/{woc.min.js,woc-w.min.js,myproject.wocb,_woctools} || exit 1;
cp $SRC_DIR/myproject.html $RELEASE_DIRNAME/index.html || exit 1

rm -f -r $RELEASE_DIRNAME/_woctools/node_modules || exit 1
find $RELEASE_DIRNAME/_woctools/ -name "*.ts" -delete || exit 1

mv $RELEASE_DIRNAME/myproject.wocb/defs/myproject.d.ts-boilerplate $RELEASE_DIRNAME/myproject.wocb/defs/myproject.d.ts || exit 1
mv $RELEASE_DIRNAME/myproject.wocb/lib.wocb/defs/lib.d.ts-boilerplate $RELEASE_DIRNAME/myproject.wocb/lib.wocb/defs/lib.d.ts || exit 1
mv $RELEASE_DIRNAME/myproject.wocb/MyProject.Start.wocs/Start.ts-boilerplate $RELEASE_DIRNAME/myproject.wocb/MyProject.Start.wocs/Start.ts || exit 1

cp -r -t $RELEASE_DIRNAME/myproject.wocb/lib.wocb $SRC_DIR/test.wocb/lib.wocb/{WocTeam.Log.wocs,ResetCSS.woct} || exit 1
cp -r -t $RELEASE_DIRNAME/myproject.wocb/lib.wocb/defs $SRC_DIR/test.wocb/lib.wocb/defs/{Woc.d.ts,es6-promise.d.ts} || exit 1

# Compile the boilerplate Start.ts

tsc $RELEASE_DIRNAME/myproject.wocb/MyProject.Start.wocs/Start.ts || exit 1

# Make woclib

mkdir $RELEASE_DIRNAME/woclib || exit 1
cp -t $RELEASE_DIRNAME/woclib/ $SRC_DIR/ie8-shim.js || exit 1
cp -r -t $RELEASE_DIRNAME/woclib $SRC_DIR/test.wocb/lib.wocb/{*.woc?,defs} || exit 1
rm $RELEASE_DIRNAME/woclib/defs/lib.d.ts || exit 1

# Make the archive

echo "Make releases/$RELEASE_FILENAME"
tar -cz -f $RELEASE_FILENAME $RELEASE_DIRNAME || exit 1;

# End

ls -l
echo "... Done. Test the release:"
echo "> http://localhost:8080/wocreleases/$RELEASE_DIRNAME/"
echo "> cd $DIR/releases/$RELEASE_DIRNAME/"
echo "> npm install --prefix _woctools/"
echo "> node _woctools/woc-make.js -r true myproject"
