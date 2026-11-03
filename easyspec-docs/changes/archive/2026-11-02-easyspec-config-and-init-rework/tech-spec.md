# Tech Spec: easyspec-config-and-init-rework

## Technical Overview

The rework introduces three technical concerns into the existing no-build-step CLI: (1) a **Docs Folder Resolver** — a config module that reads `easyspec-config.yaml` at the workspace root and derives all easyspec project paths (master docs, change docs) from a configurable docs folder (default `easyspec-docs`); (2) an **Ownership Tag Contract** — helpers that embed and detect a version-stable, machine-readable marker in every markdown-based artifact the installer or `es-init` creates, designed to survive the per-target-tool template rendering; (3) **tag-verified upgrade cleanup** — the installer records an install manifest, and on upgrade offers for deletion only files that are retired from the new version, listed in the old manifest, and verified tagged on disk, with per-file user confirmation and a keep option. Untagged files are never deleted or overwritten. Template content (prompts, agents, the lifecycle skill) switches from hardcoded `docs/` paths to config-resolved paths, and `es-change-init` is replaced by `es-init` with code-authoritative master-doc generation.

## Component Breakdown

- **Config module / Docs Folder Resolver** (`src/config.mjs`, new) — Reads root `easyspec-config.yaml`; extracts the docs folder; derives `<docs-folder>/master/` and `<docs-folder>/changes/` paths; creates the config file with the docs-folder setting when absent; renders the config schema (`renderConfigYaml`) and scaffolds without clobbering (`scaffoldConfig`). Malformed config content parses to `{}` and silently degrades to the default docs folder rather than erroring. Single source of path truth for CLI code; referenced conceptually by all templates.
- **Ownership tag helpers** (`src/ownership.mjs`, new) — Embeds the tag — `<!-- easyspec:managed v1 -->` (YAML form: `# easyspec:managed v1`) — into text content; detects the tag in any file regardless of target-tool format; never mutates untagged files. Consumed by installer write paths and by the upgrade-cleanup verifier.
- **Installer / CLI** (`src/cli.mjs`, modified) — Existing command surface (`init`, `sync`) and template-transformation pipeline (tool profiles, generic-template rendering, skill copying, model selection) are preserved. Gains: config scaffolding on project-scope init, tag embedding at every write site, manifest recording, and upgrade cleanup.
- **CLI entry point** (`bin/easyspec-init.js`) — Unchanged thin launcher delegating to `runCli`.
- **Upgrade cleanup** (`src/upgrade.mjs`, new) — Compares prior install state vs. the new artifact set; classifies deletion candidates (retired by name **or** listed in the old manifest, plus tag-verified on disk — so retired artifacts such as `es-change-init` are offered even when no prior manifest exists); runs interactive confirmation with keep options via `@clack/prompts`; no-ops safely when non-interactive or `--dry-run`.
- **`es-init` prompt** (`templates/content/prompts/es-init.body.md`, new; replaces `es-change-init.body.md`) — Agent-side flow: config creation/confirmation → docs-folder confirmation → code-authoritative master-doc generation (existing docs as context, Code Scanner when docs absent/contradicted, graceful degradation by asking the user) → ownership tagging of all created artifacts.
- **Change-lifecycle skill** (`templates/content/skills/es-change-lifecycle/SKILL.body.md`, modified) — Step 0 config-resolution rule; all directory-structure conventions rooted at `<docs-folder>/`.
- **Agent bodies** (`templates/content/agents/*.body.md`, modified) — Config-resolved paths only.
- **Remaining prompts** (`templates/content/prompts/*.body.md`, modified) — Config-resolved paths; `/es-change-init` → `/es-init`.
- **Code Scanner (init-time)** — Capability exercised by the `es-init` prompt (workspace exploration + config `source` sections), not a CLI runtime module; used when existing docs are absent or contradicted by code.

## API Changes

No public HTTP/API surface. CLI-facing changes only:

