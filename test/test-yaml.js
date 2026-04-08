/*\
title: $:/plugins/rimir/frontmatter/test/test-yaml.js
type: application/javascript
tags: [[$:/tags/test-spec]]

Tests for the frontmatter YAML parser/serializer library.

\*/
"use strict";

var yaml = require("$:/plugins/rimir/frontmatter/yaml.js");

describe("frontmatter yaml.parse", function() {

	it("should parse simple key-value pairs", function() {
		var result = yaml.parse("title: My Tiddler\nauthor: rimir");
		expect(result.title).toBe("My Tiddler");
		expect(result.author).toBe("rimir");
	});

	it("should parse quoted values with double quotes", function() {
		var result = yaml.parse('description: "A tiddler with: colons"');
		expect(result.description).toBe("A tiddler with: colons");
	});

	it("should parse quoted values with single quotes", function() {
		var result = yaml.parse("description: 'A tiddler with: colons'");
		expect(result.description).toBe("A tiddler with: colons");
	});

	it("should parse array values", function() {
		var result = yaml.parse("tags:\n  - TagA\n  - TagB\n  - TagC");
		expect(result.tags).toBe("TagA TagB [[TagC]]".replace("[[TagC]]", "TagC"));
		// tags field gets joined as TW list
		expect(result.tags).toContain("TagA");
		expect(result.tags).toContain("TagB");
	});

	it("should wrap array items with spaces in double brackets for tags", function() {
		var result = yaml.parse("tags:\n  - Simple\n  - Has Space");
		expect(result.tags).toBe("Simple [[Has Space]]");
	});

	it("should wrap array items with spaces in double brackets for list", function() {
		var result = yaml.parse("list:\n  - one\n  - two words");
		expect(result.list).toBe("one [[two words]]");
	});

	it("should join array values with spaces for non-tags/list fields", function() {
		var result = yaml.parse("custom:\n  - a\n  - b\n  - c");
		expect(result.custom).toBe("a b c");
	});

	it("should skip empty lines", function() {
		var result = yaml.parse("title: Test\n\nauthor: rimir");
		expect(result.title).toBe("Test");
		expect(result.author).toBe("rimir");
	});

	it("should skip comment lines", function() {
		var result = yaml.parse("# This is a comment\ntitle: Test");
		expect(result.title).toBe("Test");
		expect(Object.keys(result).length).toBe(1);
	});

	it("should skip lines without colons", function() {
		var result = yaml.parse("title: Test\nno-colon-here\nauthor: rimir");
		expect(result.title).toBe("Test");
		expect(result.author).toBe("rimir");
	});

	it("should handle empty value (key with no value after colon)", function() {
		var result = yaml.parse("title: Test\nempty:\nnext: value");
		expect(result.title).toBe("Test");
		expect(result.next).toBe("value");
		// empty key without array items following is not set
	});

	it("should handle Windows line endings", function() {
		var result = yaml.parse("title: Test\r\nauthor: rimir");
		expect(result.title).toBe("Test");
		expect(result.author).toBe("rimir");
	});

	it("should return empty object for empty input", function() {
		var result = yaml.parse("");
		expect(Object.keys(result).length).toBe(0);
	});

	it("should handle values containing colons", function() {
		var result = yaml.parse("url: http://example.com:8080/path");
		expect(result.url).toBe("http://example.com:8080/path");
	});

	it("should handle array followed by key-value", function() {
		var result = yaml.parse("tags:\n  - A\n  - B\nauthor: rimir");
		expect(result.tags).toBe("A B");
		expect(result.author).toBe("rimir");
	});

	it("should unquote array items", function() {
		var result = yaml.parse('tags:\n  - "Quoted Tag"\n  - plain');
		expect(result.tags).toBe("[[Quoted Tag]] plain");
	});

	it("should handle trailing array at end of input", function() {
		var result = yaml.parse("tags:\n  - X\n  - Y");
		expect(result.tags).toBe("X Y");
	});
});

