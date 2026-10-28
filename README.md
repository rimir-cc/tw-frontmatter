# Frontmatter

Store tiddler metadata as YAML frontmatter directly inside `.md` files — no `.meta` sidecar needed. Any `.md` file with YAML frontmatter is automatically detected and re-parsed at boot.

## Features

- **Auto-detection** — any `.md` file with `---` delimited YAML frontmatter is recognized automatically
- **Title derivation** — frontmatter `title` field > existing clean title > derived from filepath
- **Syncer-safe** — change events suppressed during re-parse to prevent file corruption
- **Two-pass re-parse** — handles both boot-loaded files and `tiddlywiki.files` entries
- **YAML serialization** — tags and list fields serialized as YAML arrays
- **All markdown types** — `text/markdown`, `text/x-markdown` and `text/x-frontmattered-markdown` are all saved as a single `.md` file
- **Orphan cleanup** — automatic removal of orphaned `.meta` files when migrating
- **Filesystem-watcher compatible** — live external edits work seamlessly
- **Extension hooks** — other plugins can take over the YAML ↔ field mapping and the file path (used by `rimir/okf` for the Open Knowledge Format)

## Extension hooks

| Hook | Called | Arguments | Must return |
|---|---|---|---|
| `th-frontmatter-parse` | after a document's `---` block is split off | `fields`, `{yaml, body, parsed, filepath, pathTitle}` | `fields` |
| `th-frontmatter-serialize` | before a frontmatter file is written | `yamlText`, `tiddler`, `{fileInfo, pathTitle}` | `yamlText` |
| `th-frontmatter-fileinfo` | when the file of a frontmatter tiddler is chosen | `fileInfo`, `tiddler`, `options` | `fileInfo` |

Register them with `$tw.hooks.addHook` in a startup module that runs `before: ["frontmatter"]`, so the boot re-parse already uses them. A hook must always return its first argument (possibly changed) — returning `undefined` breaks the chain.

## Prerequisites

- TiddlyWiki 5.3.0+ (Node.js server edition)
- The official `tiddlywiki/markdown` plugin (for rendering)
- **Restart the server after installing** — the plugin hooks into server-side saving, which only takes effect at boot

## Quick Start

1. Give a tiddler a markdown type — `text/x-frontmattered-markdown`, `text/markdown` or `text/x-markdown`
2. The tiddler is saved as a `.md` file with YAML frontmatter on disk
3. Or place any `.md` file with YAML frontmatter in your tiddlers directory — it is auto-detected at boot

## License

MIT
