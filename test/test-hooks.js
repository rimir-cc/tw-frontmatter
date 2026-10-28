/*\
title: $:/plugins/rimir/frontmatter/test/test-hooks.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the th-frontmatter-parse / th-frontmatter-serialize extension hooks.

\*/
"use strict";

var helpers = require("$:/plugins/rimir/frontmatter/test/helpers.js");

var doc = require("$:/plugins/rimir/frontmatter/document.js");

describe("frontmatter hooks", function() {

	helpers.isolateHooks(beforeEach, afterEach);

	var hooks;

	function addHook(name, fn) {
		$tw.hooks.addHook(name, fn);
		hooks.push([name, fn]);
	}

	beforeEach(function() {
		hooks = [];
	});

	afterEach(function() {
		hooks.forEach(function(h) {
			$tw.hooks.removeHook(h[0], h[1]);
		});
	});

	it("should pass fields and raw document parts to th-frontmatter-parse", function() {
		var seen;
		addHook("th-frontmatter-parse", function(fields, info) {
			seen = {fields: $tw.utils.extend({}, fields), info: info};
			return fields;
		});
		doc.parse("---\na: 1\nnested:\n  x: y\n---\nBody", {}, {filepath: "/w/tiddlers/x.md", pathTitle: "x"});
		expect(seen.fields.a).toBe("1");
		expect(seen.fields.text).toBe("Body");
		expect(seen.info.yaml).toBe("a: 1\nnested:\n  x: y");
		expect(seen.info.body).toBe("Body");
		expect(seen.info.parsed.a).toBe("1");
		expect(seen.info.filepath).toBe("/w/tiddlers/x.md");
		expect(seen.info.pathTitle).toBe("x");
	});

	it("should use the fields returned by th-frontmatter-parse", function() {
		addHook("th-frontmatter-parse", function(fields, info) {
			return {title: "Replaced", text: info.body, type: "text/markdown"};
		});
		var fields = $tw.wiki.deserializeTiddlers("text/x-frontmattered-markdown", "---\na: 1\n---\nBody", {})[0];
		expect(fields.title).toBe("Replaced");
		expect(fields.a).toBeUndefined();
		expect(fields.type).toBe("text/markdown");
	});

	it("should not invoke th-frontmatter-parse for text without frontmatter", function() {
		var called = false;
		addHook("th-frontmatter-parse", function(fields) {
			called = true;
			return fields;
		});
		var fields = doc.parse("plain", {});
		expect(called).toBe(false);
		expect(fields.text).toBe("plain");
		expect(fields.type).toBe(doc.DEFAULT_TYPE);
	});

	it("should let th-frontmatter-serialize replace the YAML", function() {
		var seen;
		addHook("th-frontmatter-serialize", function(yamlText, tiddler, info) {
			seen = {yamlText: yamlText, title: tiddler.fields.title, info: info};
			return "custom: yes";
		});
		var tiddler = new $tw.Tiddler({title: "T", caption: "C", text: "Body"});
		var content = doc.build(tiddler, {pathTitle: "T"});
		expect(content).toBe("---\ncustom: yes\n---\nBody");
		expect(seen.yamlText).toContain("caption: C");
		expect(seen.title).toBe("T");
		expect(seen.info.pathTitle).toBe("T");
	});
	if($tw.node) {
		it("should let th-frontmatter-fileinfo change the file of a frontmatter tiddler", function() {
			addHook("th-frontmatter-fileinfo", function(fileInfo, tiddler, options) {
				fileInfo.filepath = options.directory + "/custom.md";
				return fileInfo;
			});
			var md = $tw.utils.generateTiddlerFileInfo(new $tw.Tiddler({title: "A", type: "text/markdown"}), {directory: "/w", wiki: $tw.wiki});
			var tid = $tw.utils.generateTiddlerFileInfo(new $tw.Tiddler({title: "B", type: "text/vnd.tiddlywiki"}), {directory: "/w", wiki: $tw.wiki});
			expect(md.filepath).toBe("/w/custom.md");
			expect(tid.filepath).not.toBe("/w/custom.md");
		});
	}
});
