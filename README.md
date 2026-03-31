# Frontmatter

Store tiddler metadata as YAML frontmatter directly inside `.md` files — no `.meta` sidecar needed. Any `.md` file with YAML frontmatter is automatically detected and re-parsed at boot.

## Features

- **Auto-detection** — any `.md` file with `---` delimited YAML frontmatter is recognized automatically
- **Title derivation** — frontmatter `title` field > existing clean title > derived from filepath
- **Syncer-safe** — change events suppressed during re-parse to prevent file corruption
- **Two-pass re-parse** — handles both boot-loaded files and `tiddlywiki.files` entries
- **YAML serialization** — tags and list fields serialized as YAML arrays
- **Orphan cleanup** — automatic removal of orphaned `.meta` files when migrating
- **Filesystem-watcher compatible** — live external edits work seamlessly

## Prerequisites

- TiddlyWiki 5.3.0+ (Node.js server edition)
- The official `tiddlywiki/markdown` plugin (for rendering)

## Quick Start

1. Set a tiddler's type to `text/x-frontmattered-markdown`
2. The tiddler is saved as a `.md` file with YAML frontmatter on disk
3. Or place any `.md` file with YAML frontmatter in your tiddlers directory — it is auto-detected at boot

## License

MIT
