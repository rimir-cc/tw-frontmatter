/*\
title: $:/plugins/rimir/frontmatter/test/helpers.js
type: application/javascript
module-type: library

Shared helpers for the frontmatter specs.

\*/
"use strict";

var HOOK_NAMES = ["th-frontmatter-parse", "th-frontmatter-serialize", "th-frontmatter-fileinfo"];

/**
 * Call inside a describe(): runs its specs without hooks registered by other
 * plugins (e.g. rimir/okf), so frontmatter is tested on its own.
 * Jasmine's globals are passed in — library modules don't see them.
 */
exports.isolateHooks = function(beforeEach, afterEach) {
	var saved;
	beforeEach(function() {
		saved = {};
		HOOK_NAMES.forEach(function(name) {
			saved[name] = $tw.hooks.names[name];
			$tw.hooks.names[name] = [];
		});
	});
	afterEach(function() {
		HOOK_NAMES.forEach(function(name) {
			$tw.hooks.names[name] = saved[name] || [];
		});
	});
};
