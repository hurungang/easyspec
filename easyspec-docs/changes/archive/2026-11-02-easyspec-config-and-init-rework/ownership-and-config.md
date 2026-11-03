# Ownership Tag Contract & `easyspec-config.yaml` Schema

## Ownership Tag Contract

### Safety rule (must never be violated)

> **Untagged files are never deleted.** Neither init nor the upgrade flow will ever delete
> or overwrite a file that does not carry the easyspec ownership tag — including user files
> that share a name with an easyspec artifact.

### Tag format

The tag is a stable, version-carrying marker embedded as a comment so it survives in any
text-based artifact format (markdown, YAML, HTML):

```
<!-- easyspec:managed v1 -->
```

- **Marker core**: the substring `easyspec:managed v1`.
- **Detection** is a plain substring match on the marker core, so it works regardless of
  the target tool's wrapper format (copilot `.prompt.md`, opencode/claude-code command
  `.md`, skill `SKILL.md`, generated master/change docs, YAML config).
- **YAML files** use the same marker core in a YAML comment form:
  `# easyspec:managed v1`.
- **Version stability**: the `v1` suffix is part of the contract. Future releases that
  change the tag scheme must still recognize `easyspec:managed v1` artifacts so upgrades
  remain safe across versions.

### Where the tag is required

Every artifact easyspec creates for users:

- The root `easyspec-config.yaml` (YAML comment form).
- Generated master docs (`<docs-folder>/master/**`) and change docs
  (`<docs-folder>/changes/**`) created by `es-init` and the change lifecycle.
- Installed prompts, agents, and skills (HTML-comment form, appended to rendered output —
  the tag survives the per-target-tool template transformation because it is applied after
  rendering, at write time).

### Who consumes the tag

The installer's upgrade-cleanup logic. A file becomes a deletion candidate only when ALL
of the following hold:

1. It appears in the previous install manifest **or** matches a known retired artifact
   name (e.g. `es-change-init`).
2. It is no longer produced by the new version.
3. It is verified to carry the ownership tag on disk.

Even then, the user is asked to confirm each deletion and may keep any file.

## Install Manifest

- Location: `.easyspec/manifest.json` **inside the installed tool directory** —
  e.g. `<workspace>/.github/.easyspec/manifest.json` (project scope) or
  `~/.copilot/.easyspec/manifest.json` (global scope).
- Contents: manifest format version, install timestamp, and the list of installed files
  (paths relative to the tool directory) each with a content hash.
- Written after every real (non-`--dry-run`) install; `--dry-run` never writes it.

## `easyspec-config.yaml` Schema

Location: project root. Single authoritative easyspec configuration; all agents, prompts,
skills, and CLI code resolve paths from it.

```yaml
# easyspec:managed v1
# Easyspec configuration — resolved by every es- agent, prompt, and skill.

# Docs folder: where all easyspec project content lives (master docs, change docs).
docs_folder: easyspec-docs

project:
  name: <project name>
  description: <one-sentence description>

# Source code locations — used by agents to resolve code references
source:
  frontend: null
  backend: null
  schema: null
  tests: []

# Technology stack — context for agents, not prescriptive
tech_stack:
  frontend: null
  backend: null
  database: null
  auth: null
  infra: null

# Key project conventions — agents follow these when making decisions
conventions: []

# Domain knowledge — business rules agents must always know
domain: []
```

- `docs_folder` default: `easyspec-docs`. Confirmed with the user during init (installer
  or `es-init`); the confirmed value is written here.
- The remaining sections carry over the project context previously stored in the legacy
  `docs/config.yaml`.
- Derived paths: master docs at `<docs-folder>/master/`, change docs at
  `<docs-folder>/changes/`.

## Legacy layout caveat

Projects initialized with the old hardcoded `docs/` layout (e.g. `docs/config.yaml`,
`docs/master/`, `docs/changes/`) are **not** migrated by this change. They require a
one-time manual re-init: run init / `/es-init` again, confirm the docs folder, and move
or re-generate master docs under the configured folder. The easyspec source repo itself
keeps its historical `docs/changes/` content in place for reference.
