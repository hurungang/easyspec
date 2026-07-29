# easyspec

Spec-driven development kit for agentic coding tools — a shared set of prompts (commands), custom agent definitions, and skills that orchestrate a software engineering agent team through the full change lifecycle.

Supports **GitHub Copilot**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, and **Codex**.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         easyspec Kit                                 │
│                                                                      │
│  templates/core/  ──  shared canonical source                       │
│                                                                      │
│  ┌─────────────────────┐    ┌────────────────────┐    ┌───────────┐ │
│  │      prompts/        │    │      agents/        │    │  skills/  │ │
│  │  (7 command prompts) │────│  (7 specialist      │────│           │ │
│  │                      │    │   agents)            │    │           │ │
│  └─────────────────────┘    └────────────────────┘    └───────────┘ │
│                                                                      │
│  CLI (easyspec init) ──  transforms & installs per target tool      │
└──────────────────────────────────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
    ┌──────────┐              ┌──────────┐              ┌──────────┐
    │ .copilot │              │.opencode │              │  .claude │
    │ prompts/ │              │ prompts/ │              │ prompts/ │
    │ agents/  │              │ agents/  │              │ agents/  │
    │ skills/  │              │ skills/  │              │ skills/  │
    └──────────┘              └──────────┘              └──────────┘
```

## Entity Relationship Diagram

```mermaid
flowchart TD
    subgraph Skill
        CL[es-change-lifecycle<br/>Document formats<br/>Agent delegation map<br/>Master doc structure<br/>Workflow states]
    end

    subgraph Prompts["Prompts (Commands)"]
        INIT[es-change-init<br/>Initialize project config]
        PROPOSE[es-change-propose<br/>Create change doc set]
        APPLY[es-change-apply<br/>Implement change]
        REFINE[es-change-refinement<br/>Refine existing change]
        FIX[es-change-fix<br/>Fix bugs test-driven]
        REVIEW[es-change-review<br/>Audit master docs]
        UPDATE[es-change-update-master<br/>Update master from change]
    end

    subgraph Agents
        PO[es-product-owner<br/>PRD + spec-change]
        UX[es-ux-specialist<br/>HTML prototypes]
        ARCH[es-architect<br/>Architecture diagrams]
        DB[es-database-designer<br/>Data model]
        DEV[es-developer<br/>Implementation + tech-spec]
        TEST[es-tester<br/>Test plan + execution]
        DOCREV[es-document-reviewer<br/>Quality gatekeeper]
    end

    INIT --> PROPOSE

    CL --> PROPOSE
    CL --> APPLY
    CL --> REFINE
    CL --> FIX
    CL --> UPDATE
    CL --> REVIEW

    PROPOSE --> PO
    PROPOSE --> UX
    PROPOSE --> ARCH
    PROPOSE --> DB
    PROPOSE --> DEV
    PROPOSE --> TEST
    PROPOSE --> DOCREV

    APPLY --> DEV
    APPLY --> DB
    APPLY --> TEST

    REFINE --> PO
    REFINE --> UX
    REFINE --> ARCH
    REFINE --> DB
    REFINE --> DEV
    REFINE --> TEST
    REFINE --> DOCREV

    FIX --> TEST
    FIX --> DEV
    FIX --> PO
    FIX --> DOCREV

    UPDATE --> PO
    UPDATE --> UX
    UPDATE --> ARCH
    UPDATE --> DB
    UPDATE --> DEV
    UPDATE --> TEST

    DOCREV --> PO
    DOCREV --> UX
    DOCREV --> ARCH
