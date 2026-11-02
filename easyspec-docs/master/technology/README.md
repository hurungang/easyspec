<!-- easyspec:managed v1 -->
# Easyspec Technology Index

Master technology documentation for the easyspec kit. Easyspec is a no-build-step Node.js CLI (ESM) that installs prompts, agents, and skills into agentic coding tools (copilot, opencode, claude-code), driven by a configurable docs folder declared in a root `easyspec-config.yaml`.

## Modules

| Module | Scope | Tech Spec |
|--------|-------|-----------|
| `cli-installer` | CLI entry, argument parsing, target-tool profiles, template rendering pipeline, install/sync commands, docs-folder confirmation | [modules/cli-installer/tech-spec.md](modules/cli-installer/tech-spec.md) |
| `config` | Docs Folder Resolver: reads `easyspec-config.yaml`, derives master/changes paths, scaffolds config | [modules/config/tech-spec.md](modules/config/tech-spec.md) |
| `ownership` | Ownership tag contract: embeds and detects the managed-artifact marker in every markdown/YAML artifact | [modules/ownership/tech-spec.md](modules/ownership/tech-spec.md) |
| `upgrade` | Install manifest plus tag-verified upgrade cleanup with interactive per-file confirmation | [modules/upgrade/tech-spec.md](modules/upgrade/tech-spec.md) |
| `templates` | Canonical template content: `es-init` and lifecycle prompts, agent bodies, lifecycle skill, per-tool generic templates | [modules/templates/tech-spec.md](modules/templates/tech-spec.md) |

## Key Concepts

- **Docs Folder Resolver** — all easyspec project paths derive from a configurable docs folder (default `easyspec-docs`); malformed config degrades silently to the default.
- **Ownership Tag Contract** — every artifact the installer or `es-init` creates is tagged `<!-- easyspec:managed v1 -->` (YAML form `# easyspec:managed v1`); untagged files are never deleted or overwritten.
- **Tag-verified upgrade cleanup** — retired artifacts are offered for confirmed deletion only when tag-verified on disk, either via a prior install manifest or known retired-artifact name patterns (e.g. the removed `es-change-init`).

Source of truth for code layout lives in each module's Code Reference Map; module specs were derived from change `docs/changes/easyspec-config-and-init-rework`.
