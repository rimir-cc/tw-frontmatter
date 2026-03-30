/*\
title: $:/plugins/rimir/frontmatter/deserializer.js
type: application/javascript
module-type: tiddlerdeserializer

Deserializes markdown files with YAML frontmatter (text/x-frontmattered-markdown).
Frontmatter is delimited by --- lines. Fields are parsed as YAML key-value pairs.

\*/

"use strict";

var yaml = require("$:/plugins/rimir/frontmatter/yaml.js");

var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
var TW_DATE_RE = /^\-?\d{17,}$/;
var DATE_FIELDS = {"created": true, "modified": true};

/**
 * Normalize a date string to TW format (YYYYMMDDHHMMSSmmm).
 * Accepts TW format (passthrough), ISO 8601, or JS Date.toString() format.
 */
function normalizeDate(value) {
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
}

exports["text/x-frontmattered-markdown"] = function(text, fields) {
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
	} else {
		fields.text = text;
	}
	if(!fields.type) {
		fields.type = "text/x-frontmattered-markdown";
	}
	return [fields];
};
