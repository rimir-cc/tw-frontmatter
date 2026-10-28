/*\
title: $:/plugins/rimir/frontmatter/document.js
type: application/javascript
module-type: library

Parses and builds frontmatter documents (--- YAML --- body).
Both directions invoke a hook so other plugins (e.g. rimir/okf) can take over
the mapping between YAML and tiddler fields:

* th-frontmatter-parse(fields, info) -> fields
* th-frontmatter-serialize(yamlText, tiddler, info) -> yamlText

startup.js additionally invokes th-frontmatter-fileinfo(fileInfo, tiddler, options)
-> fileInfo when choosing the file of a tiddler saved as frontmatter.

\*/

"use strict";

var yaml = require("$:/plugins/rimir/frontmatter/yaml.js");

var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
var TW_DATE_RE = /^\-?\d{17,}$/;
var DATE_FIELDS = {"created": true, "modified": true};

exports.DEFAULT_TYPE = yaml.DEFAULT_TYPE;

exports.hasFrontmatter = function(text) {
	return FRONTMATTER_RE.test(text || "");
};

/**
 * Normalize a date string to TW format (YYYYMMDDHHMMSSmmm).
 * Accepts TW format (passthrough), ISO 8601, or JS Date.toString() format.
 */
var normalizeDate = exports.normalizeDate = function(value) {
	if(!value) {
		return value;
	}
	// Already in TW format
	if(TW_DATE_RE.test(value)) {
		return value;
	}
	// Try parsing as a JS date string
	var d = new Date(value);
	if(!isNaN(d.getTime())) {
		return $tw.utils.stringifyDate(d);
	}
	return value;
};

/**
 * Parse a frontmatter document into `fields` (which may carry preset fields).
 * info: {filepath, pathTitle} — both optional, passed on to the parse hook.
 * Returns the resulting fields object.
 */
exports.parse = function(text, fields, info) {
	info = info || {};
	var match = FRONTMATTER_RE.exec(text);
	if(match) {
		var parsed = yaml.parse(match[1]);
		for(var key in parsed) {
			// Normalize date fields to TW format
			if(DATE_FIELDS[key]) {
				parsed[key] = normalizeDate(parsed[key]);
			}
			fields[key] = parsed[key];
		}
		fields.text = match[2];
		fields = $tw.hooks.invokeHook("th-frontmatter-parse", fields, {
			yaml: match[1],
			body: match[2],
			parsed: parsed,
			filepath: info.filepath,
			pathTitle: info.pathTitle
		});
	} else {
		fields.text = text;
	}
	if(!fields.type) {
		fields.type = yaml.DEFAULT_TYPE;
	}
	return fields;
};

/**
 * Build the file content for a tiddler.
 * info: {fileInfo, pathTitle} — passed on to the serialize hook.
 */
exports.build = function(tiddler, info) {
	var yamlText = yaml.serialize(tiddler.fields);
	yamlText = $tw.hooks.invokeHook("th-frontmatter-serialize", yamlText, tiddler, info || {});
	return "---\n" + yamlText + "\n---\n" + (tiddler.fields.text || "");
};
