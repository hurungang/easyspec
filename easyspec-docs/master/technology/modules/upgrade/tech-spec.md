<!-- easyspec:managed v1 -->
# Tech Spec: upgrade

## Overview

The upgrade module (`src/upgrade.mjs`, introduced by the rework) provides tag-verified upgrade cleanup. It records the install manifest after each install run and, on subsequent installs, removes obsolete artifacts: files matching a known retired name (e.g. `es-change-init`, `es-change-review`) are removed automatically; tag-verified obsolete files (in the old manifest) and untagged `es-*` files from pre-manifest installs are removed only after individual user confirmation (with a keep option). Untagged files that are not retired easyspec artifacts are never deleted automatically.

## Technical Design

- **Manifest** — recorded at `.easyspec/manifest.json` inside the installed tool directory (`MANIFEST_DIR`/`MANIFEST_FILE`, path via `manifestPath`); lists destination paths and a content identity (`hashFile`) per installed file; read on subsequent installs to determine prior state.
- **Candidate classification** — `computeCleanupCandidates` marks a prior artifact as a deletion candidate when it is retired by name (matched against `RETIRED_ARTIFACT_PATTERNS`, e.g. `es-change-init`, `es-change-review`) **or** listed in the old manifest, and is tag-verified on disk. This means retired artifacts are offered even when no prior manifest exists.
- **Legacy classification** — untagged files without the ownership tag are surfaced separately as `legacyCandidates`: (a) files matching a retired name are offered regardless of manifest (they can linger from installs that predate ownership tagging); (b) when there is no manifest at all, any untagged file under `commands/`, `prompts/`, `agents/`, or `skills/` whose basename matches `es-*.md` is offered. Non-`es-` user files are never included, and these are never mixed with tag-verified candidates. A flat prompt directory (Copilot's global user prompts dir) is supported via the `layout` option.
- **Interactive cleanup** — `runUpgradeCleanup` auto-removes known retired names (with a clear log); tag-verified obsolete files and untagged legacy `es-*` files get per-file confirmation with a keep option via `@clack/prompts`. Non-interactive runs auto-remove retired names and list (never delete) the other candidate types; `--dry-run` lists everything and deletes nothing.

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
| `computeCleanupCandidates` | function | Classifies into three buckets: `retiredCandidates` (auto-removed retired names), `candidates` (tag-verified obsolete manifest entries), `legacyCandidates` (untagged `es-*` from pre-manifest installs) | `src/upgrade.mjs` |
| `isLegacyEasyspecArtifact` | function | Identifies untagged `es-*.md` artifacts in install directories for the legacy cleanup path | `src/upgrade.mjs` |
| `runUpgradeCleanup` | function | Auto-removes retired names; interactive confirm/keep for tagged obsolete + untagged legacy; non-interactive lists the latter without deleting; `--dry-run` deletes nothing | `src/upgrade.mjs` |
| upgrade tests | tests | Install tagging, manifest, tagged cleanup, and pre-manifest legacy-cleanup coverage | `tests/upgrade.test.js` |

## Data Flow

Prior install → `.easyspec/manifest.json` → on re-install: read manifest + stat/read each listed file (tag verification via `src/ownership.mjs`) → compare against new artifact set + retired-name patterns → auto-remove retired names; interactive per-file confirm for tagged obsolete + untagged legacy → delete or keep. Untagged files matching retired names are removed automatically regardless of manifest; when no manifest exists, other untagged `es-*` install files are classified separately as legacy candidates and require an explicit confirmation.
