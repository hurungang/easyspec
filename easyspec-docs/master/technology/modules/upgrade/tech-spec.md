<!-- easyspec:managed v1 -->
# Tech Spec: upgrade

## Overview

The upgrade module (`src/upgrade.mjs`) provides minimal, safe cleanup: on each install it records a manifest (`.easyspec/manifest.json`) and offers to delete **only** files whose names match a known retired artifact (`RETIRED_ARTIFACT_PATTERNS`, e.g. `es-change-init`, `es-change-review`). Nothing else is ever treated as a deletion candidate — current files, user files, and other `es-*` files are left untouched.

## Technical Design

- **Manifest** — recorded at `.easyspec/manifest.json` inside the installed tool directory (`MANIFEST_DIR`/`MANIFEST_FILE`, path via `manifestPath`); lists destination paths and a content identity (`hashFile`) per installed file.
- **Candidate classification** — `computeCleanupCandidates` walks the install root and marks a file as a deletion candidate only when its name matches `RETIRED_ARTIFACT_PATTERNS`. Current files (the new artifact set) are skipped; every other file — including user files that share an `es-` name — is ignored.
- **Interactive cleanup** — `runUpgradeCleanup` runs per-file confirmation with a keep option via `@clack/prompts`. It lists candidates without deleting when non-interactive or `--dry-run`.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `MANIFEST_DIR` | constant | Manifest directory name (`.easyspec`) inside the installed tool directory | `src/upgrade.mjs` |
| `MANIFEST_FILE` | constant | Manifest file name (`manifest.json`) | `src/upgrade.mjs` |
| `RETIRED_ARTIFACT_PATTERNS` | constant | Patterns matching known retired artifact names (e.g. `es-change-init`, `es-change-review`) | `src/upgrade.mjs` |
| `manifestPath` | function | Resolves the manifest path for an install root | `src/upgrade.mjs` |
| `readManifest` | function | Reads the prior install manifest | `src/upgrade.mjs` |
| `writeManifest` | function | Records installed file paths (with `--dry-run` awareness) after an install | `src/upgrade.mjs` |
| `hashFile` | function | Content identity for installed files, used for upgrade comparison | `src/upgrade.mjs` |
| `computeCleanupCandidates` | function | Finds files whose name matches a known retired artifact name (the only deletion candidates) | `src/upgrade.mjs` |
| `runUpgradeCleanup` | function | Offers to delete retired artifacts with per-file confirmation; lists without deleting when non-interactive or `--dry-run` | `src/upgrade.mjs` |
| upgrade tests | tests | Retired-artifact detection, non-interactive/dry-run safety, and manifest recording | `tests/upgrade.test.js` |

## Data Flow

On each install: render/write the current artifact set → record the manifest → walk the install root and match file names against `RETIRED_ARTIFACT_PATTERNS` → interactive per-file confirm → delete or keep. Only retired names are ever candidates; current files and user files are never touched.
