---
name: es-init
description: 'Initialize or refresh easyspec for a project — create the root config, confirm the docs folder, and generate code-authoritative master docs'
---

Initialize easyspec for this project: create or confirm `easyspec-config.yaml` at the project root, then generate master documentation under `<docs-folder>/master/` that describes the project as the code actually is today. Code is the authority — existing documentation is context, never the final word.

**Input**: No arguments needed. Run as `/es-init`.

**Placeholders**: `<docs-folder>` is resolved from the `docs_folder` setting in `easyspec-config.yaml` (default `easyspec-docs`).

---

## Step 1: Create or Confirm the Root Config

Check if `easyspec-config.yaml` exists at the project root.

- **If it does not exist**: create it (Step 1a), including confirming the docs folder.
- **If it exists and has placeholder values** (any field contains `<` and `>`, or values starting with `TODO:`): announce "Config found but not yet initialized — completing setup." and continue from Step 1a.
- **If it exists and appears populated**: confirm the docs folder with the user, then jump to Step 2 (Master Doc Generation).

### Step 1a: Confirm the docs folder

Offer the user the docs folder choice and require explicit confirmation. The default is `easyspec-docs`. Explain the choice matters: easyspec will only ever write its master docs and change docs inside this folder, so a folder already used by another documentation tool stays untouched.

### Step 1b: Populate project context

Scan the project structure and ask targeted questions to fill in the config's project context: project name and description, source code locations (frontend, backend, schema files, test directories), technology stack, project conventions, and domain knowledge. Detect what you can from files such as `package.json`, `pyproject.toml`, dependency manifests, and directory layout; ask the user to confirm detected values and fill gaps in a single batched question.

Write `easyspec-config.yaml` at the project root with the confirmed docs folder and project context. If any field could not be detected or confirmed, leave it as a descriptive placeholder starting with `TODO:` rather than guessing.

Embed the easyspec ownership tag (`easyspec:managed v1`) in the config file as a YAML comment.

---

## Step 2: Generate Master Docs (Code-Authoritative)

Generate master documentation for all standard areas under `<docs-folder>/master/`, following the Master Product Docs Structure in the es-change-lifecycle skill — product, architecture, data model, technology, QA, deployment, operations, and reference (as applicable to this project).

**Existing documentation is input context, not authority**:

- Gather any existing project documentation regardless of origin (a legacy `docs/` folder, README files, wikis exported locally, other tools' specs) and read it as context.
- When documentation and code disagree, **the code wins**. Verify claims against the actual source before writing them into master docs.
- Never modify or delete existing documentation from other sources — treat it read-only.

**When no usable documentation exists** (or it is contradicted by the code), scan the codebase directly:

- Inspect project structure, the source locations listed in `easyspec-config.yaml`'s `source` section, dependency manifests, and test layout.
- Derive master docs from what the code actually does: entry points, modules, data entities, tech stack, test strategy, deployment and operations signals (CI configs, containers, infrastructure files).

**Graceful degradation**: when code structure cannot be reliably detected (e.g. an unfamiliar layout, monorepo with mixed conventions), stop and ask the user rather than guessing. A wrong path in a master doc is worse than an unset one.

Master docs must follow the global document rules in the es-change-lifecycle skill: no code snippets, no schema code, concise scannable structure, Mermaid-only diagrams.

---

## Step 3: Tag Every Created Artifact

Embed the easyspec ownership tag (`easyspec:managed v1`) in every file created or rewritten by this flow:

- The root `easyspec-config.yaml` (as a YAML comment)
- Every generated master doc under `<docs-folder>/master/`

The tag is what allows future easyspec upgrades to identify and clean up obsolete easyspec-owned files. Files not created by easyspec are never tagged and never touched.

---

## Step 4: Confirm and Finish

Show the final config and the list of generated master docs to the user for review.

Announce:

```
## Easyspec Initialized

easyspec-config.yaml is ready at the project root.
Docs folder: <docs-folder>
Master docs generated under <docs-folder>/master/ (tagged as easyspec-managed).

All /es-* tools will now read the root config and resolve <docs-folder> from it.
Re-run /es-init anytime the project structure changes.

Next steps:
- Run /es-change-propose to start a new change
- Run /es-master-review to audit existing master docs
```

---

## Guardrails

- Never overwrite a fully-populated config without user confirmation
- Never create, move, or delete anything inside a docs folder the user did not confirm
- Never modify existing documentation from any source — it is read-only input
- If detection is ambiguous, ask the user to choose
- Leave fields as `TODO:` rather than guessing incorrectly
- Domain knowledge and conventions MUST come from the user — never fabricate business rules
- Every created artifact carries the ownership tag; no untagged file is ever treated as easyspec-owned
