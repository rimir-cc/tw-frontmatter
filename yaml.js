/*\
title: $:/plugins/rimir/frontmatter/yaml.js
type: application/javascript
module-type: library

Minimal YAML parser/serializer for flat tiddler field maps.
Handles string values and arrays (for tags). No nested objects.

\*/

"use strict";

/**
 * Characters that require quoting in YAML values.
 */
var NEEDS_QUOTING = /[:#\[\]{}&*!|>'"%@`\r\n]|^[\s-]|[\s]$/;

/**
 * Parse a YAML frontmatter string into a fields object.
 * Supports simple key: value pairs and array values (- item lines).
 */
exports.parse = function(yamlText) {
	var fields = Object.create(null);
	var lines = yamlText.split(/\r?\n/);
	var currentKey = null;
	var arrayValues = null;
	for(var i = 0; i < lines.length; i++) {
		var line = lines[i];
		// Skip empty lines and comments
		if(line.trim() === "" || line.charAt(0) === "#") {
			continue;
		}
		// Check for array item (indented with "- ")
		var arrayMatch = /^[ \t]+- (.*)$/.exec(line);
		if(arrayMatch && currentKey) {
			if(!arrayValues) {
				arrayValues = [];
			}
			arrayValues.push(unquote(arrayMatch[1].trim()));
			continue;
		}
		// Flush previous array if any
		if(currentKey && arrayValues) {
			fields[currentKey] = arrayToTiddlyWikiList(currentKey, arrayValues);
			arrayValues = null;
		}
		// Parse key: value
		var colonPos = line.indexOf(":");
		if(colonPos === -1) {
			continue;
		}
		currentKey = line.substring(0, colonPos).trim();
		var rawValue = line.substring(colonPos + 1).trim();
		if(rawValue === "") {
			// Value might be on following lines (array or multi-line)
			arrayValues = null;
			// Don't set fields yet — wait to see if array items follow
			continue;
		}
		fields[currentKey] = unquote(rawValue);
		currentKey = null;
		arrayValues = null;
	}
	// Flush final array
	if(currentKey && arrayValues) {
		fields[currentKey] = arrayToTiddlyWikiList(currentKey, arrayValues);
	}
	return fields;
};

/**
 * Serialize a tiddler fields object to YAML frontmatter string.
 * Excludes "text" and "bag" fields.
 */
exports.serialize = function(fields) {
	var lines = [];
	var keys = Object.keys(fields).sort();
	for(var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if(key === "title" || key === "text" || key === "type" || key === "bag") {
			continue;
		}
		var value = fields[key];
		// Handle array fields (tags, list) — serialize as YAML arrays
		if(Array.isArray(value)) {
			if(value.length > 0) {
				lines.push(key + ":");
				for(var a = 0; a < value.length; a++) {
					lines.push("  - " + quote(String(value[a])));
				}
			}
			continue;
		}
		if(value instanceof Date) {
			value = $tw.utils.stringifyDate(value);
		} else if(typeof value !== "string") {
			value = String(value);
		}
		// String-form tags/list: parse and serialize as YAML array
		if((key === "tags" || key === "list") && value) {
			var items = $tw.utils.parseStringArray(value);
			if(items && items.length > 0) {
				lines.push(key + ":");
				for(var s = 0; s < items.length; s++) {
					lines.push("  - " + quote(items[s]));
				}
				continue;
			}
		}
		lines.push(key + ": " + quote(value));
	}
	return lines.join("\n");
};

/**
 * Remove surrounding quotes from a YAML value.
 */
function unquote(value) {
	if(value.length >= 2) {
		if((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
		   (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) {
			return value.substring(1, value.length - 1);
		}
	}
	return value;
}

/**
 * Quote a YAML value if it contains special characters.
 */
function quote(value) {
	if(value === "") {
		return '""';
	}
	if(NEEDS_QUOTING.test(value)) {
		return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
	}
	return value;
}

/**
 * Convert an array of values to a TiddlyWiki string list.
 * For "tags" and "list" fields, uses TW's [[double bracket]] syntax for items with spaces.
 */
function arrayToTiddlyWikiList(fieldName, values) {
	if(fieldName === "tags" || fieldName === "list") {
		var parts = [];
		for(var i = 0; i < values.length; i++) {
			var v = values[i];
			if(v.indexOf(" ") !== -1) {
				parts.push("[[" + v + "]]");
			} else {
				parts.push(v);
			}
		}
		return parts.join(" ");
	}
	// For other array fields, just join with spaces
	return values.join(" ");
}
