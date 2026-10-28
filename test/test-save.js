/*\
title: $:/plugins/rimir/frontmatter/test/test-save.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the patched save pipeline (generateTiddlerFileInfo + saveTiddlerToFileSync).
Node only — exercises real file writes in a temp directory.

\*/
"use strict";

var helpers = require("$:/plugins/rimir/frontmatter/test/helpers.js");

if($tw.node) {

var fs = require("fs");
var os = require("os");
var path = require("path");

describe("frontmatter save pipeline", function() {

	helpers.isolateHooks(beforeEach, afterEach);

	var dir;

	beforeEach(function() {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-save-"));
	});

	afterEach(function() {
		fs.rmSync(dir, {recursive: true, force: true});
	});

	// existingInfo mimics the boot.files entry the filesystem adaptor passes for a known tiddler
	function save(fields, existingInfo) {
		var tiddler = new $tw.Tiddler(fields);
		var fileInfo = $tw.utils.generateTiddlerFileInfo(tiddler, {directory: dir, wiki: $tw.wiki, fileInfo: existingInfo});
		$tw.utils.saveTiddlerToFileSync(tiddler, fileInfo);
		return fileInfo;
	}

	["text/x-frontmattered-markdown", "text/markdown", "text/x-markdown"].forEach(function(type) {

		it("should save " + type + " as a single .md file with frontmatter", function() {
			var fileInfo = save({title: "Doc", type: type, caption: "Cap", text: "# Body"});
			expect(fileInfo.hasMetaFile).toBe(false);
			expect(path.extname(fileInfo.filepath)).toBe(".md");
			expect(fs.existsSync(fileInfo.filepath + ".meta")).toBe(false);
			var content = fs.readFileSync(fileInfo.filepath, "utf8");
			expect(content).toMatch(/^---\n/);
			expect(content).toContain("caption: Cap");
			expect(content).toContain("title: Doc");
			expect(content).toMatch(/\n---\n# Body$/);
		});

		it("should round-trip " + type + " through the deserializer", function() {
			var fileInfo = save({title: "Doc", type: type, caption: "Cap", text: "# Body"});
			var content = fs.readFileSync(fileInfo.filepath, "utf8");
			var fields = $tw.wiki.deserializeTiddlers("text/x-frontmattered-markdown", content, {})[0];
			expect(fields.title).toBe("Doc");
			expect(fields.type).toBe(type);
			expect(fields.caption).toBe("Cap");
			expect(fields.text).toBe("# Body");
		});
	});

	it("should keep fields of a tiddler with empty text", function() {
		var fileInfo = save({title: "Empty", type: "text/markdown", caption: "Only a caption"});
		var content = fs.readFileSync(fileInfo.filepath, "utf8");
		expect(content).toContain("caption: Only a caption");
		expect(fs.existsSync(fileInfo.filepath + ".meta")).toBe(false);
	});

	it("should remove a pre-existing .md.meta sidecar", function() {
		var mdPath = path.join(dir, "Old.md");
		fs.writeFileSync(mdPath, "# old");
		fs.writeFileSync(mdPath + ".meta", "title: Old\ntype: text/markdown\n");
		var fileInfo = save({title: "Old", type: "text/markdown", text: "# new"},
			{filepath: mdPath, type: "text/markdown", hasMetaFile: true});
		expect(fileInfo.filepath).toBe(mdPath);
		expect(fs.existsSync(mdPath + ".meta")).toBe(false);
		expect(fs.readFileSync(mdPath, "utf8")).toContain("type: text/markdown");
	});

	it("should leave other types to core", function() {
		var fileInfo = save({title: "Plain", type: "text/vnd.tiddlywiki", text: "x"});
		expect(path.extname(fileInfo.filepath)).toBe(".tid");
	});
});

}
