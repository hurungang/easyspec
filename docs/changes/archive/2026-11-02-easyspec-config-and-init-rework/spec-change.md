# Spec Change: easyspec-config-and-init-rework

## Affected Spec Areas

- **Kit configuration** — `docs/config.yaml` replaced by root-level `easyspec-config.yaml` (config schema, location, creation flow).
- **Project initialization** — `es-change-init` prompt (`templates/content/prompts/es-change-init.body.md`) → renamed and reworked `es-init`.
- **Master docs layout** — all `docs/master/**` path conventions become relative to the configured docs folder (`templates/content/skills/es-change-lifecycle/SKILL.body.md`, Master Product Docs Structure section).
- **Change docs layout** — all `docs/changes/**` path conventions become relative to the configured docs folder (Change Directory Structure section of the lifecycle skill).
- **Agent definitions** — all agents in `templates/content/agents/` referencing `docs/config.yaml` or hardcoded `docs/` paths.
- **Prompts** — all prompts in `templates/content/prompts/` that reference `docs/config.yaml`, `docs/changes/`, or `/es-change-init` (including `es-change-propose`, `es-quick-fix`, and others).
- **CLI / installer** — `bin/easyspec-init.js`, `src/cli.mjs`: config file creation, docs-folder prompt, artifact tagging, upgrade/cleanup logic.
- **Source repo self-configuration** — the easyspec repo's own `docs/config.yaml` migrates to `easyspec-config.yaml` at root.
- Related change-lifecycle skill: `templates/content/skills/es-change-lifecycle/SKILL.body.md` (openspec spec areas per SKILL section "Document Format Requirements" and workflow definitions).

## New Capabilities

- **Configurable docs folder** — User selects the easyspec docs folder at init (default `easyspec-docs`); choice persisted in `easyspec-config.yaml` at project root; all easyspec tooling resolves paths from it.
- **Root-level config file** — `easyspec-config.yaml` becomes the single authoritative easyspec configuration, created at project root by `es-init`.
- **Code-first master doc generation** — `es-init` generates the full master doc set describing the project's current state, using existing documentation as context when present, scanning code when not, and resolving doc-vs-code conflicts in favor of code.
- **Artifact ownership tagging** — Every user-facing artifact easyspec creates (master docs, change docs, root config, installed prompts/agents/skills where applicable) embeds a machine-readable easyspec ownership marker.
- **Tag-based safe upgrade cleanup** — Installer compares previously installed easyspec files against the new version; obsolete tagged files become deletion candidates; each deletion requires user confirmation with a keep option; untagged files are never touched.

## Modified Capabilities

- **Project initialization command**
  - Before: `/es-change-init` creates/updates `docs/config.yaml` at a hardcoded `docs/` path by scanning project structure; name suggests it initializes a change, not the project.
  - After: `/es-init` creates `easyspec-config.yaml` at project root, confirms the docs folder with the user (default `easyspec-docs`), then generates master docs reflecting the current codebase and tags all created artifacts.
- **Configuration file location and role**
  - Before: `docs/config.yaml` — project context (name, sources, stack, conventions, domain) under hardcoded `docs/`.
  - After: `easyspec-config.yaml` at project root — retains project-context content and adds the configured docs-folder setting; all agents/prompts read it instead of `docs/config.yaml`.
- **Docs path resolution across the kit**
  - Before: master docs at `docs/master/`, change docs at `docs/changes/` hardcoded throughout templates, agents, prompts, and CLI.
  - After: identical structure, rooted at `<configured-docs-folder>/master/` and `<configured-docs-folder>/changes/`.
- **Installer behavior on version upgrade**
  - Before: installs new template artifacts; no mechanism to remove retired files from prior versions (stale `es-change-init` artifacts would linger).
  - After: detects retired tagged artifacts (starting with `es-change-init`), confirms deletions with the user, honors keep choices.

## Removed Capabilities

- **`es-change-init` command/prompt** — removed and replaced by `es-init`; legacy `es-change-init` artifacts are uninstalled by the upgrade flow.
- **Hardcoded `docs/` project path** — removed as an implicit constant across templates, agents, prompts, and CLI; superseded by config-driven resolution.
- **`docs/config.yaml` as the kit's config file** — replaced by root-level `easyspec-config.yaml`.

## Spec Update Instructions

- Lifecycle skill (`templates/content/skills/es-change-lifecycle/SKILL.body.md`):
  - Replace every `docs/config.yaml`, `docs/master/`, `docs/changes/`, and `docs/` project-path reference with `<docs-folder>/` resolved from `easyspec-config.yaml`; add a Step 0 rule to read the docs folder from the root config.
  - Update Change Directory Structure and Master Product Docs Structure tables to the configured root.
  - Remove references to `/es-change-init`; reference `/es-init` as the project initialization entry point.
- Prompt `es-change-init.body.md`: delete; author new `es-init.body.md` covering config creation, docs-folder confirmation (default `easyspec-docs`), master-doc generation (existing docs as context, code as authority, scan when no docs), and artifact tagging.
- All other prompts and all agent bodies in `templates/content/`: replace `docs/config.yaml` and hardcoded `docs/` path references with config-resolved paths; update any `/es-change-init` invocations to `/es-init`.
- CLI (`src/cli.mjs`, `bin/easyspec-init.js`): spec the new install-time behaviors — root config creation, docs-folder prompt, ownership-tag embedding in generated/installed artifacts, tag-verified upgrade cleanup with per-item confirmation and keep option, and uninstall of `es-change-init` artifacts.
- Repo self-config: migrate this repo's `docs/config.yaml` to root `easyspec-config.yaml` and update internal references.
- Add spec guidance defining the ownership-tag contract: tag format, required presence on every easyspec-created artifact, stability across versions, and the rule that untagged files are never deleted.
- Update upgrade/migration messaging in kit documentation: legacy `docs/`-layout projects require a one-time re-init after upgrading.