describe("frontmatter yaml.serialize", function() {

	it("should serialize simple fields", function() {
		var result = yaml.serialize({author: "rimir", caption: "Test"});
		expect(result).toContain("author: rimir");
		expect(result).toContain("caption: Test");
	});

	it("should exclude title, text, type, and bag fields", function() {
		var result = yaml.serialize({
			title: "MyTitle", text: "body", type: "text/x-frontmattered-markdown",
			bag: "default", author: "rimir"
		});
		expect(result).not.toContain("title:");
		expect(result).not.toContain("text:");
		expect(result).not.toContain("type:");
		expect(result).not.toContain("bag:");
		expect(result).toContain("author: rimir");
	});

	it("should sort keys alphabetically", function() {
		var result = yaml.serialize({zoo: "z", alpha: "a", mid: "m"});
		var lines = result.split("\n");
		expect(lines[0]).toBe("alpha: a");
		expect(lines[1]).toBe("mid: m");
		expect(lines[2]).toBe("zoo: z");
	});

	it("should serialize array fields as YAML arrays", function() {
		var result = yaml.serialize({tags: ["TagA", "TagB"]});
		expect(result).toContain("tags:");
		expect(result).toContain("  - TagA");
		expect(result).toContain("  - TagB");
	});

	it("should skip empty arrays", function() {
		var result = yaml.serialize({tags: []});
		expect(result).toBe("");
	});

	it("should serialize string tags as YAML arrays", function() {
		var result = yaml.serialize({tags: "TagA TagB"});
		expect(result).toContain("tags:");
		expect(result).toContain("  - TagA");
		expect(result).toContain("  - TagB");
	});

	it("should serialize string list field as YAML arrays", function() {
		var result = yaml.serialize({list: "one two three"});
		expect(result).toContain("list:");
		expect(result).toContain("  - one");
		expect(result).toContain("  - two");
		expect(result).toContain("  - three");
	});

	it("should quote values with special characters", function() {
		var result = yaml.serialize({desc: "has: colon"});
		expect(result).toContain('desc: "has: colon"');
	});

	it("should quote empty string values", function() {
		var result = yaml.serialize({empty: ""});
		expect(result).toContain('empty: ""');
	});

	it("should convert non-string values to strings", function() {
		var result = yaml.serialize({num: 42});
		expect(result).toContain("num: 42");
	});

	it("should serialize TW date strings as-is", function() {
		var result = yaml.serialize({created: "20250101120000000"});
		expect(result).toContain("created: 20250101120000000");
	});

	it("should quote values starting with special YAML characters", function() {
		var result = yaml.serialize({note: "- list item"});
		expect(result).toContain('note: "- list item"');
	});

	it("should quote values starting with whitespace", function() {
		var result = yaml.serialize({val: " leading space"});
		expect(result).toContain('val: " leading space"');
	});

	it("should serialize tags with spaces as unquoted YAML array items", function() {
		var result = yaml.serialize({tags: "Simple [[Has Space]]"});
		expect(result).toContain("  - Has Space");
		expect(result).toContain("  - Simple");
	});
});

describe("frontmatter yaml round-trip", function() {

	it("should round-trip simple fields", function() {
		var original = {author: "rimir", caption: "My Caption"};
		var serialized = yaml.serialize(original);
		var parsed = yaml.parse(serialized);
		expect(parsed.author).toBe("rimir");
		expect(parsed.caption).toBe("My Caption");
	});

	it("should round-trip tags with spaces", function() {
		var serialized = yaml.serialize({tags: "Simple [[Tag With Spaces]]"});
		var parsed = yaml.parse(serialized);
		expect(parsed.tags).toBe("Simple [[Tag With Spaces]]");
	});

	it("should round-trip values with colons", function() {
		var serialized = yaml.serialize({url: "http://example.com:8080"});
		var parsed = yaml.parse(serialized);
		expect(parsed.url).toBe("http://example.com:8080");
	});

	it("should round-trip TW date strings", function() {
		var serialized = yaml.serialize({modified: "20250315143000000"});
		var parsed = yaml.parse(serialized);
		expect(parsed.modified).toBe("20250315143000000");
	});
});
