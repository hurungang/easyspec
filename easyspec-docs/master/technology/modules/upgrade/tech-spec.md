<!-- easyspec:managed v1 -->
# Tech Spec: upgrade

## Overview

The upgrade module (`src/upgrade.mjs`, introduced by the rework) provides tag-verified upgrade cleanup. It records the install manifest after each install run and, on subsequent installs, offers for deletion only artifacts that are retired from the new version, tag-verified on disk, and individually confirmed by the user (with a keep option). Untagged files are never deleted or overwritten.

## Technical Design

- **Manifest** — recorded at `.easyspec/manifest.json` inside the installed tool directory (`MANIFEST_DIR`/`MANIFEST_FILE`, path via `manifestPath`); lists destination paths and a content identity (`hashFile`) per installed file; read on subsequent installs to determine prior state.
- **Candidate classification** — `computeCleanupCandidates` marks a prior artifact as a deletion candidate when it is retired by name (matched against `RETIRED_ARTIFACT_PATTERNS`, e.g. `es-change-init`) **or** listed in the old manifest, and is tag-verified on disk. This means retired artifacts are offered even when no prior manifest exists.
- **Interactive cleanup** — `runUpgradeCleanup` runs per-file confirmation with a keep option via `@clack/prompts`; it no-ops safely when non-interactive or `--dry-run`.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `MANIFEST_DIR` | constant | Manifest directory name (`.easyspec`) inside the installed tool directory | `src/upgrade.mjs` |
| `MANIFEST_FILE` | constant | Manifest file name (`manifest.json`) | `src/upgrade.mjs` |
| `RETIRED_ARTIFACT_PATTERNS` | constant | Patterns matching known retired artifact names (e.g. `es-change-init`) | `src/upgrade.mjs` |
| `manifestPath` | function | Resolves the manifest path for an install root | `src/upgrade.mjs` |
| `readManifest` | function | Reads the prior install manifest | `src/upgrade.mjs` |
| `writeManifest` | function | Records installed file paths (with `--dry-run` awareness) after an install | `src/upgrade.mjs` |
| `hashFile` | function | Content identity for installed files, used for upgrade comparison | `src/upgrade.mjs` |
| `computeCleanupCandidates` | function | Classifies retired tagged deletion candidates (retired-by-name or old-manifest entries) | `src/upgrade.mjs` |
| `runUpgradeCleanup` | function | Interactive confirm/keep deletion; safe no-op when non-interactive or `--dry-run` | `src/upgrade.mjs` |
| upgrade tests | tests | Install tagging, manifest, upgrade-cleanup coverage | `tests/upgrade.test.js` |

## Data Flow

Prior install → `.easyspec/manifest.json` → on re-install: read manifest + stat/read each listed file (tag verification via `src/ownership.mjs`) → compare against new artifact set + retired-name patterns → interactive per-file confirm → delete or keep.