- **`easyspec init`** — For project scope, now scaffolds `easyspec-config.yaml` at the workspace root (when absent), interactively confirms the docs folder (default `easyspec-docs`) via a confirm-then-text flow — a yes/no confirm accepting the default, with an optional text prompt to override (non-TTY and `--dry-run` skip straight to the default) — tags all written artifacts, and records the install manifest. `--dry-run` and `--force` semantics preserved. No new required flags anticipated; an optional flag to skip the docs-folder prompt (accept default) may be added if interactive-only confirmation proves awkward in CI.
- **`easyspec init` (upgrade path)** — Same command, new behavior: presents retired tagged artifacts for confirmed deletion — both files listed in a prior install manifest and files matching known retired artifact names (e.g. `es-change-init`), even when no prior manifest exists.
- **`easyspec sync`** — Unchanged.
- **Prompt command rename** — `/es-change-init` removed; `/es-init` replaces it across all target tools (copilot prompt `es-init.prompt.md`, opencode/claude-code command `es-init.md`).

## State Management

N/A — this is a CLI and template-content project with no frontend or runtime UI state. The only persistent state is on-disk: `easyspec-config.yaml` (declarative configuration), the install manifest (records installed files + content identity for upgrade comparison), and the ownership tags embedded in artifacts themselves.

## Data Access Patterns

All access is local filesystem reads/writes from the workspace (and home directory for global scope):

