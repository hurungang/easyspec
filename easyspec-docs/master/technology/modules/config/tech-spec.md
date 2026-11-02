<!-- easyspec:managed v1 -->
# Tech Spec: config

## Overview

The config module (`src/config.mjs`, introduced by the rework) is the Docs Folder Resolver: the single source of path truth for all easyspec project paths. It reads `easyspec-config.yaml` at the workspace root and derives `<docs-folder>/master/` and `<docs-folder>/changes/` paths (default docs folder: `easyspec-docs`).

## Technical Design

- **Read** — `readConfig` reads the root config file before any path derivation; a missing file is a distinct, detectable state (fresh install), not an error.
- **Parse** — `parseConfigYaml` is a tolerant parser: malformed or unparsable content parses to `{}` and silently degrades to the default docs folder rather than erroring.
- **Resolve** — `getDocsFolder` extracts the docs folder setting; `resolveDocsPaths` derives the master/changes directory paths.
- **Scaffold** — when the config file is absent, `scaffoldConfig` creates it (with the confirmed docs folder) without clobbering an existing file; `renderConfigYaml` renders the config schema, with `parseListValue` handling list-valued `source`/`tests` sections.
- **Consumers** — CLI code resolves paths through this module; all template content references config-resolved paths conceptually (agents, prompts, and the lifecycle skill never hardcode `docs/`).

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `CONFIG_FILE_NAME` | constant | Root config file name (`easyspec-config.yaml`) | `src/config.mjs` |
| `DEFAULT_DOCS_FOLDER` | constant | Default docs folder (`easyspec-docs`) | `src/config.mjs` |
| `parseConfigYaml` | function | Tolerant YAML subset parser; malformed content yields `{}` | `src/config.mjs` |
| `parseListValue` | function | Parses list-valued config entries (e.g. `tests` sources) | `src/config.mjs` |
| `configPath` | function | Resolves the root config file path for a workspace | `src/config.mjs` |
| `readConfig` | function | Reads and parses the workspace config; missing file is a detectable fresh-install state | `src/config.mjs` |
| `getDocsFolder` | function | Extracts the docs folder, falling back to the default | `src/config.mjs` |
| `resolveDocsPaths` | function | Derives `<docs-folder>/master/` and `<docs-folder>/changes/` paths | `src/config.mjs` |
| `renderConfigYaml` | function | Renders the config file schema with the docs-folder setting | `src/config.mjs` |
| `scaffoldConfig` | function | Creates the config file when absent, without clobbering | `src/config.mjs` |
| repo root config | config | This repo's own easyspec configuration post-migration (legacy `docs/` layout retained for reference) | `easyspec-config.yaml` |
| config tests | tests | Config parsing, docs-folder resolution, scaffolding coverage | `tests/config.test.js` |
| ownership & config doc | doc | Ownership-tag contract, manifest location, `easyspec-config.yaml` schema | `docs/changes/easyspec-config-and-init-rework/ownership-and-config.md` |

## Data Flow

Workspace root → `easyspec-config.yaml` → parse → docs folder → derived master/changes paths → consumed by installer write sites and (conceptually) by all es- agents, prompts, and skills.
