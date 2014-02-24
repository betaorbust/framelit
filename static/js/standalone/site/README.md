Each folder in here will have all of its js files automatically concatted
and then (when not in dev mode) closure compiled into a single into a js file with
the same name as the folder + .min.js

Ex: if you have a folder in here named myCode and the files myCode/service.js
and myCode/directive.js, it will end up in
{SERVING_JS_PATH}/standalone/site/myCode/myCode.min.js (regardless of build mode)

When built in dev mode, the js will simply be concatenated together. In production mode,
it will be minified with closure compiler.

Starting a filename with a _ will cause it to be placed first when concatenating things together, so if you want to initialize some things at the start of your lib, include _some_file_name.js at the root of the folder for your lib.