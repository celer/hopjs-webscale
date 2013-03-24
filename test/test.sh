#!/bin/sh

if [ ! -d ./node_modules/mocha ]
then
	npm install mocha 
fi

MOCHA=./node_modules/mocha/bin/mocha

for d in `ls -1 *.js`
do
	$MOCHA $d
	if [ "$?" != "0" ]
	then
		exit -1
	fi
done
exit 0
