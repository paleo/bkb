#!/bin/bash

# Get parameter

VER=$1
if [[ -z $VER ]]; then
	echo "Usage: _wocscripts/make-release.sh <version> [--force]"
	exit 1
fi
FORCE=0
if [[ ! -z $2 ]]; then
	if [[ $2 != "--force" ]]; then
		echo "Usage: _wocscripts/make-release.sh <version> [--force]"
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

# Make directory

echo "Make releases/$RELEASE_DIRNAME/"
if [ ! -d "$DIR/releases" ]; then
	mkdir $DIR/releases || exit 1;
fi
cd $DIR/releases || exit 1;

mkdir $RELEASE_DIRNAME || exit 1;

cp -r -t $RELEASE_DIRNAME $SRC_DIR/index.html $SRC_DIR/es5-shim.min.js $SRC_DIR/woc.min.js $SRC_DIR/woc-w.min.js $SRC_DIR/todos.wocb $SRC_DIR/ready_to_be_included $SRC_DIR/_woctools || exit 1;
rm -f -r $RELEASE_DIRNAME/_woctools/node_modules

echo "Edit index.html: switch to \"w\" mode and use \"woc-w.min.js\""
read -p "Press [Enter] key to edit..."
vim $RELEASE_DIRNAME/index.html || exit 1;

# Make archive

echo "Make releases/$RELEASE_FILENAME"
tar -cz -f $RELEASE_FILENAME $RELEASE_DIRNAME || exit 1;

# End

ls -l
echo "... Done. Test the release:"
echo "> http://localhost:8080/wocreleases/$RELEASE_DIRNAME/"
echo "> cd $DIR/releases/$RELEASE_DIRNAME/"
echo "> npm install --prefix _woctools/"
echo "> node _woctools/woc-make.js -r true todos"

