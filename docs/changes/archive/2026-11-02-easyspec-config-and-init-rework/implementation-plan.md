# Implementation Plan: easyspec-config-and-init-rework

## Overview

This change reworks easyspec's adoption and configuration story: configuration moves from `docs/config.yaml` to a root-level `easyspec-config.yaml` with a user-configurable docs folder (default `easyspec-docs`), the `es-change-init` command is renamed and reworked into `es-init` with code-authoritative master-doc generation, and every easyspec-created artifact gains an ownership tag that powers a safe, user-confirmed upgrade cleanup. Work spans template content, the installer CLI, and this repo's own self-configuration.

## Task Checklist

### Phase 1 — Config Foundation & Docs Folder Resolver
- [x] 1.1 — Define ownership tag contract and config schema docs
- [x] 1.2 — Add config module and Docs Folder Resolver to the CLI
- [x] 1.3 — Add ownership tag helpers (embed and detect)

### Phase 2 — Template & Prompt Migration
- [x] 2.1 — Rename `es-change-init` prompt to `es-init` and rework its flow
- [x] 2.2 — Update the change-lifecycle skill for configurable docs folder
- [x] 2.3 — Update all agent bodies for config-resolved paths
- [x] 2.4 — Update all remaining prompts for config-resolved paths and `/es-init`

### Phase 3 — Installer: Config Scaffolding & Tagging
- [x] 3.1 — Wire Docs Folder Resolver and config scaffolding into the installer
- [x] 3.2 — Embed ownership tags through the template-transformation pipeline

### Phase 4 — Upgrade Cleanup Flow
- [x] 4.1 — Implement install manifest recording
- [x] 4.2 — Implement tag-verified upgrade cleanup with user confirmation

### Phase 5 — Repo Self-Configuration & Verification
- [x] 5.1 — Migrate this repo's `docs/config.yaml` to root `easyspec-config.yaml`
- [x] 5.2 — Update and extend the test suite
- [x] 5.3 — Update README / upgrade messaging and end-to-end verification

## Phase 1 — Config Foundation & Docs Folder Resolver

