<!-- easyspec:managed v1 -->
# Tech Spec: templates

## Overview

Template content is the canonical source for the prompts, agents, and skills the installer renders into each target tool. Post-rework, all template content uses config-resolved paths rooted at the configurable docs folder (never a hardcoded `docs/`), and `es-change-init` was replaced by `es-init` with code-authoritative master-doc generation.

## Technical Design

- **Body files** — `templates/content/prompts/*.body.md` and `templates/content/agents/*.body.md` carry frontmatter (name/description/model/tools) plus the body; the installer's renderer (`renderEntitiesFromContent` in `src/cli.mjs`) combines them with per-tool generic shells.
- **Skill** — `templates/content/skills/es-change-lifecycle/` pairs a frontmatter wrapper (`SKILL.md`) with a body (`SKILL.body.md`); rendered/copied via `copySkillDirectory`.
- **Ownership tagging** — tags are appended to rendered output before write so they survive into every target-tool format.
- **`es-init` prompt (new)** — agent-side flow: config creation/confirmation → docs-folder confirmation → code-authoritative master-doc generation (existing docs as context; Code Scanner behavior when docs are absent or contradicted by code; graceful degradation by asking the user) → ownership tagging of all created artifacts. Writes go under `<docs-folder>/master/`.
- **Lifecycle skill** — Step 0 config-resolution rule; all directory-structure conventions rooted at `<docs-folder>/`.
- **Command rename** — `/es-change-init` removed; `/es-init` replaces it across all target tools (copilot prompt `es-init.prompt.md`, opencode/claude-code command `es-init.md`).

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `es-init` prompt | template | New init flow: config, docs-folder confirm, code-authoritative master docs, tagging (replaces the removed `es-change-init`) | `templates/content/prompts/es-init.body.md` |
| lifecycle prompt bodies | templates | es-change-propose, es-change-apply, es-change-fix, es-change-refinement, es-change-update-master, es-master-review, es-quick-fix | `templates/content/prompts/*.body.md` |
| agent bodies (7) | templates | es-architect, es-database-designer, es-developer, es-document-reviewer, es-product-owner, es-tester, es-ux-specialist | `templates/content/agents/*.body.md` |
| lifecycle skill body | template | Step 0 config rule; `<docs-folder>/` directory conventions | `templates/content/skills/es-change-lifecycle/SKILL.body.md` |
| skill wrapper | template | Skill frontmatter shell rendered per tool | `templates/content/skills/es-change-lifecycle/SKILL.md` |
| copilot prompt shell | template | Generic rendering shell for copilot prompts | `templates/copilot/prompts/_template.prompt.md` |
| copilot agent shell | template | Generic rendering shell for copilot agents | `templates/copilot/agents/_template.agent.md` |
| opencode prompt shell | template | Generic rendering shell for opencode prompts | `templates/opencode/prompts/_template.md` |
| opencode agent shell | template | Generic rendering shell for opencode agents | `templates/opencode/agents/_template.md` |

## Consumers

- Installer rendering pipeline (`src/cli.mjs`): `renderEntitiesFromContent`, `renderTemplate`, `copySkillDirectory`.
- Template/installer test suite (`tests/template.test.js`) asserts the rename and config-resolved paths.

## Removed Artifacts

- `templates/content/prompts/es-change-init.body.md` — deleted; superseded by `es-init.body.md`. Referenced only historically (also matched by `RETIRED_ARTIFACT_PATTERNS` in `src/upgrade.mjs` for cleanup).
