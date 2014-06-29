/* jshint strict: false */
/*global module: true, require: true */

var path = require('path');
/*jshint -W079 */
var _ = require('underscore');
/*jshint +W079 */


module.exports = function(grunt) {
	'use strict';
	// =================
	// = Configuration =
	// =================

	/**
	 * General idea for full production build
	 * js
	 * 	-> vendor
	 * 		Concatenated, but not minified to [JS_MIN_PATH]/[MINIFIED_INCLUDE_NAME]_vendor.min.js.
	 * 	-> site
	 * 		Minified and concatenated into [MINIFIED_JS].
	 * 	-> standalone
	 * 		-> vendor
	 * 			Copied to [JS_MIN_PATH]/standalone/vendor/[existing path]
	 * 		-> site
	 * 			Minified by directory to [JS_MIN_PATH]/standalone/site/[libraryname].min.js
	 * 			Example: standalone/site/mylib/[mylibmain.js, mylibsupport.js]
	 * 						-> [JS_MIN_PATH]/standalone/site/mylib.min.js
	 * 			This is done alphabetically (for now), so if you're doing any runtime screwiness
	 * 			(don't) then make sure your files are in the correct order.
	 * css
	 * 	-> components
	 * 		Nothing happens. Not available after build. Use only to reference/include
	 * 		from during builds. (stuff like bootstrap components can go here)
	 * 	-> vendor
	 * 		LESS'd and concatenated to the beginning of [MINIFIED_CSS]. If you don't want these files
	 * 		in your main build, include them separately by using /standalone.
	 * 		This is done alphabetically by default, but can be reordered from the "CSS_SITE"
	 * 		variable in this file.
	 * 	-> site
	 * 		LESS'd and concatenated to the end of [MINIFIED_CSS]. This is done alphabetically by
	 * 		default, but can be reordered from the "CSS_SITE" variable in this file.
	 *  -> standalone
	 *  	-> vendor
	 *  		Minified by directory to [CSS_MIN_PATH]/standalone/vendor/[library name].min.css
	 *  	-> site
	 *  		Minified by directory to [CSS_MIN_PATH]/standalone/site/[library name].min.css
	 */
	var JS_VENDOR = [
			//'vendor/jquery/*min.js',
			'vendor/{,**/}*.js'
		],
		JS_VENDOR_SOURCE_MAPS = [
			'vendor/{,**/}*.min.js.map'
		],
		JS_SITE = [
			'site/{,**/}*.js'
		],
		JS_STANDALONE_VENDOR = [
			'standalone/vendor/{,**/}*.js'
		],
		JS_STANDALONE_SITE_PATH = 'standalone/site/',
		CSS_SITE = [
			// When including a specific file here, make sure to include both the css and
			// less file versions as this is used both pre and post less-ification.
			//'vendor/bootstrap/bootstrap.(less|css)'
			'vendor/{,**/}*.(less|css)',
			'site/{,**/}*.(less|css)'
		],
		CSS_STANDALONE_VENDOR = [
			'standalone/vendor/{,**/}*.(less|css)'
		];


	// Base File Paths - always include the trailing slash
	var STATIC_BASE_PATH = 'static/',
		MINIFIED_BASE_PATH = STATIC_BASE_PATH + 'minified/',
		MINIFIED_INCLUDE_NAME = 'framelit',
		JS_PATH = STATIC_BASE_PATH + 'js/',
		JS_MIN_PATH = MINIFIED_BASE_PATH + 'js_min/',
		MINIFIED_JS = JS_MIN_PATH + MINIFIED_INCLUDE_NAME + '.min.js',
		MINIFIED_JS_VENDOR = JS_MIN_PATH + MINIFIED_INCLUDE_NAME + '_vendor.min.js',
		SERVING_JS_PATH = '/' + JS_MIN_PATH, // IF you have a different serving path, change this.
		CSS_PATH = STATIC_BASE_PATH + 'css/',
		CSS_MIN_PATH = MINIFIED_BASE_PATH + 'css_min/',
		SERVING_CSS_PATH = CSS_MIN_PATH, // IF you have a different serving path, change this.
		MINIFIED_CSS = CSS_MIN_PATH + MINIFIED_INCLUDE_NAME + '.min.css',
		CURRENT_VERSION = (new Date()).getTime();


	// Utility function: prepends a prefix to each item in
	// a list of file paths/glob expressions
	function prefixPaths(prefix, filePaths) {
		return _.map(filePaths, function (filePath) {
			return path.join(prefix, filePath);
		});
	}

	// Load all grunt modules except grunt-cli, since that's not used in the build
	require('matchdep').filterAll(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

	// Comment out to disable timing information for tasks
	require('time-grunt')(grunt);



	// Processing of standalone files - autominify anything in a dir under
	// <baseInputPath>/standalone/site/<some dir> with the given inputFileExtension to
	// <baseOutputPath>/standalone/site/<dir name>/<dir name>.min.<outputFileExtension>
	// TODO: This section is brittle, in that it does not allow ordering within site lib components,
	// and does not follow the variable pattern we're generally using. Will take a hefty refactor,
	// so leaving it out for now.
	function makeMinificationMap(baseInputPath, baseOutputPath, inputFileExtension, outputFileExtension) {
		return _.map(grunt.file.expand({
			'cwd': baseInputPath,
			'filter': function isNonEmptyDir(fullDirPath) {
				// TODO: convert to using isMatch
				return grunt.file.isDir(fullDirPath) &&
						grunt.file.expand(path.join(fullDirPath, '/{,**/}*.' + inputFileExtension)).length;
			}
		}, [JS_STANDALONE_SITE_PATH + '*']), function (dirPath) {
			return {
				'src': grunt.file.expand(path.join(baseInputPath, dirPath, '{,**/}*.' + inputFileExtension)),
				'dest': path.join(baseOutputPath, dirPath, '../', path.basename(dirPath) + '.min.' + outputFileExtension)
			};
		});
	}

	// Get all from within

	var standaloneJSMinifyFilesMap = makeMinificationMap(JS_PATH, JS_MIN_PATH, 'js', 'js');
	var standaloneCSSMinifyFilesMap = makeMinificationMap(CSS_PATH, CSS_MIN_PATH, '(less|css)', 'css');
	grunt.registerTask('createIncludeFiles', function () {
		// Paths and ordering for the includes files
		var jsIncludes = grunt.file.expand(
				{'cwd': JS_MIN_PATH},
				JS_VENDOR.concat(JS_SITE)
			);

		// If there are any css files that need to be loaded first,
		// include them here directly under css_min (ex: bootstrap.css)
		var styleIncludes = grunt.file.expand({
			'cwd': CSS_MIN_PATH
		}, CSS_SITE);
		// Injects every jsInclude manually.
		grunt.config.set('createFile', {
			'jsIncludes': {
				'content': '(function(document, undefined){\n' +
								'	\'use strict\';\n' +
								'	var __framelitLibsToLoad = ['+(_.reduce(jsIncludes, function (total, curr) {
										return total + '\'' + SERVING_JS_PATH + curr + '?' + CURRENT_VERSION + '\',\n';
									}, '')).slice(0, -2)+'];\n'+
								'	for(var i = 0; i < __framelitLibsToLoad.length; i++){\n' +
								'		var imported = document.createElement(\'script\');\n' +
								'		imported.src = __framelitLibsToLoad[i];\n' +
								'		document.head.appendChild(imported);\n'+
								'	}\n'+
								'})(document);',
				'file': MINIFIED_JS
			},
			'styleIncludes': {
				'content': (_.reduce(styleIncludes, function (total, curr) {
					return total + '@import url(\''+SERVING_CSS_PATH + curr + '?' + CURRENT_VERSION + '\');\n';
				}, '')),
				'file': MINIFIED_CSS
			}
		});

		grunt.task.run('createFile:jsIncludes');
		grunt.task.run('createFile:styleIncludes');
	});

	// Custom Tasks
	grunt.registerMultiTask('createFile', 'This task creates a file with the specified content.',
		function () {
		var content = this.data['content'] || '';
		var file = this.data['file'];

		// Fail out if no file specified
		if (!file) {
			grunt.fail.warn('No file path specified.');
		}

		// Write the contents to the file
		try {
			grunt.file.write(file, content);
			grunt.log.writeln('File ' + file.cyan + ' created');
		} catch (e) {
			grunt.fail.warn(e.message);
		}
	});


	// Project configuration.
	grunt.initConfig({
		'concat': {
			// For producing an unminified site js file with all our js in it.
			// For a minified+concatenated file, see closureCompiler:site below
			'site': {
				'src': prefixPaths(JS_PATH, JS_SITE),
				'dest': MINIFIED_JS,
				'separator': ';'
			},
			// Concatenates all vendor libs together - no minification needed
			// since they're all minified already
			'vendor': {
				'src': prefixPaths(JS_PATH, JS_VENDOR),
				'dest': MINIFIED_JS_VENDOR,
				'separator': ';'
			},
			'standaloneJSDevelopment': {
				'files': standaloneJSMinifyFilesMap
			}
		},
		'closureCompiler': {
			// Minify AND concatenate all our js into one site.js file
			'site': {
				'files': [{
					'src': prefixPaths(JS_PATH, JS_SITE),
					'dest': MINIFIED_JS
				}]
			},
			'standalone': {
				'files': standaloneJSMinifyFilesMap
			},
			'options': {
				'compilerFile': 'util/closure/compiler.jar',
				'compilation_level': 'SIMPLE_OPTIMIZATIONS',
				'warning_level': 'verbose',
				'jscomp_off': ['checkTypes', 'fileoverviewTags', 'undefinedVars'],
				'summary_detail_level': 3
			}
		},
		'less': {
			// Minify our less/css files into site css.
			'production': {
				'files': [{
					'src': prefixPaths(CSS_PATH, CSS_SITE),
					'dest': MINIFIED_CSS
				}],
				'options': {
					'cleancss': true
				}
			},
			// Compile all the LESS in our css/ directory
			'development': {
				// All of our core files
				'files': [{
					'src': CSS_SITE,
					'dest': CSS_MIN_PATH,
					'cwd': CSS_PATH,
					'expand': true,
					'ext': '.css'
				// All of the standalone directories in css/standalone/
				}].concat(standaloneCSSMinifyFilesMap),
				'options': {
					'sourceMap': true,
					'outputSourceFiles': true
				}
			},
			// Compile just the LESS in css/standalone/
			'standaloneCSSDevelopment': {
				'files': standaloneCSSMinifyFilesMap,
				'options': {
					'sourceMap': true,
					'outputSourceFiles': true
				}
			},
			'standaloneCSSProduction': {
				'files': standaloneCSSMinifyFilesMap,
				'options': {
					'cleancss': true
				}
			}
		},
		'copy': {
			// Copies all of our js assets over, without catting or minifying
			'js': {
				'files': [{
					'src': JS_VENDOR.concat(JS_VENDOR_SOURCE_MAPS),
					'dest': JS_MIN_PATH,
					'cwd': JS_PATH,
					'expand': true
				}, {
					'src': JS_SITE,
					'dest': path.join(JS_MIN_PATH),
					'cwd': JS_PATH,
					'expand': true
				}]
			},
			'standaloneJSVendor': {
				'files': [{
					'src': JS_STANDALONE_VENDOR,
					'dest': JS_MIN_PATH,
					'cwd': JS_PATH,
					'expand': true
				}]
			},
			'standaloneCSSVendor': {
				'files': [{
					'src': CSS_STANDALONE_VENDOR,
					'dest': CSS_MIN_PATH,
					'cwd': CSS_PATH,
					'expand': true
				}]
			}
		},
		'clean': {
			'all': {
				'src': [
					JS_MIN_PATH,
					CSS_MIN_PATH
				]
			},
		}
	});


	// ==================
	// = Internal Tasks =
	// ==================

	// Minifies and concatenates our js files and produces a js includes template referencing the catted file
	grunt.registerTask('processJS', 'Minifies and concatenates our js files and produces a js includes template referencing the catted file',
			['concat:vendor', 'closureCompiler:site', 'closureCompiler:standalone', 'copy:standaloneJSVendor']);

	// Compiles and creates the minified CSS files and their dependencies
	grunt.registerTask('processStyles', 'Compiles and creates the minified CSS files and their dependencies',
			['less:production', 'copy:standaloneCSSVendor', 'less:standaloneCSSProduction']);

	// ================
	// = Public Tasks =
	// ================

	// Compiles+mins+cats all JS and LESS and their dependency assets
	grunt.registerTask('default', 'Compiles+mins+cats all JS and LESS and their dependency assets', [
		'clean:all',
		'processJS',
		'processStyles',
	]);

	// Copies over the JS without minifying it, compiles the LESS and dependency assets
	grunt.registerTask('dev', 'Copies over the JS without minifying/catting it, compiles the LESS and dependency assets', [
		'clean:all',
		'copy:js',
		'concat:standaloneJSDevelopment',
		'copy:standaloneJSVendor',
		'copy:standaloneCSSVendor',
		'less:development',
		'createIncludeFiles'
	]);

};
