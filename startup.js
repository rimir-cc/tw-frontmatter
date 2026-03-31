/*\
title: $:/plugins/rimir/frontmatter/startup.js
type: application/javascript
module-type: startup

Registers content type, patches save pipeline for frontmatter markdown files,
and re-parses any .md files with frontmatter that were loaded at boot before
the deserializer was available.

\*/

"use strict";

exports.name = "frontmatter";
exports.after = ["load-modules"];
exports.before = ["startup","filesystem-watcher"];
exports.synchronous = true;

var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
var FILE_ON_DISK_TYPE = "application/x-tiddler-frontmatter";
var CONTENT_TYPE = "text/x-frontmattered-markdown";

exports.startup = function() {
	// --- A. Register content type and parser mapping (runs on all platforms) ---

	$tw.config.contentTypeInfo[CONTENT_TYPE] = {
		encoding: "utf8",
		extension: ".md",
		flags: [],
		deserializerType: CONTENT_TYPE
	};

	// Everything below is Node.js only (file I/O)
	if(!$tw.node) {
		return;
	}

	var path = require("path");
	var fs = require("fs");
	var yaml = require("$:/plugins/rimir/frontmatter/yaml.js");

	var logger = new $tw.utils.Logger("frontmatter", {colour: "cyan"});

	// --- B. Re-parse boot-loaded .md files with frontmatter ---

	if($tw.boot.files) {
		var titlesToReparse = [];
		$tw.utils.each($tw.boot.files, function(fileInfo, title) {
			if(fileInfo.hasMetaFile) {
				return;
			}
			if(path.extname(fileInfo.filepath) !== ".md") {
				return;
			}
			// Read the file and check for YAML frontmatter pattern
			try {
				var content = fs.readFileSync(fileInfo.filepath, "utf8");
				if(FRONTMATTER_RE.test(content)) {
					titlesToReparse.push({
						oldTitle: title,
						filepath: fileInfo.filepath,
						content: content
					});
				}
			} catch(e) {
				// File may have been deleted — skip
			}
		});
		var tiddlersPath = path.resolve($tw.boot.wikiTiddlersPath || path.join($tw.boot.wikiPath, "tiddlers"));
		var reparsedCount = 0;
		// Suppress change events during re-parse so the syncer doesn't
		// delete original files and re-save them with TW serialization
		var origEnqueue = $tw.wiki.enqueueTiddlerEvent;
		$tw.wiki.enqueueTiddlerEvent = function() {};
		for(var i = 0; i < titlesToReparse.length; i++) {
			var item = titlesToReparse[i];
			var tiddlerList = $tw.wiki.deserializeTiddlers(CONTENT_TYPE, item.content, {});
			if(tiddlerList.length > 0) {
				var newFields = tiddlerList[0];
				// Determine title: frontmatter title > existing clean title > derive from filepath
				var newTitle = newFields.title;
				if(!newTitle) {
					if(path.isAbsolute(item.oldTitle)) {
						// Boot assigned an absolute filepath as title — derive clean relative title
						var rel = path.relative(tiddlersPath, item.filepath);
						newTitle = rel.replace(/\.md$/, "").split(path.sep).join("/");
					} else {
						// Already has a clean title (e.g., from tiddlywiki.files) — keep it
						newTitle = item.oldTitle;
					}
				}
				newFields.title = newTitle;
				// Remove old tiddler, add new one (change events suppressed)
				if(item.oldTitle !== newTitle) {
					$tw.wiki.deleteTiddler(item.oldTitle);
					delete $tw.boot.files[item.oldTitle];
				}
				$tw.wiki.addTiddler(new $tw.Tiddler(newFields));
				$tw.boot.files[newTitle] = {
					filepath: item.filepath,
					type: CONTENT_TYPE,
					hasMetaFile: false
				};
				reparsedCount++;
			}
		}
		// Restore change events
		$tw.wiki.enqueueTiddlerEvent = origEnqueue;
		if(reparsedCount > 0) {
			logger.log("Re-parsed " + reparsedCount + " frontmatter .md files");
		}
		// --- B2. Re-parse markdown tiddlers loaded via tiddlywiki.files (not in boot.files) ---
		var wikiToReparse = [];
		$tw.wiki.each(function(tiddler, title) {
			if($tw.boot.files[title]) {
				return; // Already handled above
			}
			var text = tiddler.fields.text || "";
			if(FRONTMATTER_RE.test(text)) {
				wikiToReparse.push({title: title, text: text});
			}
		});
		for(var w = 0; w < wikiToReparse.length; w++) {
			var wItem = wikiToReparse[w];
			var wTiddlers = $tw.wiki.deserializeTiddlers(CONTENT_TYPE, wItem.text, {});
			if(wTiddlers.length > 0) {
				var wFields = wTiddlers[0];
				wFields.title = wItem.title;
				$tw.wiki.addTiddler(new $tw.Tiddler(wFields));
			}
		}
		if(wikiToReparse.length > 0) {
			logger.log("Re-parsed " + wikiToReparse.length + " in-wiki frontmatter tiddlers");
		}
	}

	// --- C. Patch generateTiddlerFileInfo ---

	var origGenerateTiddlerFileInfo = $tw.utils.generateTiddlerFileInfo;
	$tw.utils.generateTiddlerFileInfo = function(tiddler, options) {
		var fileInfo = origGenerateTiddlerFileInfo.apply(this, arguments);
		var tiddlerType = tiddler.fields.type;
		if(tiddlerType === CONTENT_TYPE) {
			fileInfo.type = FILE_ON_DISK_TYPE;
			fileInfo.hasMetaFile = false;
			// Ensure .md extension
			if(path.extname(fileInfo.filepath) !== ".md") {
				fileInfo.filepath = fileInfo.filepath.replace(/\.[^.]+$/, ".md");
			}
		}
		return fileInfo;
	};

	// --- D. Patch saveTiddlerToFile ---

	var origSaveTiddlerToFile = $tw.utils.saveTiddlerToFile;
	$tw.utils.saveTiddlerToFile = function(tiddler, fileInfo, callback) {
		if(fileInfo.type === FILE_ON_DISK_TYPE) {
			var yamlStr = yaml.serialize(tiddler.fields);
			var content = "---\n" + yamlStr + "\n---\n" + (tiddler.fields.text || "");
			$tw.utils.createDirectory(path.dirname(fileInfo.filepath));
			fs.writeFile(fileInfo.filepath, content, "utf8", function(err) {
				if(err) {
					return callback(err);
				}
				// Clean up orphaned .meta file if it exists
				var metaPath = fileInfo.filepath + ".meta";
				if(fs.existsSync(metaPath)) {
					fs.unlink(metaPath, function(unlinkErr) {
						if(unlinkErr) {
							logger.log("Warning: could not delete orphaned .meta file: " + metaPath);
						} else {
							logger.log("Deleted orphaned .meta file: " + metaPath);
						}
						callback(null, fileInfo);
					});
				} else {
					callback(null, fileInfo);
				}
			});
			return;
		}
		return origSaveTiddlerToFile.apply(this, arguments);
	};

	// --- E. Patch saveTiddlerToFileSync ---

	var origSaveTiddlerToFileSync = $tw.utils.saveTiddlerToFileSync;
	$tw.utils.saveTiddlerToFileSync = function(tiddler, fileInfo) {
		if(fileInfo.type === FILE_ON_DISK_TYPE) {
			var yamlStr = yaml.serialize(tiddler.fields);
			var content = "---\n" + yamlStr + "\n---\n" + (tiddler.fields.text || "");
			$tw.utils.createDirectory(path.dirname(fileInfo.filepath));
			fs.writeFileSync(fileInfo.filepath, content, "utf8");
			// Clean up orphaned .meta file if it exists
			var metaPath = fileInfo.filepath + ".meta";
			if(fs.existsSync(metaPath)) {
				try {
					fs.unlinkSync(metaPath);
					logger.log("Deleted orphaned .meta file: " + metaPath);
				} catch(e) {
					logger.log("Warning: could not delete orphaned .meta file: " + metaPath);
				}
			}
			return fileInfo;
		}
		return origSaveTiddlerToFileSync.apply(this, arguments);
	};

	logger.log("Frontmatter plugin initialized");
};
