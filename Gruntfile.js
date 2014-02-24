/*global
module: true,
require: true,
*/

var path = require('path');
/*jshint -W079 */
var _ = require('underscore');
/*jshint +W079 */

module.exports = function(grunt) {
	'use strict';
	// Utility function: prepends a prefix to each item in
	// a list of file paths/glob expressions
	function prefixPaths(prefix, filePaths) {
		return _.map(filePaths, function (filePath) {
			return path.join(prefix, filePath);
		});
	}


	// Load all grunt modules except grunt-cli, since that's not used in the build
	require('matchdep').filterAll(['grunt-*', '!grunt-cli']).forEach(grunt.loadNpmTasks);

	// Uncomment to enable timing information for tasks
	require('time-grunt')(grunt);

	// =================
	// = Configuration =
	// =================

	// For the devwatch task only: how long to wait after a file has
	// changed to see if more files change and can be recompiled in
	// the same run. In milliseconds.
	var fileWatcherBatchTimespan = 200;

	// Base File Paths - always include the trailing slash
	// These must be kept in sync with the livereload gruntfile!
	var STATIC_BASE_PATH = 'static/',
		MINIFIED_BASE_PATH = STATIC_BASE_PATH + 'minified/',
		JS_PATH = STATIC_BASE_PATH + '/js/',
		JS_MIN_PATH = MINIFIED_BASE_PATH + 'js_min/',
		CSS_PATH = STATIC_BASE_PATH + 'css/',
		CSS_MIN_PATH = MINIFIED_BASE_PATH + 'css_min/',
		SERVER_TEMPLATES_PATH = STATIC_BASE_PATH + 'include_templates/',
		JS_INCLUDES_FILE_PATH = SERVER_TEMPLATES_PATH + 'js_includes.html',
		CSS_INCLUDES_FILE_PATH = SERVER_TEMPLATES_PATH + 'css_includes.html',
		SERVING_JS_PATH = JS_MIN_PATH,
		SERVING_CSS_PATH = CSS_MIN_PATH;

	// List of all our less assets, to be compiled and run. Relative to CSS_PATH.
	// This is a list of relative paths, not strictly glob patterns, and will
	// have path prefixes prepended to it in some build modes, so be wary!
	var stylesheets = [
		// 'external/bootstrap/*.less',
		// 'external/jquery/no-theme/*.css',
		// 'external/**/*.less',
		// 'udacity/{,**/}*.less'
	];

	// All libraries you want to be included - add base dependencies first,
	// everything else will be picked up by the last glob.
	// All paths are processed relative to JS_PATH.
	var libs = [
		'external/jquery/*min.js',
		'external/{,**/}*min.js'
	];

	var jsLibSourceMaps = [
		'external/angular/**/*.min.js.map'
	];

	// List of all our js assets
	var siteJSAssets = [
		// 'angular/*.js',
		// 'angular/{,**/}*.js',
		'site/{,**/}*.js'
	];


	// Processing of standalone files - autominify anything in a dir under
	// <baseInputPath>/standalone/site/<some dir> with the given inputFileExtension to
	// <baseOutputPath>/standalone/site/<dir name>/<dir name>.min.<outputFileExtension>
	function makeMinificationMap(baseInputPath, baseOutputPath, inputFileExtension, outputFileExtension) {
		return _.map(grunt.file.expand({
			'cwd': baseInputPath,
			'filter': function isNonEmptyDir(fullDirPath) {
				// TODO: convert to using isMatch
				return grunt.file.isDir(fullDirPath) &&
						grunt.file.expand(path.join(fullDirPath, '/{,**/}*.' + inputFileExtension)).length;
			}
		}, [
			'standalone/site/*'
		]), function (dirPath) {
			return {
				'src': grunt.file.expand(path.join(baseInputPath, dirPath, '{,**/}*.' + inputFileExtension)),
				'dest': path.join(baseOutputPath, dirPath, path.basename(dirPath) + '.min.' + outputFileExtension)
			};
		});
	}

	var standaloneJSMinifyFilesMap = makeMinificationMap(JS_PATH, JS_MIN_PATH, 'js', 'js');
	var standaloneCSSMinifyFilesMap = makeMinificationMap(CSS_PATH, CSS_MIN_PATH, 'less', 'css');

	grunt.registerTask('createIncludeFiles', function () {
		// Paths and ordering for the includes files
		var jsIncludes = grunt.file.expand({
			'cwd': JS_MIN_PATH
		}, [
			// Ensure libs are loaded in the correct order
			'external/{,**/}*.js',
			'site/{,**/}*.js'
		]);

		// If there are any css files that need to be loaded first,
		// include them here directly under css_min (ex: bootstrap.css)
		var styleIncludes = grunt.file.expand({
			'cwd': CSS_MIN_PATH
		}, [
			'external/{,**/}*.css',
			'site/{,**/}*.css'
		]);

		grunt.config.set('createFile', {
			'jsIncludes': {
				'content': (_.reduce(jsIncludes, function (total, curr) {
					return total + '<script type="text/javascript" src="' + SERVING_JS_PATH + curr + '?VERSION_SHOULD_GO_HERE"></script>\n';
				}, '')),
				'file': JS_INCLUDES_FILE_PATH
			},
			'styleIncludes': {
				'content': (_.reduce(styleIncludes, function (total, curr) {
					return total + '<link rel="stylesheet" type="text/css" href="' + SERVING_CSS_PATH + curr + '?VERSION_SHOULD_GO_HERE">\n';
				}, '')),
				'file': CSS_INCLUDES_FILE_PATH
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
			// For producing an unminified site.js file with all our js in it.
			// For a minified+concatenated file, see closureCompiler:site below
			'site': {
				'src': prefixPaths(JS_PATH, siteJSAssets),
				'dest': JS_MIN_PATH + 'site/site.min.js',
				'separator': ';'
			},
			// Concatenates all our libs together - no minification needed
			// since they're all minified already
			'libs': {
				'src': prefixPaths(JS_PATH, libs),
				'dest': JS_MIN_PATH + 'external/libs.min.js',
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
					'src': prefixPaths(JS_PATH, siteJSAssets),
					'dest': JS_MIN_PATH + 'site/site.min.js'
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
			// Minify our less files into udacity.css
			'production': {
				'files': [{
					'src': prefixPaths(CSS_PATH, stylesheets),
					'dest': CSS_MIN_PATH + 'site/site.min.css'
				}],
				'options': {
					'cleancss': true
				}
			},
			// Compile all the LESS in our css/ directory
			'development': {
				// All of our core files in css/udacity/
				'files': [{
					'src': stylesheets,
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
					'src': libs.concat(jsLibSourceMaps),
					'dest': JS_MIN_PATH,
					'cwd': JS_PATH,
					'expand': true
				}, {
					'src': siteJSAssets,
					'dest': path.join(JS_MIN_PATH, 'site/'),
					'cwd': JS_PATH,
					'expand': true
				}]
			},
			'standaloneJSLibs': {
				'files': [{
					'src': ['**'],
					'dest': path.join(JS_MIN_PATH, 'standalone/libs/'),
					'cwd': path.join(JS_PATH, 'standalone/libs/'),
					'expand': true
				}]
			},
			'standaloneCSSLibs': {
				'files': [{
					'src': ['**'],
					'dest': path.join(CSS_MIN_PATH, 'standalone/libs/'),
					'cwd': path.join(CSS_PATH, 'standalone/libs/'),
					'expand': true
				}]
			}
		},
		'clean': {
			'all': {
				'src': [
					JS_MIN_PATH,
					CSS_MIN_PATH,
					JS_INCLUDES_FILE_PATH,
					CSS_INCLUDES_FILE_PATH
				]
			},
			'standalone': {
				'src': [
					JS_MIN_PATH + 'standalone/',
					CSS_MIN_PATH + 'standalone/'
				]
			},
		},

		// Not used in the main build tasks
		//
		// Watch the source js and LESS files for changes. In order to use livereload
		// to automatically reload the post-build outputted files as well,
		// please use the livereload.js gruntfile and run it with `npm run livereload`.
		'watch': {
			'jsSource': {
				files: [JS_PATH + '**/*.js'],
				options: {
					spawn: false
				}
			},
			'lessSource': {
				files: [
					CSS_PATH + '**/*.less'
				],
				options: {
					spawn: false
				}
			}
		}
	});

	// Watch for all files changed in a 200ms timespan,
	// then run the necessary tasks to reprocess them
	var changedFiles = [];
	var doneHandler = null;
	var onChange = function () {
		// Helper functions
		var getChangedFileMaps = function (changedFilePaths, standaloneMinifyMaps,
					changedCoreFileProcessor) {
			var getChangedStandaloneFileMaps = function (changedFilePaths) {
				// Collect all standalone directories where something was changed
				return _.filter(standaloneMinifyMaps, function (standaloneFilesMapping) {
					// Go through each source file in the current standalone subdirectory
					return _.any(standaloneFilesMapping.src, function (standaloneFile) {
						// Return if the standaloneFile is one of the files that has changed
						// and needs to be rebuilt
						return _.any(changedFilePaths, function (changedFile) {
							return standaloneFile === changedFile;
						});
					});
				});
			};

			// changedCoreFileProcessor should be a function which, when given a list of changed
			// core files, returns a list of valid grunt file objects to use for processing
			var getChangedCoreFileMaps = function (changedFilePaths, changedCoreFileProcessor) {
				return changedCoreFileProcessor(_.reject(changedFilePaths, function (filePath) {
					return (/static\/[^\/]+\/standalone/).test(filePath);
				}));
			};

			return {
				standalone: getChangedStandaloneFileMaps(changedFilePaths, standaloneMinifyMaps),
				core: getChangedCoreFileMaps(changedFilePaths, changedCoreFileProcessor)
			};
		};

		// Only run if at least one file needs to be recompiled
		if (!changedFiles.length) {
			grunt.log.writeln('Skipping onChange handler due to no changed files');
		} else {
			grunt.log.subhead('recompiling. changed files: ');
			grunt.log.subhead(changedFiles);

			// If any LESS files were changed
			var changedLessFiles = _.filter(changedFiles, function (filePath) {
				return filePath.indexOf('.less') !== -1;
			});

			var changedJsFiles = _.filter(changedFiles, function (filePath) {
				return filePath.indexOf('.js') !== -1;
			});

			var changedLessFileMaps = getChangedFileMaps(changedLessFiles, standaloneCSSMinifyFilesMap,
					function (coreLessFilePaths) {
				return _.map(coreLessFilePaths, function (filePath) {
					return {
						'src': path.relative(CSS_PATH, filePath),
						'dest': CSS_MIN_PATH,
						'cwd': CSS_PATH,
						'expand': true,
						'ext': '.css'
					};
				});
			});
			var changedJsFileMaps = getChangedFileMaps(changedJsFiles, standaloneJSMinifyFilesMap,
					function (coreJsFilePaths) {
				return [{
					// Filter down to only the non-standalone js files
					'src': _.map(coreJsFilePaths, function (filePath) {
						return path.relative(JS_PATH, filePath);
					}),
					'dest': path.join(JS_MIN_PATH, 'udacity/'),
					'cwd': JS_PATH,
					'expand': true
				}];
			});

			console.log('changedJsFileMaps:');
			console.log(JSON.stringify(changedJsFileMaps, 2));
			console.log('changedLessFileMaps');
			console.log(JSON.stringify(changedLessFileMaps, 2));

			// Set (or clear) the files to be recompiled
			grunt.config.set('less.processChangedStyles', {
				'files': changedLessFileMaps.core.concat(changedLessFileMaps.standalone),
				'options': {
					'sourceMap': true,
					'outputSourceFiles': true
				}
			});
			grunt.config.set('copy.processChangedCoreJs', {
				'files': changedJsFileMaps.core
			});
			grunt.config.set('concat.processChangedStandaloneJs', {
				'files': changedJsFileMaps.standalone
			});

			// If there were changed files in /css/components,
			// they were likely imported somewhere but we can't tell where!
			// Thus, fall back to recompiling all the styles instead of
			// running the changed styles task.
			var lessProcessingTask = 'less:processChangedStyles';
			if (_.any(changedLessFiles, function (filePath) {
				return filePath.indexOf('css/components/') !== -1;
			})) {
				lessProcessingTask = 'styles';
			}

			// Push it!
			grunt.task.run(lessProcessingTask,
			'copy:processChangedCoreJs', 'concat:processChangedStandaloneJs');
		}

		// Clear state
		changedFiles = [];
		// Grab a reference to the done handler, clear the global version,
		// then signal this async task is done!
		var done = doneHandler;
		doneHandler = null;
		done();
	};
	var debouncedOnChange = _.debounce(onChange, fileWatcherBatchTimespan);
	grunt.registerTask('handleWatchEvent', function () {
			if (!doneHandler) {
				doneHandler = this.async();
			}
			debouncedOnChange();
	});
	grunt.event.on('watch', function (action, filepath) {
		if (filepath.indexOf('static/minified/') === -1) {
			// Track the changed files
			changedFiles.push(filepath);
			// If there's no done handler set up yet, register as async
			// and bind the handler so it can be called when the debounced
			// onChange actually runs. This ensures grunt actually runs
			// the tasks at the end of onChange.
			grunt.task.run('handleWatchEvent');
		}
	});

	// ==================
	// = Internal Tasks =
	// ==================

	// Minifies and concatenates our js files and produces a js includes template referencing the catted file
	grunt.registerTask('processJS', 'Minifies and concatenates our js files and produces a js includes template referencing the catted file',
			['concat:libs', 'closureCompiler:site', 'closureCompiler:standalone', 'copy:standaloneJSLibs']);

	// Compiles and creates the minified CSS files and their dependencies
	grunt.registerTask('processStyles', 'Compiles and creates the minified CSS files and their dependencies',
			['less:production', 'copy:standaloneCSSLibs', 'less:standaloneCSSProduction']);

	// All JS/LESS and their libs in the standalone folders
	grunt.registerTask('standalone', 'Builds all js/less assets in js/standalone and css/standalone',
			['concat:standaloneJSDevelopment', 'copy:standaloneJSLibs',
					'copy:standaloneCSSLibs', 'less:standaloneCSSDevelopment']);

	// ================
	// = Public Tasks =
	// ================

	// Compiles+mins+cats all JS and LESS and their dependency assets
	grunt.registerTask('default', 'Compiles+mins+cats all JS and LESS and their dependency assets', [
		'clean:all',
		'processJS',
		'processStyles',
		'createIncludeFiles'
	]);

	// Copies over the JS without minifying it, compiles the LESS and dependency assets
	grunt.registerTask('dev', 'Copies over the JS without minifying/catting it, compiles the LESS and dependency assets', [
		'clean:all',
		'copy:js',
		'concat:standaloneJSDevelopment',
		'copy:standaloneJSLibs',
		'copy:standaloneCSSLibs',
		'less:development',
		'createIncludeFiles'
	]);

	// Runs the dev build and then watches for changes and automatically rebuilds less/js
	grunt.registerTask('devwatch', ['dev', 'watch']);


	// ===================================================================
	// = Specialized Public Build Tasks for Speeding up Live-Reload Time =
	// ===================================================================

	// Copies over the JS (except homepage js) without minifying it -- great for use with livereload
	grunt.registerTask('js', 'Copies over the just JS, without minifying/catting it.', [
		'copy:js',
		'concat:standaloneJSDevelopment',
		'copy:standaloneJSLibs',
		'createIncludeFiles'
	]);

	// Just compiles the styles over again except for homepage styles -- great for use with LiveReload
	grunt.registerTask('styles', 'compiles the LESS and dependency assets', [
		'less:development',
		'copy:standaloneCSSLibs'
	]);

	grunt.registerTask('dev_standalone', 'compiles LESS and JS in /css/standalone and /js/standalone only.' +
		'Does not clean or update the rest of the minified site assets.', [
			'clean:standalone',
			'standalone'
	]);

	grunt.registerTask('dev_standalone_styles', 'recompiles LESS and updates minified css files ' +
		'for standalone. Does not clean anything -- this is unsafe to use when files ' +
		'are added/removed.', [
			'less:standaloneCSSDevelopment'
	]);

};