```

**How it works:**

- **Prompts** are the conductors — each command orchestrates a workflow, delegates to agents, and manages state in `.change.yaml`.
- **Agents** are specialists — each owns specific document types and has strict DO/DON'T rules.
- **Skills** provide shared knowledge — document format conventions, master doc structure, and the agent delegation map.

### Prompt → Agent Delegation

| Prompt | Delegates To |
|--------|-------------|
| `es-change-init` | (standalone — scans project, generates config) |
| `es-change-propose` | product-owner, ux-specialist, architect, database-designer, developer, tester, document-reviewer |
| `es-change-apply` | developer, database-designer, tester |
| `es-change-refinement` | product-owner, ux-specialist, architect, database-designer, developer, tester, document-reviewer |
| `es-change-fix` | tester, developer, product-owner, document-reviewer |
| `es-change-review` | (standalone — audits master docs) |
| `es-change-update-master` | product-owner, ux-specialist, architect, database-designer, developer, tester |

### Agent → Document Ownership

| Agent | Documents |
|-------|-----------|
| `es-product-owner` | `prd.md`, `spec-change.md` |
| `es-ux-specialist` | `prototype/index.html` |
| `es-architect` | `architecture.md` |
| `es-database-designer` | `data-model.md` |
| `es-developer` | `implementation-plan.md`, `tech-spec.md`, `deployment.md`, `operations.md` |
| `es-tester` | `test-plan.md`, `demo-cases.md` |
| `es-document-reviewer` | Reviews all agent outputs before workflow advances |

### Workflow

```
es-change-init    →  Initialize project config (docs/config.yaml)

es-change-propose →  Create full change documentation set
                     (PRD, architecture, data model, implementation plan, test plan)

es-change-apply   →  Implement change, run all test layers

es-change-update-master →  Merge change into master product docs

es-change-review  →  Audit master docs for quality and freshness

es-change-fix     →  Test-driven bug fixing with fix log

es-change-refinement →  Incorporate adjustments into existing changes
```

## Install

```bash
npm install -g easyspec-prompts
```

Or run without global install:

```bash
npx easyspec-prompts init --scope project
```

## Usage

### Init — Install to a project or globally

```bash
easyspec init [options]
```

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--agent` | `copilot`, `opencode`, `cursor`, `windsurf`, `claude-code`, `claude`, `codex` | `copilot` | Target coding agent |
| `--scope` | `project`, `global` | `project` | Install scope |
| `--ide` | `auto`, `vscode`, `vscode-insiders`, `cursor`, `windsurf` | `auto` | IDE target for user-level sync |
| `--workspace` | `<path>` | cwd | Project folder for `--scope project` |
| `--force` | — | false | Overwrite existing files |
| `--dry-run` | — | false | Preview without writing |
| `--no-ide-user-sync` | — | false | Skip IDE user folder sync in global mode |
| `--tech-model` | `<name>` | — | Model for technical agents |
| `--non-tech-model` | `<name>` | — | Model for non-technical agents |
| `--model-preset` | `balanced`, `speed`, `quality` | — | Apply preset model pair |
| `--no-model-prompt` | — | false | Skip interactive model selection |

### Model Selection

During `init`, agents are classified as **technical** or **non-technical**:

| Classification | Agents |
|---------------|--------|
| Technical | `es-architect`, `es-database-designer`, `es-developer`, `es-tester` |
| Non-technical | `es-product-owner`, `es-document-reviewer`, `es-ux-specialist` |

Interactive prompts let you choose models per category, or use presets (`balanced`, `speed`, `quality`).

The CLI updates the `model:` field in each installed `*.agent.md` file.

### Destination Mapping

**Project scope** (`--scope project`):

| Agent | Prompt Destination | Agent Destination | Skill Destination |
|-------|-------------------|-------------------|-------------------|
| `copilot` | `<workspace>/.copilot/prompts/` | `<workspace>/.copilot/agents/` | `<workspace>/.github/skills/` |
| `opencode` | `<workspace>/.opencode/prompts/` | `<workspace>/.opencode/agents/` | `<workspace>/.opencode/skills/` |
| `cursor` | `<workspace>/.cursor/prompts/` | `<workspace>/.cursor/agents/` | `<workspace>/.cursor/skills/` |
| `windsurf` | `<workspace>/.windsurf/prompts/` | `<workspace>/.windsurf/agents/` | `<workspace>/.windsurf/skills/` |
| `claude-code` / `claude` | `<workspace>/.claude/prompts/` | `<workspace>/.claude/agents/` | `<workspace>/.claude/skills/` |
| `codex` | `<workspace>/.codex/prompts/` | `<workspace>/.codex/agents/` | `<workspace>/.codex/skills/` |

