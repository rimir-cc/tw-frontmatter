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
exports.before = ["filesystem-watcher"];
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
			// Read the file and check for frontmatter with our content type
			try {
				var content = fs.readFileSync(fileInfo.filepath, "utf8");
				if(FRONTMATTER_RE.test(content) && content.indexOf("type: " + CONTENT_TYPE) !== -1) {
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
		for(var i = 0; i < titlesToReparse.length; i++) {
			var item = titlesToReparse[i];
			// Re-deserialize with the now-registered deserializer
			var tiddlers = $tw.wiki.deserializeTiddlers(CONTENT_TYPE, item.content, {});
			if(tiddlers.length > 0) {
				var newFields = tiddlers[0];
				// Remove old tiddler (was titled by filepath)
				$tw.wiki.deleteTiddler(item.oldTitle);
				delete $tw.boot.files[item.oldTitle];
				// Add new tiddler with proper fields
				$tw.wiki.addTiddler(new $tw.Tiddler(newFields));
				// Update boot.files mapping
				var newTitle = newFields.title || item.oldTitle;
				$tw.boot.files[newTitle] = {
					filepath: item.filepath,
					type: CONTENT_TYPE,
					hasMetaFile: false
				};
				logger.log("Re-parsed: " + newTitle);
			}
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
