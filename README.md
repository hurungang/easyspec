# easyspec — Spec-Driven Development Kit for AI Coding Agents

[![npm version](https://img.shields.io/npm/v/@myaider/easyspec.svg)](https://www.npmjs.com/package/@myaider/easyspec)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Downloads](https://img.shields.io/npm/dm/@myaider/easyspec.svg)](https://www.npmjs.com/package/@myaider/easyspec)

**One `init` command. A team of AI agents. Your entire software lifecycle — managed by specs, not chaos.**

Supports **GitHub Copilot**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, and **Codex**.

> Built on the ideas of [OpenSpec](https://openspec.dev/) — the spec-driven development framework. Our spec format, agent delegation model, and change lifecycle are derived from OpenSpec's concepts. Thanks to the OpenSpec team.

## Install

**Recommended** — install globally:

```bash
npm install -g @myaider/easyspec
```

**Try without installing:**

```bash
npx @myaider/easyspec init
```

## Usage

### Init

```bash
easyspec init
```

Run interactively, the CLI asks two questions:

1. **Harness** — which coding agent to install for (Copilot, OpenCode, Cursor, Windsurf, Claude Code, Codex).
2. **Scope** — install into the current project, or globally into your user profile.

You can skip the prompts with flags:

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--agent` | `copilot`, `opencode`, `cursor`, `windsurf`, `claude-code`, `claude`, `codex` | interactive | Target coding agent |
| `--scope` | `project`, `global` | interactive | Install scope |
| `--workspace` | `<path>` | cwd | Project folder for `--scope project` |
| `--ide` | `auto`, `vscode`, `vscode-insiders`, `cursor`, `windsurf` | `auto` | IDE for user-level sync |
| `--force` | — | false | Overwrite existing files |
| `--dry-run` | — | false | Preview without writing |
| `--no-ide-user-sync` | — | false | Skip IDE user-folder sync in global mode |
| `--tech-model` | `<name>` | `auto` | Model for technical agents |
| `--non-tech-model` | `<name>` | `auto` | Model for non-technical agents |
| `--model-preset` | `balanced`, `speed`, `quality` | — | Apply a preset model pair |

Models default to **`auto`** — no need to pick one.

### Destination mapping

**Project scope** (`--scope project`):

| Agent | Prompts | Agents | Skills |
|-------|---------|--------|--------|
| `copilot` | `<ws>/.copilot/prompts/` | `<ws>/.copilot/agents/` | `<ws>/.github/skills/` |
| `opencode` | `<ws>/.opencode/commands/` | `<ws>/.opencode/agents/` | `<ws>/.opencode/skills/` |
| `cursor` | `<ws>/.cursor/prompts/` | `<ws>/.cursor/agents/` | `<ws>/.cursor/skills/` |
| `windsurf` | `<ws>/.windsurf/prompts/` | `<ws>/.windsurf/agents/` | `<ws>/.windsurf/skills/` |
| `claude-code` / `claude` | `<ws>/.claude/prompts/` | `<ws>/.claude/agents/` | `<ws>/.claude/skills/` |
| `codex` | `<ws>/.codex/prompts/` | `<ws>/.codex/agents/` | `<ws>/.codex/skills/` |

**Global scope** (`--scope global`): same paths under `~/` instead of `<ws>/`. Global mode also syncs prompts and agents to detected IDE user folders for `copilot`, `cursor`, and `windsurf` (disable with `--no-ide-user-sync`).

### Examples

```bash
# Interactive — pick harness and scope
easyspec init

# Copilot in the current project
easyspec init --agent copilot --scope project

# OpenCode globally
easyspec init --agent opencode --scope global

# Claude Code with a model preset
easyspec init --agent claude-code --scope project --model-preset balanced

# Preview without writing
easyspec init --agent opencode --dry-run
```

### What is installed

**Commands:** `es-change-init`, `es-change-propose`, `es-change-apply`, `es-change-refinement`, `es-change-fix`, `es-change-review`, `es-change-update-master`, `es-quick-fix`

**Agents:** `es-product-owner`, `es-ux-specialist`, `es-architect`, `es-database-designer`, `es-developer`, `es-tester`, `es-document-reviewer`

**Skill:** `es-change-lifecycle`

## Acknowledgements

This project builds on [OpenSpec](https://openspec.dev/) — a spec-driven development framework. The spec format, agent delegation model, and change lifecycle are derived from OpenSpec's concepts. Thanks to the OpenSpec team for the foundational ideas.

## License

MIT
