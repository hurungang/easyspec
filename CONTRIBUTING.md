# Contributing to easyspec

easyspec welcomes community contributions — new prompt templates, agent definitions, skills, and CLI improvements.

## Before you contribute

For significant changes (new agent type, new workflow, new tool support), open an issue first to align on scope and direction. For bug fixes, small improvements, or new body templates — just open a PR.

## Development setup

```bash
git clone https://github.com/hurungang/easyspec.git
cd easyspec
npm install
```

### Project structure

```
easyspec/
├── src/cli.mjs              # CLI entry point
├── templates/
│   ├── content/             # Canonical body files (prompts, agents, skills)
│   ├── copilot/             # Copilot-specific templates
│   └── opencode/            # OpenCode-specific templates
```

### Testing changes locally

```bash
# Test init with dry run
node src/cli.mjs init --scope project --agent copilot --dry-run

# Test for real in a temp project
mkdir /tmp/test-easyspec && cd /tmp/test-easyspec
node /path/to/easyspec/src/cli.mjs init --scope project --agent opencode
```

## Adding a new prompt or agent

Only one file needed — a content body file with frontmatter:

```
templates/content/prompts/<name>.body.md   (for commands)
templates/content/agents/<name>.body.md    (for agents)
```

See existing files in `templates/content/` for the frontmatter format.

## Adding a new tool

1. Add an entry to `TOOL_PROFILES` in `src/cli.mjs`
2. Add the tool name to the `SUPPORTED_AGENTS` array
3. Create a `templates/<tool>/` directory with `_template` files for prompts and agents

## Pull request checklist

- [ ] Changes tested locally with `--dry-run` and a real init
- [ ] New entities have frontmatter with `name` and `description`
- [ ] No template files added — only body files in `templates/content/`
- [ ] PR description explains what the change does and why

## License

By contributing, you agree that your contributions are licensed under the same MIT license as the project.
