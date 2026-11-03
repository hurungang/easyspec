---
name: es-change-update-master
description: es-change-update-master command
---

Update master product docs by applying a completed change's documentation to the canonical `<docs-folder>/master/` folder.

**Input**: Optionally specify a change name (e.g., `/es-change-update-master add-dark-mode`). If omitted, list available changes and ask the user to select.

---

## Step 1: Select the Change

If a change name is provided, use it.

Otherwise, list available changes in `<docs-folder>/changes/` (excluding `archive/`).

Announce: **"Updating master docs from change: `<name>`"**

---

## Step 2: Read Change Context

Read all files in `<docs-folder>/changes/<name>/`:
1. `.change.yaml` — Status, scope flags, which agents have completed
2. `prd.md` — What was built
3. `spec-change.md` — Spec areas affected and update instructions
4. `implementation-plan.md` — What was implemented (all tasks should be checked)
5. `tech-spec.md` — Technical spec with Code Reference Map (source of truth for `<docs-folder>/master/technology/`)
6. `test-plan.md` — Test coverage (source of truth for `<docs-folder>/master/qa/`)
7. `architecture.md` — (if exists) Architecture changes
8. `data-model.md` — (if exists) Data model changes
9. `deployment.md` — (if exists) Deployment changes
10. `operations.md` — (if exists) Operations changes

Also read:
- `.github/skills/es-change-lifecycle/SKILL.md` for master doc structure conventions
- `easyspec-config.yaml` for project source paths and conventions

---

## Step 3: Validate Implementation is Complete

