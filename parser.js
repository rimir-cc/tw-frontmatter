/*\
title: $:/plugins/rimir/frontmatter/parser.js
type: application/javascript
module-type: parser

Maps text/x-frontmattered-markdown to the existing markdown parser.

\*/

"use strict";

var mdModule = require("$:/plugins/tiddlywiki/markdown/wrapper.js");

if(mdModule && mdModule["text/x-markdown"]) {
	exports["text/x-frontmattered-markdown"] = mdModule["text/x-markdown"];
}
