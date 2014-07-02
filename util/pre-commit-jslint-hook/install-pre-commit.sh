#!/bin/bash

# cd $(git rev-parse --show-toplevel)

if [[ `which jshint` ]]; then
	echo "JSHint found"
else
	echo "FAILURE: JSHint must be intalled. The easiest way to do this is"
	echo "to install nodejs, then run 'sudo npm install -g jshint'"
	exit -1
fi

echo "Copying precommit hook..."

hookname="pre-commit"
echo $hookname
hookdest="$(git rev-parse --show-toplevel)/.git/hooks/"
hooksrc="$(git rev-parse --show-toplevel)/util/pre-commit-jslint-hook/pre-commit"

echo $hookdest

if [[ -f $hookdest$hookname ]]; then
	echo "There is already a pre-commit hook, overwrite?"
	select choice in "Yes" "No"; do
	    case $choice in
	        Yes ) break;;
	        No ) echo "Please merge over manually then."; exit;;
	    esac
	done
elif ! [[ -d $hookdest ]]; then
	mkdir -p "$hookdest"
fi

cp "$hooksrc" "$hookdest$hookname"
echo "Copied precommit hook to $hookdest"