Check `.change.yaml`:
- `status` should be `implemented` (warn but don't block if not)
- `agents_complete.developer` should be `true`
- `agents_complete.tester` should be `true`

Check `implementation-plan.md` for any unchecked tasks `- [ ]`.

If incomplete tasks found, warn the user:
> "Warning: implementation-plan.md has unchecked tasks. Master docs update should happen after full implementation. Continue anyway? (yes/no)"

---

## Step 4: Update Product Docs — product-owner Agent

Delegate to **es-product-owner agent**:
> "Read `<docs-folder>/changes/<name>/prd.md` and `<docs-folder>/changes/<name>/spec-change.md`. 
> Update master product docs in `<docs-folder>/master/product/`:
> 1. If this is a new feature: create `<docs-folder>/master/product/features/<feature-name>.md` following the PRD format
> 2. If this modifies an existing feature: update the relevant `<docs-folder>/master/product/features/<name>.md`
> 3. If this changes strategic direction: update `<docs-folder>/master/product/product-vision.md`
> 4. Apply the 'Spec Update Instructions' from `spec-change.md` to relevant `openspec/specs/` files
>
> Docs must be code-free, business language, no implementation details."

---

## Step 5: Update UX Prototype — ux-specialist Agent

Always run this step (regardless of `has_ui_changes` flag) — changes often touch UI even when not flagged.

Delegate to **es-ux-specialist agent** with two sub-tasks:

**Sub-task A — Reconcile change prototype with actual implementation:**
> "Read `<docs-folder>/changes/<name>/tech-spec.md`, `<docs-folder>/changes/<name>/prd.md`, and `<docs-folder>/changes/<name>/prototype/index.html` (if it exists).
>
> For each UI component listed in the tech-spec's Code Reference Map, examine the actual source file to understand what was really built — screens, flows, field names, interactions.
>
> Update `<docs-folder>/changes/<name>/prototype/index.html` so it accurately reflects the final implementation, not the original design proposal. If no prototype existed, create one from scratch based on the real components.
>
> Goal: the change prototype must match what was actually shipped."

**Sub-task B — Incorporate into master prototype:**
> "Read the updated `<docs-folder>/changes/<name>/prototype/index.html` and the current master prototype under `<docs-folder>/master/ux/`.
>
> Resolve the master prototype layout first:
> - If `<docs-folder>/master/ux/prototype/index.html` exists, it is the hub — read it and the module page(s) relevant to this change.
> - If only `prototype/index.html` exists, it holds both the hub and the content.
>
> Integrate the new/updated flows from the change prototype. The master prototype mocks the FULL product — add the new screens/flows without breaking existing ones.
>
> **Update the smallest file that owns the content:**
> - Modularized: update the specific `prototype/modules/<module>.html` page; touch `prototype/index.html` only for global navigation, shared styles, or the landing screen.
> - Single-file: keep one `prototype/index.html` unless the modularization criteria are met.
>
> **Evaluate modularization while you are here:** if the master prototype now exceeds the soft limit (1,500 lines / 120 KB) or covers 3+ independently changing modules, split it per the es-change-lifecycle **Master prototype modularization** rules (`prototype/index.html` hub + `prototype/modules/<module>.html` + `prototype/shared/`). Relocate content — never copy it — and link every module from the hub.
>
> Keep every page openable directly from disk: relative `<link rel="stylesheet">` and classic `<script src>` only; no `fetch`, no ES modules, no build step.
>
> If no master prototype exists yet at `<docs-folder>/master/ux/`, create `prototype/index.html` from the change prototype as the starting point."

If the tech-spec has no UI component references AND no prototype exists in the change, the ux-specialist may skip with a note: `"No UI components found in tech-spec — prototype update skipped."`

---

## Step 6: Update Architecture Docs — architect Agent (if has_architecture_changes)

If `.change.yaml` shows `has_architecture_changes: true`:

Delegate to **es-architect agent**:
> "Read `<docs-folder>/changes/<name>/architecture.md`.
> Apply the 'Master Arch Update Instructions' section from the change doc to update `<docs-folder>/master/architecture/`:
> 1. Update `<docs-folder>/master/architecture/system-overview.md` if overall system changed
> 2. Update or create `<docs-folder>/master/architecture/modules/<module>/architecture.md` for module-level changes
> 3. All diagrams must use Mermaid, max 15 nodes, no implementation details, no code."

---

## Step 7: Update Data Model Docs — database-designer Agent (if has_db_changes)

If `.change.yaml` shows `has_db_changes: true`:

Delegate to **es-database-designer agent**:
> "Read `<docs-folder>/changes/<name>/data-model.md`, `easyspec-config.yaml`, and the current contents of `<docs-folder>/master/data-model/overview.md`.
>
> Apply the 'Master Data Model Update Instructions' section from the change doc to update `<docs-folder>/master/data-model/`:
>
> **1. Update `<docs-folder>/master/data-model/overview.md`**
> - For each new or modified domain: add or update the Mermaid `erDiagram` block for that domain.
> - Each erDiagram must include: entity names, key business attributes (id, name, status, type, foreign-key references, boolean flags), and all relationships with cardinality labels.
> - If overview.md is empty or missing these sections: write the full content — domain sections plus a Cross-Domain Relationship Map diagram.
> - Preserve all existing domain sections that are NOT touched by this change.
> - Add a `**Source**: \`<schema-file-path>\`` line beneath each diagram.
>
> **2. Update `<docs-folder>/master/data-model/modules/<module>/entities.md`**
> - For each affected domain: add/update the Mermaid `erDiagram` block for that module (same diagram as in overview.md for that domain).
> - Below the diagram, include the entity name table with one-line descriptions.
> - Add/update a `**Source**: \`<schema-file-path>\`` line.
>
> **What to include vs. exclude:**
> - INCLUDE: entity names, business attributes (generic types: uuid, string, enum, boolean, int, datetime, json), relationships, foreign-key references shown as uuid fields
> - EXCLUDE: SQL DDL, ORM column definitions, database-specific types (VARCHAR, TIMESTAMP WITH TIME ZONE), indexes, constraints, migration scripts
> - Mermaid erDiagram attribute blocks are NOT schema code — they are the business domain model and are required."

---

## Step 8: Update Technology Docs — developer Agent

Delegate to **es-developer agent**:
> "Read `<docs-folder>/changes/<name>/tech-spec.md` and `easyspec-config.yaml`.
> Update master technology docs in `<docs-folder>/master/technology/`:
> 1. Update or create `<docs-folder>/master/technology/modules/<module>/tech-spec.md` for each affected module
> 2. Merge the Code Reference Map entries from the change's tech-spec into the master module tech-spec
> 3. Remove any Code Reference Map entries that are now stale (functions renamed/moved/deleted)
> 4. Verify each file path in the Code Reference Map exists in the workspace
> 5. Update `<docs-folder>/master/technology/README.md` index if new modules were added
> 6. If a module tech-spec or its Code Reference Map exceeds the soft limit (500 lines / 150 map rows) **and** spans multiple independent modules, split it by module per the es-change-lifecycle modularization rules — keep `README.md` as the hub and link every module
>
> The Code Reference Map is the developer's primary code navigation tool — accuracy is critical.
> Load `.github/skills/es-change-lifecycle/SKILL.md` for format requirements."

---

## Step 9: Update QA Docs — tester Agent

Delegate to **es-tester agent**:
> "Read `<docs-folder>/changes/<name>/test-plan.md` and `easyspec-config.yaml`.
> Update master QA docs in `<docs-folder>/master/qa/`:
> 1. Update or create `<docs-folder>/master/qa/test-plans/<module>-test-plan.md` for affected modules
> 2. Update test file references to point to actual test files created during implementation (paths from `easyspec-config.yaml` `source.tests`)
> 3. Update `<docs-folder>/master/qa/testing-strategy.md` if the overall strategy changed
>
> No test code in documentation — reference test files only."

---

## Step 9b: Update Master Demo Cases — tester Agent

After updating the QA test plans, also update the master demo-cases file.

Delegate to **es-tester agent**:
> "Read `<docs-folder>/changes/<name>/demo-cases.md` (the curated demo scenarios for this change).
>
> Update `<docs-folder>/master/qa/demo-cases.md` — the whole-product demo cases file:
> 1. If `<docs-folder>/master/qa/demo-cases.md` does not exist, create it with the structure below.
> 2. If it exists, merge the change's scenarios in — add any new patterns that aren't already present. Do NOT remove existing patterns from other changes.
> 3. Remove any pattern that refers to a test that no longer exists (stale reference).
>
> **File format for `<docs-folder>/master/qa/demo-cases.md`**:
> ```markdown
> # Master Demo Cases
> <!-- Whole-product curated demo — one representative scenario per feature -->
> <!-- Use with: /demo-app --cases <docs-folder>/master/qa/demo-cases.md -->
> <!-- Updated automatically by /es-change-update-master -->
>
> ## Grep Patterns
> <!-- Playwright --grep filter: one pattern per line, joined with | -->
> <!-- Format: <Describe suite name> › <test name> -->
> - <pattern 1>
> - <pattern 2>
> ...
>
> ## Scenario Index
> | # | Feature | What it Shows | Change | Spec File |
> |---|---------|---------------|--------|-----------|
> | 1 | <feature> | <one sentence> | <change-name> | <spec file> |
> ...
> ```
>
> After merging, verify each grep pattern in the `## Grep Patterns` section still matches a real test in `e2e/tests/`. Remove any stale patterns and note them."

---


## Step 10: Update Deployment Docs (if has_deployment_changes)

If `.change.yaml` shows `has_deployment_changes: true`:

Delegate to **es-developer agent**:
> "Read `<docs-folder>/changes/<name>/deployment.md`.
> Apply the 'Master Deployment Update Instructions' from the change doc to update `<docs-folder>/master/deployment/`:
> Update relevant deployment instruction files with new configuration, infrastructure changes, migration steps."

---

## Step 11: Update Operations Docs (if has_operations_changes)

If `.change.yaml` shows `has_operations_changes: true`:

Delegate to **es-developer agent**:
> "Read `<docs-folder>/changes/<name>/operations.md`.
> Apply the 'Master Operations Update Instructions' from the change doc to update `<docs-folder>/master/operations/`:
> Update monitoring, alerting, and runbook files."

---

## Step 12: Update Reference Docs (if applicable)

If `<docs-folder>/changes/<name>/reference.md` exists:

Delegate appropriate agent:
> "Read `<docs-folder>/changes/<name>/reference.md`. Add or update relevant files in `<docs-folder>/master/reference/`:
> Good candidates: external API doc summaries, domain concept explanations, glossary entries, configuration references."

---

## Step 12a: Evaluate Master Doc Optimization

After every area has been updated, decide whether any master doc now needs to be split for easier maintenance and future merges. A single giant file is hard to review, expensive to rewrite, and prone to merge conflicts — but splitting too early is worse. The policy lives in the es-change-lifecycle skill under **Master Doc Modularization**; apply it, don't invent thresholds.

### 1. Measure

For every master file touched by this change (and any file grown by the update), record:
- Line count and byte size
- Number of distinct modules/domains/screens it now covers
- Whether future changes are likely to touch those modules independently

| Artifact | Soft limit (evaluate) | Hard limit (split now) |
|----------|-----------------------|------------------------|
| Markdown master doc | 500 lines / 25 KB | 800 lines / 40 KB |
| HTML master prototype | 1,500 lines / 120 KB | 2,500 lines / 200 KB |
| Code Reference Map table | 150 rows | 250 rows |

### 2. Decide

Split only when **all** are true:
- Over the soft limit (or will be within one or two changes)
- At least two clearly separable modules
- Content can be relocated without duplication
- No resulting module would be under ~80 lines

**Do not split** a cohesive single-module doc, and do not split just to hit a line target. If the structure is healthy, say so and move on.

### 3. Apply (delegate to the owning agent)

If a split is warranted, delegate to the agent that owns the area. In every delegation require:
- **Relocate, never duplicate** — remove the content from its old location and replace it with a one-line summary plus a link.
- **Keep a stable hub** — `overview.md` / `README.md` / `index.html` remains the entry point and links to every module.
- **Link both ways** — every module links back to the hub.
- **Stay shallow** — the deepest allowed path is `<area>/modules/<module>/<file>.<ext>`.
- **Don't rewrite unrelated content** — keep headings and ordering stable to avoid gratuitous merge conflicts.
- **Verify links** — all relative paths resolve after the move.

| Area | Owner agent | Target layout when split |
|------|-------------|--------------------------|
| product | es-product-owner | `product-vision.md` hub + `features/<feature>.md` |
| ux | es-ux-specialist | `master/ux/prototype/index.html` hub + `prototype/modules/<module>.html` + `prototype/shared/` |
| architecture | es-architect | `system-overview.md` hub + `modules/<module>/architecture.md` |
| data-model | es-database-designer | `overview.md` hub + `modules/<domain>/entities.md` |
| technology | es-developer | `README.md` hub + `modules/<module>/tech-spec.md` |
| qa | es-tester | `testing-strategy.md` hub + `test-plans/<module>-test-plan.md` |
| deployment / operations | es-developer | `README.md` hub + service/environment docs |

Prototype-specific requirements when splitting `master/ux/`:
- `prototype/index.html` stays a working whole-product prototype: global nav, landing screen, links to every module page.
- Each module page opens directly from disk (`file://`) — relative `<link rel="stylesheet">` and classic `<script src>` only; no `fetch`, no ES modules, no build step.
- Shared CSS/JS lives in `prototype/shared/`, referenced relatively — never copied inline into every module.

### 4. Record

Add an **Optimization** section to the completion summary listing:
- Files split (old path → hub + module paths)
- Files evaluated and left alone (with the reason — e.g. "single cohesive module")
- Links verified

If nothing needed splitting: `Master doc structure evaluated — no splits needed.`

---

## Step 12b: Review and Update config.yaml

After all master docs have been updated, review `easyspec-config.yaml` for accuracy:

1. **Check source paths** — verify all paths in `source.*` still exist in the workspace
2. **Check for new source directories** — did this change add new frontend/backend/test directories not in the config?
3. **Check tech stack** — did this change introduce a new framework, library, or infrastructure component that should be reflected?
4. **Check conventions** — did this change establish a new coding convention that all agents should follow going forward?
5. **Check domain knowledge** — did this change introduce new business rules or domain concepts agents should always know?

If any updates are needed, update `easyspec-config.yaml` directly with the confirmed changes.

If source paths were added or removed, announce them clearly:
> "Updated easyspec-config.yaml: added `source.tests: e2e/tests/` (new test directory created in this change)."

If nothing needs updating:
> "easyspec-config.yaml reviewed — no updates needed."

---

## Step 13: Update Change Status and Archive

Update `.change.yaml`:
```yaml
status: master-updated
master_updated_at: <YYYY-MM-DD>
```

Ask the user:
> "Master docs have been updated. Would you like to archive this change to `<docs-folder>/changes/archive/<date>-<name>/`? (yes/no)"

If yes, perform a **move** (copy then delete original) using these explicit steps:
1. Create the archive destination: `<docs-folder>/changes/archive/<YYYY-MM-DD>-<name>/`
2. Copy **all files and subdirectories** from `<docs-folder>/changes/<name>/` into the archive destination (preserving subdirectory structure)
3. **Delete the original `<docs-folder>/changes/<name>/` directory** and all its contents
4. Confirm: "Archived to `<docs-folder>/changes/archive/<date>-<name>/` and removed the original change directory."

> The original folder must be deleted. If it still exists after the copy, the archive operation is incomplete.

---

## Step 14: Show Completion Summary

```
## Master Docs Updated

**Change:** <name>

### Updated Areas
- [x] <docs-folder>/master/product/ — Product specs updated
- [x/skipped] <docs-folder>/master/ux/ — Prototype updated
- [x/skipped] <docs-folder>/master/architecture/ — Architecture diagrams updated
- [x/skipped] <docs-folder>/master/data-model/ — Data model updated
- [x] <docs-folder>/master/technology/ — Tech spec + Code Reference Map updated
- [x] <docs-folder>/master/qa/ — Test plans updated
- [x] <docs-folder>/master/qa/demo-cases.md — Master demo cases updated
- [x/skipped] <docs-folder>/master/deployment/ — Deployment docs updated
- [x/skipped] <docs-folder>/master/operations/ — Operations docs updated
- [x/skipped] <docs-folder>/master/reference/ — Reference docs updated

### Optimization
- [x/skipped] Split: <old path> → <hub> + <module paths>
- [x/skipped] Merged: <over-fragmented files> → <target>
- [x] Evaluated and left as-is: <area> (<reason, e.g. single cohesive module>)

### Next Steps
- Run `/es-master-review` to verify master docs are accurate and well-structured
- Or archive the change if not done: move to `<docs-folder>/changes/archive/`
```

---

## Guardrails
- Always Load the es-change-lifecycle skill before delegating to agents
- Always verify implementation is complete before updating master docs
- Each agent updates only their domain — don't cross-delegate
- Never add code snippets to master docs — send back for revision if found
- The Code Reference Map in tech specs must be verified against actual source files
- If a master doc area doesn't exist yet, create it following the es-change-lifecycle skill conventions
- Always run the optimization evaluation in Step 12a — never skip it, but never force a split either
- Split only when the size **and** multiple-module criteria are met; a large cohesive single-module doc stays one file
- When splitting: relocate content (remove the original), keep the hub as the stable entry point, link modules both ways, and verify every relative link
- Keep modularized trees shallow (no deeper than `<area>/modules/<module>/<file>.<ext>`) and never create module files under ~80 lines
- Modularized prototype pages must still open directly from disk — no `fetch`, ES modules, absolute paths, or build step
- Change prototypes stay single-file; only the master prototype modularizes
