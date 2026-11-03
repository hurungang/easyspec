<!-- easyspec:managed v1 -->
# Tech Spec: ownership

## Overview

The ownership module (`src/ownership.mjs`, introduced by the rework) implements the Ownership Tag Contract: a version-stable, machine-readable marker embedded in every markdown-based artifact the installer or `es-init` creates, designed to survive per-target-tool template rendering.

## Technical Design

- **Tag forms** — HTML-comment form `<!-- easyspec:managed v1 -->` for markdown artifacts; YAML-comment form `# easyspec:managed v1` for YAML files such as `easyspec-config.yaml`.
- **Embedding** — `embedTag` prepends the appropriate tag form to text content; it is applied at render/write time so tags survive into every target-tool format.
- **Detection** — `hasTag` checks text content; `fileHasTag` checks a file on disk regardless of target-tool format. The upgrade-cleanup verifier relies on this to confirm a file is easyspec-managed before offering deletion.
- **Safety invariant** — untagged files are never deleted or overwritten automatically, with one exception: files matching a known retired artifact name (`es-change-init`, `es-change-review`) are removed on upgrade. Legacy pre-manifest files matching easyspec's `es-` artifact naming (but not a retired name) are only offered for deletion with an explicit warning and confirmation.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `OWNERSHIP_MARKER` | constant | Version-stable marker string (`easyspec:managed v1`) | `src/ownership.mjs` |
| `OWNERSHIP_TAG` | constant | HTML-comment tag form (`<!-- easyspec:managed v1 -->`) | `src/ownership.mjs` |
| `OWNERSHIP_TAG_YAML` | constant | YAML-comment tag form (`# easyspec:managed v1`) | `src/ownership.mjs` |
| `embedTag` | function | Embeds the ownership tag into artifact content | `src/ownership.mjs` |
| `hasTag` | function | Detects the tag in text content regardless of format | `src/ownership.mjs` |
| `fileHasTag` | function | Detects the tag in a file on disk | `src/ownership.mjs` |
| ownership tests | tests | Tag embed/detect round-trip coverage | `tests/ownership.test.js` |

## Consumers

- Installer write paths in `src/cli.mjs` (tags appended to rendered output before write).
- Upgrade-cleanup verification in `src/upgrade.mjs` (deletion candidates must be tag-verified).
- The `es-init` prompt (all created master-doc artifacts are tagged).
