/*\
title: $:/plugins/rimir/frontmatter/test/test-deserializer.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the frontmatter deserializer module.

\*/
"use strict";

describe("frontmatter deserializer", function() {

	var deserialize;

	beforeEach(function() {
		deserialize = $tw.Wiki.tiddlerDeserializerModules["text/x-frontmattered-markdown"];
	});

	it("should be registered as a deserializer", function() {
		expect(deserialize).toBeDefined();
		expect(typeof deserialize).toBe("function");
	});

	it("should parse frontmatter fields into tiddler fields", function() {
		var text = "---\ntitle: My Tiddler\nauthor: rimir\n---\nBody text here.";
		var fields = {};
		var result = deserialize(text, fields);
		expect(result.length).toBe(1);
		expect(fields.title).toBe("My Tiddler");
		expect(fields.author).toBe("rimir");
		expect(fields.text).toBe("Body text here.");
	});

	it("should set type to text/x-frontmattered-markdown by default", function() {
		var text = "---\ntitle: Test\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.type).toBe("text/x-frontmattered-markdown");
	});

	it("should not override existing type field from frontmatter", function() {
		var text = "---\ntitle: Test\ntype: text/x-markdown\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.type).toBe("text/x-markdown");
	});

	it("should handle text without frontmatter", function() {
		var text = "Just plain markdown without frontmatter.";
		var fields = {};
		var result = deserialize(text, fields);
		expect(result.length).toBe(1);
		expect(fields.text).toBe("Just plain markdown without frontmatter.");
		expect(fields.title).toBeUndefined();
	});

	it("should handle empty body after frontmatter", function() {
		var text = "---\ntitle: Empty Body\n---\n";
		var fields = {};
		deserialize(text, fields);
		expect(fields.title).toBe("Empty Body");
		expect(fields.text).toBe("");
	});

	it("should handle multiline body after frontmatter", function() {
		var text = "---\ntitle: Multi\n---\nLine 1\nLine 2\nLine 3";
		var fields = {};
		deserialize(text, fields);
		expect(fields.text).toBe("Line 1\nLine 2\nLine 3");
	});

	it("should handle Windows line endings in frontmatter", function() {
		var text = "---\r\ntitle: Windows\r\nauthor: test\r\n---\r\nBody here.";
		var fields = {};
		deserialize(text, fields);
		expect(fields.title).toBe("Windows");
		expect(fields.author).toBe("test");
	});

	it("should parse tags from frontmatter YAML arrays", function() {
		var text = "---\ntitle: Tagged\ntags:\n  - TagA\n  - Tag With Space\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.tags).toBe("TagA [[Tag With Space]]");
	});

	it("should normalize ISO date strings to TW format", function() {
		var text = "---\ntitle: Dated\ncreated: 2025-03-15T14:30:00Z\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		// Should be converted to TW date format
		expect(fields.created).toMatch(/^\d{17}$/);
	});

	it("should pass through TW-format dates unchanged", function() {
		var text = "---\ntitle: Dated\ncreated: 20250315143000000\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.created).toBe("20250315143000000");
	});

	it("should normalize modified field dates", function() {
		var text = "---\ntitle: Dated\nmodified: 2025-01-01T00:00:00Z\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.modified).toMatch(/^\d{17}$/);
	});

	it("should not normalize non-date fields", function() {
		var text = "---\ntitle: Test\nauthor: 2025-01-01\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.author).toBe("2025-01-01");
	});

	it("should handle frontmatter with no trailing newline after closing ---", function() {
		var text = "---\ntitle: NoTrail\n---\nBody text";
		var fields = {};
		deserialize(text, fields);
		expect(fields.title).toBe("NoTrail");
		expect(fields.text).toBe("Body text");
	});

	it("should handle frontmatter with only --- delimiters", function() {
		var text = "---\n\n---\nBody";
		var fields = {};
		deserialize(text, fields);
		expect(fields.text).toBe("Body");
	});

	it("should handle body containing --- lines (not at start)", function() {
		var text = "---\ntitle: Test\n---\nSome text\n---\nMore text";
		var fields = {};
		deserialize(text, fields);
		expect(fields.title).toBe("Test");
		expect(fields.text).toBe("Some text\n---\nMore text");
	});
});