- **Config read** — Resolver reads `easyspec-config.yaml` from the workspace root before any path derivation; missing file is a distinct, detectable state (fresh install) rather than an error; unparsable/malformed content parses to an empty config and silently falls back to the default docs folder.
- **Template rendering** — Installer reads generic templates from `templates/<profile>/` and body content from `templates/content/`, renders via placeholder substitution, writes into tool-specific project or home directories per the existing `TOOL_PROFILES` mapping. Rendering is the tagging point: tags are appended to rendered output before write so they survive into every target-tool format.
- **Manifest** — Written after each install run (project or global scope), listing destination paths and a content identity (hash) for each installed file; read on subsequent installs to determine prior state.
- **Upgrade comparison** — Reads the prior manifest, stats and reads each listed file to verify tag presence, and compares against the new version's artifact set; deletions occur only after interactive confirmation.
- **Master-doc generation (es-init)** — Reads existing project docs from any location (never modifies them), reads source locations named in the config's `source` section, and writes generated docs under `<docs-folder>/master/` with tags embedded.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `runCli` | function | CLI entry: dispatches `init`/`sync`, orchestrates prompts and installs | `src/cli.mjs` |
| `parseArgs` | function | Parses CLI flags (`--agent`, `--scope`, `--workspace`, `--force`, `--dry-run`, etc.) | `src/cli.mjs` |
| `TOOL_PROFILES` | constant | Per-target-tool install paths and extensions (copilot, opencode, claude-code) | `src/cli.mjs` |
| `getProjectRoot` | function | Resolves per-tool project install directory | `src/cli.mjs` |
| `getHomeRoot` | function | Resolves per-tool home (global) install directory | `src/cli.mjs` |
| `resolveGlobalPromptDir` | function | Global prompt directory per tool (incl. platform-specific copilot path) | `src/cli.mjs` |
| `installToRoot` | function | Installs prompts, agents, and skills into one target root | `src/cli.mjs` |
| `renderEntitiesFromContent` | function | Renders prompts/agents from generic template + body content; tagging write site | `src/cli.mjs` |
| `renderTemplate` | function | Substitutes `{{body}}` (and template placeholders) into a generic template | `src/cli.mjs` |
| `parseFrontmatter` | function | Extracts name/description/model/tools frontmatter from body files | `src/cli.mjs` |
| `copySkillDirectory` | function | Copies and renders skill files; tagging write site | `src/cli.mjs` |
| `copyFileWithPolicy` | function | Skip/overwrite policy for file copies (`--force` aware) | `src/cli.mjs` |
| `applyModelSelectionsToRoot` | function | Applies technical/non-technical model selections to installed agents | `src/cli.mjs` |
| `upsertModelInFrontmatter` | function | Updates `model:` in agent frontmatter | `src/cli.mjs` |
| `promptForAgents` | function | Interactive harness (target tool) selection | `src/cli.mjs` |
| `promptForScope` | function | Interactive project/global scope selection | `src/cli.mjs` |
| `syncTemplates` | function | `sync` command: refreshes template profiles from source dirs | `src/cli.mjs` |
| `collectPromptFiles` | function | Collects `es-change-*` prompt sources for sync (rename to cover `es-*`) | `src/cli.mjs` |
| config reader/resolver | module | Reads `easyspec-config.yaml`, resolves docs folder and derived paths (`parseConfigYaml`, `readConfig`, `getDocsFolder`, `resolveDocsPaths`, `scaffoldConfig`, `renderConfigYaml`) | `src/config.mjs` |
| tag embedder / detector | module | Embeds ownership tag into artifact content; detects tag in any text file (`embedTag`, `hasTag`, `fileHasTag`, `OWNERSHIP_MARKER`, `OWNERSHIP_TAG`) | `src/ownership.mjs` |
| manifest writer/reader | module | Records and reads install manifest at `.easyspec/manifest.json` in the installed tool directory (`readManifest`, `writeManifest`, `hashFile`, `manifestPath`) | `src/upgrade.mjs` |
| upgrade cleanup | function | Classifies retired tagged candidates (retired-by-name or old-manifest entries); interactive confirm/keep deletion; safe no-op when non-interactive or `--dry-run` (`computeCleanupCandidates`, `runUpgradeCleanup`, `RETIRED_ARTIFACT_PATTERNS`) | `src/upgrade.mjs` |
| docs-folder confirmation | function | Interactive confirm-then-text docs-folder flow (yes/no on default `easyspec-docs`, optional text override); returns the default when non-TTY or `--dry-run` (`confirmDocsFolder`) | `src/cli.mjs` |
| CLI launcher | entry point | Executable wrapper invoking `runCli` | `bin/easyspec-init.js` |
| `es-init` prompt | template | New init flow: config, docs-folder confirm, code-authoritative master docs, tagging | `templates/content/prompts/es-init.body.md` |
| lifecycle skill body | template | Step 0 config rule; `<docs-folder>/` directory conventions | `templates/content/skills/es-change-lifecycle/SKILL.body.md` |
| skill wrapper | template | Skill frontmatter shell rendered per tool | `templates/content/skills/es-change-lifecycle/SKILL.md` |
| agent bodies (7) | templates | es-architect, es-database-designer, es-developer, es-document-reviewer, es-product-owner, es-tester, es-ux-specialist | `templates/content/agents/*.body.md` |
| prompt bodies (7 remaining) | templates | es-change-propose, es-change-apply, es-change-fix, es-change-refinement, es-change-update-master, es-master-review, es-quick-fix | `templates/content/prompts/*.body.md` |
| generic templates | templates | Per-tool rendering shells for prompts and agents | `templates/copilot/prompts/_template.prompt.md`, `templates/copilot/agents/_template.agent.md`, `templates/opencode/prompts/_template.md`, `templates/opencode/agents/_template.md` |
| template tests | tests | Template/installer test suite; rename + path assertions + new coverage | `tests/template.test.js` |
| config tests | tests | Config parsing, docs-folder resolution, scaffolding coverage | `tests/config.test.js` |
| ownership tests | tests | Tag embed/detect round-trip coverage | `tests/ownership.test.js` |
| upgrade tests | tests | Install tagging, manifest, upgrade-cleanup coverage | `tests/upgrade.test.js` |
| ownership & config doc | doc | Ownership-tag contract, manifest location, `easyspec-config.yaml` schema | `docs/changes/easyspec-config-and-init-rework/ownership-and-config.md` |
| fakehome fixture | test fixture | Simulated home dirs for opencode/copilot/claude-code installs | `tests/.fakehome/` |
| root config (repo) | config | This repo's own easyspec configuration post-migration | `easyspec-config.yaml` |

> Note: `collectPromptFiles` currently matches only `es-change-*` prompt names; it must be updated as part of the rename so `es-init` is included in `sync`. New modules (`src/config.mjs`, `src/ownership.mjs`, `src/upgrade.mjs`) landed at the paths shown in this map.
