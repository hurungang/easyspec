# easyspec-prompts

This repo packages your existing `change-*` prompts and the custom agent definitions they rely on, plus a CLI to install them into the right folders.

The repo keeps one canonical template payload under `templates/copilot/` and uses destination adapters per coding-agent ecosystem.

## What is included

- `templates/copilot/prompts/`
  - `change-apply.prompt.md`
  - `change-fix.prompt.md`
  - `change-init.prompt.md`
  - `change-propose.prompt.md`
  - `change-refinement.prompt.md`
  - `change-review.prompt.md`
  - `change-update-master.prompt.md`
- `templates/copilot/agents/`
  - `architect.agent.md`
  - `database_designer.agent.md`
  - `developer.agent.md`
  - `document_reviewer.agent.md`
  - `product_owner.agent.md`
  - `tester.agent.md`
  - `ux_specialist.agent.md`

## Install

Install globally:

```bash
npm install -g easyspec-prompts
```

Or run without global install:

```bash
npx easyspec-prompts init --scope project
```

## Init command

```bash
easyspec init [options]
```

Options:

- `--agent copilot|cursor|windsurf|claude-code|codex` (default `copilot`)
- `--scope project|global`
  - `project`: copy to agent-specific project folder
  - `global`: copy to agent-specific user folder and optionally IDE user folders
- `--ide auto|vscode|vscode-insiders|cursor|windsurf`
- `--workspace <path>` for project mode (default is current folder)
- `--force` overwrite existing files
- `--dry-run` preview copy operations
- `--no-ide-user-sync` skip IDE user-folder sync in global mode
- `--tech-model <name>` model for technical agents
- `--non-tech-model <name>` model for non-technical agents
- `--model-preset <balanced|speed|quality>` apply preset model pairs
- `--no-model-prompt` skip interactive model selection prompt

During `init`, the CLI asks the user to select:

- optional preset first (`balanced`, `speed`, `quality`, or none)
- then one model for technical agents (`architect`, `database_designer`, `developer`, `tester`)
- then one model for non-technical agents (`product_owner`, `document_reviewer`, `ux_specialist`, and others)

If a preset is selected, the next prompts default to the preset values so the user can press Enter to keep them or override them.

Then it updates installed `*.agent.md` files automatically and prints where those files are located.

## Agent destination mapping

Project scope:

- `copilot` -> `<workspace>/.copilot/{prompts,agents}`
- `cursor` -> `<workspace>/.cursor/{prompts,agents}`
- `windsurf` -> `<workspace>/.windsurf/{prompts,agents}`
- `claude-code` -> `<workspace>/.claude/{prompts,agents}`
- `codex` -> `<workspace>/.codex/{prompts,agents}`

Global scope:

- `copilot` -> `~/.copilot/{prompts,agents}`
- `cursor` -> `~/.cursor/{prompts,agents}`
- `windsurf` -> `~/.windsurf/{prompts,agents}`
- `claude-code` -> `~/.claude/{prompts,agents}`
- `codex` -> `~/.codex/{prompts,agents}`

When `--scope global` and agent is `copilot`, `cursor`, or `windsurf`, the CLI can also sync into detected IDE user folders (`.../User/prompts` and `.../User/agents`) unless `--no-ide-user-sync` is used.

## How IDE detection works

The CLI checks known user config paths in this order:

1. `vscode`
2. `vscode-insiders`
3. `cursor`
4. `windsurf`

If `--ide auto` is used, the first detected IDE user folder is selected.

## Examples

Project-only install:

```bash
easyspec init --scope project --agent copilot
```

Global install with auto IDE sync:

```bash
easyspec init --scope global --agent cursor --ide auto
```

Global install to a specific IDE user folder:

```bash
easyspec init --scope global --agent windsurf --ide windsurf
```

Preview without writing files:

```bash
easyspec init --scope global --agent claude-code --dry-run
```

Non-interactive init with explicit model values:

```bash
easyspec init --scope project --agent copilot --tech-model "GPT-5 (copilot)" --non-tech-model "Claude Sonnet 4.5 (copilot)"
```

Preset-based init:

```bash
easyspec init --scope project --agent copilot --model-preset balanced
```

Preset with explicit override:

```bash
easyspec init --scope project --agent copilot --model-preset speed --tech-model "GPT-5 (copilot)"
```

## Sync templates from your live source

Use this to refresh packaged templates from your current prompt and agent files:

```bash
easyspec sync --template-profile copilot
```

Optional overrides:

- `--source-prompts <path>`
- `--source-agents <path>`
- `--include-agents architect,developer,tester`
- `--force`
- `--dry-run`

By default, sync:

- copies all `change-*.prompt.md` from your source prompt folder
- infers required agent names from prompt content (`**<name> agent**`)
- copies matching `<name>.agent.md` files from your source agent folder

## Release (npm + GitHub Actions)

This repository includes a release workflow that publishes to npm on GitHub Release publish events.

Required repository secret:

- `NPM_TOKEN`

To release:

1. Bump `package.json` version.
2. Create and push a tag (for example `v0.1.0`).
3. Publish a GitHub Release from that tag.
4. The workflow publishes the package to npm.

## Notes

- This package intentionally contains only prompt and agent definition assets plus installer logic.
- If your prompt flow depends on additional skills, include and package those separately.
- Non-Copilot agents currently reuse the same markdown payload with different destination roots. If you later maintain agent-specific prompt formats, add additional profiles under `templates/<profile>/` and update the profile map in `src/cli.mjs`.
