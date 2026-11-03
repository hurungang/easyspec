<!-- easyspec:managed v1 -->
# Feature: Configurable Docs Folder

Easyspec must never assume where a project's documentation lives. The docs location is a per-project choice, recorded once and honored everywhere.

## Capability

- During project initialization, the user chooses the folder easyspec uses for all of its project documentation; a sensible default (`easyspec-docs`) is offered and the choice is confirmed before anything is created.
- The confirmed choice is recorded in a single authoritative root-level configuration file (`easyspec-config.yaml`) at the project root.
- All easyspec project content — configuration, master documentation, and change documentation — lives under the configured folder.
- All easyspec tooling (agents, prompts, skills, installer) resolves documentation paths from that configuration; no component relies on a hardcoded documentation location.
- Existing documentation from any other tool or convention is never touched: easyspec simply works alongside it in its own folder.

## Value

- Teams can adopt easyspec in projects that already use other documentation tooling with zero risk of collision or overwrite.
- One authoritative configuration removes ambiguity for both humans and the distributed agent team about where documentation lives.

## Rules

- Initialization always presents and confirms the docs-folder choice; the default is accepted by simply confirming.
- No easyspec-generated project content is ever written outside the configured docs folder.
- Configuration is a single root-level file; multiple docs folders or nested configurations per project are not supported.
- Legacy `docs/config.yaml` projects migrate in one confirmed step: the config moves to the root with `docs_folder: docs`; existing docs content is left in place.

## Out of Scope

- Automatic migration of existing documentation content into a different docs folder (only the legacy config file is moved, with confirmation).
- Non-YAML configuration formats or environment-variable-based configuration.
