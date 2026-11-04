<!-- easyspec:managed v1 -->
# Tech Spec: cli-installer

## Overview

The CLI installer module (`src/cli.mjs`) is the command surface of the easyspec kit. It dispatches `init`/`sync`, parses flags, resolves per-tool install directories (copilot, opencode, claude-code), renders generic templates with body content, and installs prompts, agents, and skills into project or home (global) targets.

Post-rework responsibilities added on top of the preserved pipeline: config scaffolding on project-scope init, an interactive confirm-then-text docs-folder flow, ownership-tag embedding at every write site, install-manifest recording, and upgrade cleanup of retired tagged artifacts.

## Technical Design

- **Command dispatch** — `runCli` orchestrates argument parsing, harness/scope selection, install, and sync.
- **Target-tool profiles** — `TOOL_PROFILES` maps each supported harness to its install paths and file extensions; global copilot prompts are installed to both `~/.copilot/prompts/` (Copilot CLI) and the platform-specific VS Code user prompts directory (`copilotUserPromptDir`).
- **Rendering pipeline** — body files (`templates/content/`) provide frontmatter and body; generic per-tool shells provide the wrapper; `renderEntitiesFromContent` and `renderTemplate` perform substitution; `copySkillDirectory` renders skill trees. Rendering is also the tagging point: ownership tags are appended before write so they survive into every target format.
- **Copy policy** — `renderEntitiesFromContent` and `copySkillDirectory` always write the latest rendered content (overwriting existing easyspec files), so updates propagate content changes and restore accidentally removed files. `copyFileWithPolicy` (used by `sync`) is `--force` aware.
- **Model selection** — `applyModelSelectionsToRoot` / `upsertModelInFrontmatter` apply technical/non-technical model presets to installed agents.
- **Docs-folder confirmation** — `confirmDocsFolder` runs a yes/no confirm on the default (`easyspec-docs`) with optional text override; non-TTY and `--dry-run` skip straight to the default.
- **Upgrade path** — on `init` over an existing install, the installer presents retired tagged artifacts for confirmed deletion (prior manifest entries or known retired names such as `es-change-init` and `es-change-review`) via `src/upgrade.mjs`. Cleanup and manifest recording run per distinct install root, so the VS Code Copilot prompts directory (which sits outside `~/.copilot`) is cleaned up and recorded independently from the `~/.copilot` root.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `runCli` | function | CLI entry: dispatches `init`/`sync`, orchestrates prompts and installs | `src/cli.mjs` |
| `parseArgs` | function | Parses CLI flags (`--agent`, `--scope`, `--workspace`, `--force`, `--dry-run`, etc.) | `src/cli.mjs` |
| `TOOL_PROFILES` | constant | Per-target-tool install paths and extensions (copilot, opencode, claude-code) | `src/cli.mjs` |
| `getProjectRoot` | function | Resolves per-tool project install directory | `src/cli.mjs` |
| `getHomeRoot` | function | Resolves per-tool home (global) install directory | `src/cli.mjs` |
| `resolveGlobalPromptDirs` | function | Global prompt destination list per tool (copilot returns both `~/.copilot/prompts` and the platform-specific VS Code path) | `src/cli.mjs` |
| `installToRoot` | function | Installs prompts, agents, and skills into one target root, then runs upgrade cleanup and records a manifest per distinct install root | `src/cli.mjs` |
| `collectInstallRoots` | function | Groups written files into distinct install roots (handles Copilot's external global prompts dir) | `src/cli.mjs` |
| `renderEntitiesFromContent` | function | Renders prompts/agents from generic template + body content; tagging write site | `src/cli.mjs` |
| `renderTemplate` | function | Substitutes `{{body}}` (and template placeholders) into a generic template | `src/cli.mjs` |
| `parseFrontmatter` | function | Extracts name/description/model/tools frontmatter from body files | `src/cli.mjs` |
| `copySkillDirectory` | function | Copies and renders skill files; tagging write site | `src/cli.mjs` |
| `copyFileWithPolicy` | function | Skip/overwrite policy for file copies (`--force` aware) | `src/cli.mjs` |
| `applyModelSelectionsToRoot` | function | Applies technical/non-technical model selections to installed agents | `src/cli.mjs` |
| `upsertModelInFrontmatter` | function | Updates `model:` in agent frontmatter | `src/cli.mjs` |
| `promptForAgents` | function | Interactive harness (target tool) selection | `src/cli.mjs` |
| `promptForScope` | function | Interactive project/global scope selection | `src/cli.mjs` |
| `confirmDocsFolder` | function | Interactive confirm-then-text docs-folder flow; returns the default when non-TTY or `--dry-run` | `src/cli.mjs` |
| `syncTemplates` | function | `sync` command: refreshes template profiles from source dirs | `src/cli.mjs` |
| `collectPromptFiles` | function | Collects `es-*` prompt sources for sync (updated to include `es-init` after the rename) | `src/cli.mjs` |
| CLI launcher | entry point | Executable wrapper invoking `runCli` | `bin/easyspec-init.js` |
| template tests | tests | Template/installer test suite; rename + path assertions + new coverage | `tests/template.test.js` |
| fakehome fixture | test fixture | Simulated home dirs for opencode/copilot/claude-code installs | `tests/.fakehome/` |

## Data Flow

Workspace root → config read (via `src/config.mjs`) → template read from `templates/<profile>/` + `templates/content/` → render + tag → write to per-tool project or home directory → manifest recorded at `.easyspec/manifest.json`.
