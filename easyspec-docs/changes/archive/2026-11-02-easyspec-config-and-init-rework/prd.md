# PRD: easyspec-config-and-init-rework

## Epic Overview

Easyspec currently hardcodes `docs/` as the folder where all of its product documentation lives, and its entry-point command `es-change-init` is misleadingly named — it initializes the whole project for easyspec, not an individual change. When teams adopt easyspec in a project that already has a `docs/` folder managed by another tool or kit, easyspec collides with, overrides, or mixes into those existing documents, making adoption risky and cleanup painful. This epic reworks adoption and configuration: the docs folder becomes user-configurable via a root-level `easyspec-config.yaml`, the init command is renamed to `es-init`, initialization generates master documentation that reflects the actual current state of the codebase, and every easyspec-owned artifact carries an ownership tag so upgrades can safely remove obsolete files without ever touching files easyspec does not own. Together these changes make easyspec safe to adopt in existing projects and safe to upgrade over time — the two biggest adoption blockers for a distributed development kit.

## Business Goals

- Enable adoption of easyspec in projects that already use other documentation tooling, with zero risk of overwriting third-party docs — measured by successful init in a project with a pre-existing `docs/` folder and no modifications to non-easyspec files.
- Reduce upgrade friction to a single guided step: every version upgrade removes only confirmed easyspec-owned obsolete files, with zero reported cases of user-authored files deleted by an upgrade.
- Eliminate user confusion at first contact: the entry-point command name (`es-init`) accurately describes what it does, reducing support questions and misinvocations.
- Increase trust in generated documentation: after init, master docs describe the project as the code actually is today, not as stale prose claims it to be — validated by init succeeding on projects whose existing docs contradict the code.
- Keep the kit self-describing: every easyspec artifact is machine-identifiable as easyspec-owned, enabling future automated lifecycle operations (cleanup, migration, upgrade) without user bookkeeping.

## Users & Personas

- **Existing-project adopter (primary)** — A developer bringing easyspec into a live codebase that may already have `docs/`, other agent-tool configs, or competing conventions. Needs: non-destructive init, configurable doc location, docs grounded in real code, easy rollback/removal.
- **Greenfield starter** — A developer starting a fresh project with easyspec from day one. Needs: fast setup with sensible defaults (default docs folder, no forced decisions), no awareness of migration concerns required.
- **Kit maintainer / upgrader** — A developer upgrading easyspec to a new version in an already-initialized project. Needs: stale files from old versions removed reliably, user-owned files never touched, explicit confirmation before any deletion.
- **Agent-team members (es-product-owner, es-developer, etc.)** — The distributed agents themselves. Need: unambiguous knowledge of where project docs live and which artifacts they own, read from configuration rather than hardcoded paths.

## User Stories

- As an existing-project adopter, I want to choose which folder easyspec uses for its documentation during init, so that easyspec never mixes with my existing `docs/` folder from another tool.
- As an existing-project adopter, I want a root-level `easyspec-config.yaml` that records my docs-folder choice, so that all easyspec tooling reads one authoritative configuration.
- As an existing-project adopter, I want easyspec to treat my existing documentation (from any source) as input context when generating master docs, so that prior documentation effort is preserved and incorporated.
- As an existing-project adopter, I want master docs generated to reflect the current state of my code — prioritizing code over stale documentation when they disagree — so that my team trusts the generated docs.
- As any adopter, I want every file easyspec creates to carry an easyspec ownership tag, so that it is always clear which files the kit owns.
- As an upgrader, I want the installer to remove obsolete easyspec-owned files from previous versions (such as the retired `es-change-init` artifacts), so that no stale or conflicting files remain after upgrade.
- As an upgrader, I want the installer to never delete any file that lacks the easyspec ownership tag, so that my own files (even identically named ones) are never at risk.
- As an upgrader, I want to be asked to confirm each deletion, with the option to keep any old file, so that I retain final control over my workspace.
- As a greenfield starter, I want init to create the docs folder with a sensible default, so that I can accept defaults and get productive immediately.
- As an agent-team member, I want to resolve the docs folder from `easyspec-config.yaml` instead of a hardcoded path, so that I work correctly in every configured project.

## Acceptance Criteria

- Running init on a fresh project creates `easyspec-config.yaml` at the project root and creates the default docs folder `easyspec-docs` unless the user chooses a different folder name.
- During init the user is shown the docs-folder choice and must confirm it (default offered is `easyspec-docs`); the confirmed value is stored in `easyspec-config.yaml`.
- All easyspec-generated project content — configuration, master docs, change docs — lives under the configured docs folder; no easyspec project content is written to a hardcoded `docs/` path.
- All easyspec prompts, agents, skills, and internal tooling resolve the docs folder from `easyspec-config.yaml`; no template or CLI code references a hardcoded `docs/` project path.
- The `es-change-init` command/prompt is replaced by `es-init` with equivalent-plus-new behavior (config creation, docs-folder confirmation, master doc generation, ownership tagging).
- Running init generates master docs for all standard areas (product, architecture, data model, technology, QA, deployment, operations, reference as applicable) that describe the project's current actual state.
- When existing project documentation is present (regardless of origin), init uses it as input context; when documentation and code disagree, the generated docs follow the code.
- When no usable documentation exists, init scans the codebase to produce the master docs.
- Every artifact easyspec creates for users — master docs, change docs, the root config file, and installed prompts/agents/skills where applicable — embeds an easyspec ownership marker identifiable programmatically.
- Upgrading from a version that installed `es-change-init` removes those old artifacts, and only files bearing the easyspec ownership tag are deletion candidates.
- The upgrade flow presents each deletion candidate for user confirmation and honors a per-file or batched "keep" choice; declined deletions are skipped without error.
- No file lacking the easyspec ownership tag is ever deleted or overwritten by init or upgrade, including user files that share a name with an easyspec artifact.

## Out of Scope

- Migration tooling that relocates an existing project's docs from a legacy `docs/` layout into the new configured folder.
- Supporting multiple easyspec docs folders or per-workspace nested configurations in one project.
- Automatic, unattended upgrades (all deletions remain confirm-by-default).
- Changing the distributed agent team roles, the change lifecycle workflow states, or any agent's responsibilities beyond path resolution.
- Non-YAML configuration formats or environment-variable-based configuration.
- Content format changes to master or change documents (structure and required sections are unchanged).
- Rebranding or renaming any other commands, prompts, agents, or skills besides `es-change-init` → `es-init`.

## Dependencies & Constraints

- Depends on the existing npm distribution model: templates in `templates/content/` transformed at install time per target agent tool (copilot, opencode, etc.); the rework must remain compatible with that transformation pipeline.
- Constrained by the "es-" prefix convention: all easyspec-owned entities keep the prefix to avoid colliding with user-defined agents, prompts, and skills.
- No build step exists — source is distributed directly — so ownership tagging must survive template transformation and remain intact in every target tool's format.
- Deletion safety depends entirely on the reliability of the ownership tag; the tag scheme must be stable across versions so future upgrades can identify artifacts tagged by this and earlier releases.
- Master-doc generation quality depends on codebase scannability; init must degrade gracefully (ask the user) when code structure cannot be reliably detected.
- Backward compatibility: projects initialized with the legacy hardcoded `docs/` layout will require a manual one-time re-init; the PRD accepts this but docs/upgrade messaging must state it clearly.