### 1.1 — Define ownership tag contract and config schema docs
Document (in the kit's own docs, no code yet) the ownership-tag format: a stable, machine-readable marker embedded in every easyspec-created artifact (master docs, change docs, root config, installed prompts/agents/skills where the target format permits). The tag must be version-stable so future upgrades recognize artifacts tagged by earlier releases. Also document the `easyspec-config.yaml` schema: project context (name, description, sources, tech stack, conventions, domain — carried over from the old `docs/config.yaml`) plus the new docs-folder setting (default `easyspec-docs`).
**Done when**: the tag format and config schema are written down in the change folder or kit docs, reviewed against the architecture doc, and the safety rule ("untagged files are never deleted") is stated explicitly.

### 1.2 — Add config module and Docs Folder Resolver to the CLI
Create a new source module under `src/` (e.g. `src/config.mjs`) that reads `easyspec-config.yaml` at a given workspace root, extracts the docs folder, and derives all easyspec paths (`<docs-folder>/master/`, `<docs-folder>/changes/`). It must also create the config file (when absent) with the confirmed docs-folder value, and expose a helper for prompting/confirming the docs-folder name (default `easyspec-docs`). Use a minimal YAML approach consistent with the existing no-build-step, low-dependency style (`@clack/prompts` is the only runtime dependency today — keep new dependencies minimal).
**Done when**: the resolver reads an existing root config and returns correct paths; creating a config writes the docs folder into it; a missing config is detectable; unit-tested.

### 1.3 — Add ownership tag helpers (embed and detect)
Add tag helpers (e.g. in `src/ownership.mjs`): one to embed the tag into markdown-based content, one to detect the tag in a file's content. Detection must work on any text file regardless of which target tool's format the content was rendered into. The helpers never modify untagged files.
**Done when**: embedding then detecting round-trips on sample markdown; untagged content is reported as untagged; unit-tested.

## Phase 2 — Template & Prompt Migration

### 2.1 — Rename `es-change-init` prompt to `es-init` and rework its flow
Delete `templates/content/prompts/es-change-init.body.md`; author `templates/content/prompts/es-init.body.md`. The new prompt flow: (1) create or confirm `easyspec-config.yaml` at the project root, including confirming the docs folder (default `easyspec-docs`); (2) generate master docs under `<docs-folder>/master/` for all standard areas, using existing project documentation (any origin) as input context but treating code as the authority when they disagree; (3) scan the codebase (project structure, source locations from the config's `source` section) when docs are missing or contradicted, and degrade gracefully by asking the user when structure cannot be reliably detected; (4) embed the ownership tag in every created artifact, including the root config.
**Done when**: the old prompt file is gone, the new prompt covers all four steps with no code snippets, references only config-resolved paths, and no template in the repo still invokes `/es-change-init`.

### 2.2 — Update the change-lifecycle skill for configurable docs folder
In `templates/content/skills/es-change-lifecycle/SKILL.body.md`: replace every `docs/config.yaml`, `docs/master/`, and `docs/changes/` reference with `<docs-folder>/` resolved from `easyspec-config.yaml`; add a Step 0 rule to read the docs folder from the root config before any work; update the Change Directory Structure and Master Product Docs Structure sections to the configured root; replace `/es-change-init` references with `/es-init`.
**Done when**: grep over the skill body finds no hardcoded `docs/` project paths and no `es-change-init`; the Step 0 config-resolution rule is present.

### 2.3 — Update all agent bodies for config-resolved paths
Update all seven files in `templates/content/agents/` (`es-architect`, `es-database-designer`, `es-developer`, `es-document-reviewer`, `es-product-owner`, `es-tester`, `es-ux-specialist`): replace `docs/config.yaml` and hardcoded `docs/` path references with config-resolved paths per the Docs Folder Resolver convention. Agent roles and responsibilities are otherwise unchanged.
**Done when**: grep over `templates/content/agents/` finds no hardcoded `docs/` project path; each agent instructs reading the docs folder from the root config.

### 2.4 — Update all remaining prompts for config-resolved paths and `/es-init`
Update the remaining prompts in `templates/content/prompts/` (`es-change-propose`, `es-change-apply`, `es-change-fix`, `es-change-refinement`, `es-change-update-master`, `es-master-review`, `es-quick-fix`): replace `docs/config.yaml` and hardcoded `docs/` paths with config-resolved paths, and update any `/es-change-init` invocations to `/es-init`.
**Done when**: grep over `templates/content/prompts/` (excluding the new `es-init.body.md`) finds no hardcoded `docs/` project paths and no `es-change-init` references.

## Phase 3 — Installer: Config Scaffolding & Tagging

### 3.1 — Wire Docs Folder Resolver and config scaffolding into the installer
In `src/cli.mjs`: for `init` with project scope, after harness/scope selection, scaffold `easyspec-config.yaml` at the workspace root (only when it does not exist), prompting the user to confirm or change the docs folder (default `easyspec-docs`) using the resolver from task 1.2. All project-content paths the installer reports or writes are derived from the confirmed docs folder; no hardcoded `docs/` project path remains in installer logic. Global-scope installs (home-dir prompts/agents/skills) do not create a project config. Respect `--dry-run` and `--force` semantics.
**Done when**: `easyspec init --scope project` on a fresh workspace creates the root config with the confirmed docs folder; running again does not recreate or clobber it; `--dry-run` writes nothing; no `docs/` project path literal remains in `src/cli.mjs` install paths.

### 3.2 — Embed ownership tags through the template-transformation pipeline
Ensure every file the installer writes — rendered prompts (`renderEntitiesFromContent`), rendered agents, and copied skill files (`copySkillDirectory`), plus the scaffolded root config — carries the ownership tag via the helpers from task 1.3. The tag must survive rendering through each tool profile's generic template (copilot, opencode, claude-code) since there is no build step. Untagged user files at the same destination paths are never overwritten by untagged content — existing skip/force policy is preserved.
**Done when**: a real install into a temp workspace for each supported tool produces only tagged files; `--dry-run` output matches the tagged set; the existing test suite still passes.

## Phase 4 — Upgrade Cleanup Flow

### 4.1 — Implement install manifest recording
Extend the installer to record which files it installed or overwrote (paths plus a content identity such as a hash) in a manifest stored in a stable, easyspec-owned location — implemented as `.easyspec/manifest.json` inside the installed tool directory (e.g. `<workspace>/.github/.easyspec/manifest.json` for project scope). The manifest is the "new version's manifest" side of the upgrade comparison. Must be written on both fresh init and re-install, and respected by `--dry-run` (no writes).
**Done when**: after any install, the manifest exists and accurately lists installed tagged files; a second install updates it; `--dry-run` leaves it untouched.

### 4.2 — Implement tag-verified upgrade cleanup with user confirmation
On install into a workspace with a previous easyspec manifest: compare previously installed files against the new version's artifact set. Files that are (a) in the old manifest **or** retired from the new version by name (e.g. `es-change-init` prompts/commands — offered even when no prior manifest exists), (b) no longer produced by the new version, and (c) verified to carry the ownership tag on disk become deletion candidates. Present each candidate for confirmation (with a per-file keep option, and a batched confirm/keep-all flow) using `@clack/prompts`; declined deletions are skipped without error. Files lacking the tag — including user files sharing a name with an easyspec artifact — are never deleted or overwritten. Non-interactive runs (`--dry-run`, no TTY) list candidates without deleting.
**Done when**: upgrading a workspace that contains old `es-change-init` artifacts offers them for deletion, deletes only confirmed tagged files, honors keep choices, and never touches an untagged same-named file; the flow is covered by tests.

## Phase 5 — Repo Self-Configuration & Verification

### 5.1 — Migrate this repo's `docs/config.yaml` to root `easyspec-config.yaml`
Move the repo's own config to `easyspec-config.yaml` at the repo root, adding the docs-folder setting (this repo becomes a dogfood example with `easyspec-docs/`). The legacy `docs/config.yaml` is kept in place marked as superseded rather than deleted, and `docs/changes/` remains at its current location. Update internal references in kit docs.
**Done when**: root `easyspec-config.yaml` exists with docs-folder set; `docs/config.yaml` is removed or clearly superseded; the repo docs state the legacy-layout re-init requirement.

### 5.2 — Update and extend the test suite
Update `tests/template.test.js`: the `es-change-init` prompt no longer exists and `es-init` does; no template content contains hardcoded `docs/` project paths or `es-change-init` references. Add coverage for: config scaffolding and docs-folder resolution, tag embed/detect round-trip across all three tool profiles, manifest writing, and upgrade-cleanup behavior (delete confirmed tagged candidates, keep option, untagged-file safety) — reusing the existing `tests/.fakehome` fixture approach.
**Done when**: `npm test` passes with the new and updated assertions; fakehome fixtures reflect the renamed command.

### 5.3 — Update README / upgrade messaging and end-to-end verification
Update `README.md` and any kit documentation: new `es-init` entry point, root config and configurable docs folder (default `easyspec-docs`), ownership tagging, and the upgrade flow with its confirmation/keep behavior; state clearly that legacy `docs/`-layout projects need a one-time manual re-init. Then run an end-to-end pass: install into a clean temp project and into a project with a pre-existing `docs/` folder and pre-tagged `es-change-init` artifacts, verifying nothing outside easyspec ownership is modified.
**Done when**: docs describe the new behavior accurately; end-to-end installs succeed with zero modifications to non-easyspec files; all acceptance criteria in the PRD have a corresponding verified behavior.

## Completion Checklist
- [x] All Phase 1–5 tasks checked off
- [x] `npm test` passes
- [x] No template or CLI code references a hardcoded `docs/` project path
- [x] No `es-change-init` references remain anywhere in `templates/` or `src/`
- [x] `es-init` prompt, root config scaffolding, docs-folder confirmation, and code-authoritative master-doc generation all work end-to-end on a fresh project
- [x] Every installer-written artifact carries the ownership tag; detection works in all three target-tool formats
- [x] Upgrade cleanup deletes only user-confirmed tagged files and never touches untagged files
- [x] This repo's own configuration migrated to root `easyspec-config.yaml`
- [x] README and upgrade messaging updated, including the legacy-layout re-init caveat
