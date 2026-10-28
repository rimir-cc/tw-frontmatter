/*\
title: $:/plugins/rimir/frontmatter/deserializer.js
type: application/javascript
module-type: tiddlerdeserializer

Deserializes markdown files with YAML frontmatter (text/x-frontmattered-markdown).
Frontmatter is delimited by --- lines; parsing lives in document.js.

\*/

"use strict";

var doc = require("$:/plugins/rimir/frontmatter/document.js");

exports["text/x-frontmattered-markdown"] = function(text, fields) {
	return [doc.parse(text, fields)];
};