**Global scope** (`--scope global`): same under `~/` instead of `<workspace>/`.

Global mode also syncs to detected IDE user folders for `copilot`, `cursor`, and `windsurf` (disable with `--no-ide-user-sync`).

## Examples

Install for Copilot in the current project:
```bash
easyspec init --scope project --agent copilot
```

Install for OpenCode globally:
```bash
easyspec init --scope global --agent opencode
```

Install for Claude Code with a specific model preset:
```bash
easyspec init --scope project --agent claude-code --model-preset balanced
```

Preview without writing:
```bash
easyspec init --scope project --agent opencode --dry-run
```

Non-interactive with explicit models:
```bash
easyspec init --scope project --agent copilot \
  --tech-model "GPT-5 (copilot)" \
  --non-tech-model "Claude Sonnet 4.5 (copilot)"
```

## Sync — Refresh templates from live source

For maintainers: refresh packaged templates from your current prompt and agent files.

```bash
easyspec sync --template-profile core
```

Options:
- `--source-prompts <path>` — Source prompt directory
- `--source-agents <path>` — Source agent directory
- `--include-agents <a,b,c>` — Explicit agent list
- `--force` — Overwrite existing files
- `--dry-run` — Preview without writing

## What is installed

### Prompts (Commands)

| File | Command |
|------|---------|
| `es-change-init.prompt.md` | `/es-change-init` |
| `es-change-propose.prompt.md` | `/es-change-propose` |
| `es-change-apply.prompt.md` | `/es-change-apply` |
| `es-change-refinement.prompt.md` | `/es-change-refinement` |
| `es-change-fix.prompt.md` | `/es-change-fix` |
| `es-change-review.prompt.md` | `/es-change-review` |
| `es-change-update-master.prompt.md` | `/es-change-update-master` |

### Agents

| File | Agent Name |
|------|-----------|
| `es-architect.agent.md` | `es-architect` |
| `es-database-designer.agent.md` | `es-database-designer` |
| `es-developer.agent.md` | `es-developer` |
| `es-document-reviewer.agent.md` | `es-document-reviewer` |
| `es-product-owner.agent.md` | `es-product-owner` |
| `es-tester.agent.md` | `es-tester` |
| `es-ux-specialist.agent.md` | `es-ux-specialist` |

### Skills

| Directory | Skill Name |
|-----------|-----------|
| `es-change-lifecycle/SKILL.md` | `es-change-lifecycle` |

## Adding new tools

To add support for a new agentic coding tool:

1. Add an entry to `TOOL_PROFILES` in `src/cli.mjs`:
   ```js
   newtool: {
     configDir: ".newtool",
     agentExt: ".agent.md",
     promptExt: ".prompt.md",
     skillDir: ".newtool/skills",
   },
   ```
2. Add the tool name to the `SUPPORTED_AGENTS` array.
3. If the tool requires different file formats, add a transform function to `TOOL_PROFILES`.

## Release

1. Bump `package.json` version.
2. Create and push a tag (e.g., `v0.1.0`).
3. Publish a GitHub Release — GitHub Actions publishes to npm.

Requires `NPM_TOKEN` repository secret.

## Notes

- All entity names use the `es-` prefix to avoid overriding user-defined agents, prompts, or skills.
- The `templates/core/` directory is the canonical shared source. Legacy `templates/copilot/` is preserved but no longer the default.
- Non-Copilot agents reuse the same Markdown payload; per-tool transformations happen at install time via `TOOL_PROFILES`.
