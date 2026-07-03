---
description: Update master product docs from a completed change. Delegates to each specialist agent to apply change docs into docs/1-product/ through docs/9-reference/. Run after change is implemented.
---

Update master product docs by applying a completed change's documentation to the canonical `docs/` folder.

**Input**: Optionally specify a change name (e.g., `/change:update-master add-dark-mode`). If omitted, list available changes and ask the user to select.

---

## Step 1: Select the Change

If a change name is provided, use it.

Otherwise, list available changes in `docs/changes/` (excluding `archive/`).

Announce: **"Updating master docs from change: `<name>`"**

---

## Step 2: Read Change Context

Read all files in `docs/changes/<name>/`:
1. `.change.yaml` — Status, scope flags, which agents have completed
2. `prd.md` — What was built
3. `spec-change.md` — Spec areas affected and update instructions
4. `implementation-plan.md` — What was implemented (all tasks should be checked)
5. `tech-spec.md` — Technical spec with Code Reference Map (source of truth for `docs/master/technology/`)
6. `test-plan.md` — Test coverage (source of truth for `docs/master/qa/`)
7. `architecture.md` — (if exists) Architecture changes
8. `data-model.md` — (if exists) Data model changes
9. `deployment.md` — (if exists) Deployment changes
10. `operations.md` — (if exists) Operations changes

Also read:
- `.github/skills/change-lifecycle/SKILL.md` for master doc structure conventions
- `docs/config.yaml` for project source paths and conventions

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

## Step 4: Update Product Docs — product_owner Agent

Delegate to **product_owner agent**:
> "Read `docs/changes/<name>/prd.md` and `docs/changes/<name>/spec-change.md`. 
> Update master product docs in `docs/master/product/`:
> 1. If this is a new feature: create `docs/master/product/features/<feature-name>.md` following the PRD format
> 2. If this modifies an existing feature: update the relevant `docs/master/product/features/<name>.md`
> 3. If this changes strategic direction: update `docs/master/product/product-vision.md`
> 4. Apply the 'Spec Update Instructions' from `spec-change.md` to relevant `openspec/specs/` files
>
> Docs must be code-free, business language, no implementation details."

---

## Step 5: Update UX Prototype — ux_specialist Agent

Always run this step (regardless of `has_ui_changes` flag) — changes often touch UI even when not flagged.

Delegate to **ux_specialist agent** with two sub-tasks:

**Sub-task A — Reconcile change prototype with actual implementation:**
> "Read `docs/changes/<name>/tech-spec.md`, `docs/changes/<name>/prd.md`, and `docs/changes/<name>/prototype/index.html` (if it exists).
>
> For each UI component listed in the tech-spec's Code Reference Map, examine the actual source file to understand what was really built — screens, flows, field names, interactions.
>
> Update `docs/changes/<name>/prototype/index.html` so it accurately reflects the final implementation, not the original design proposal. If no prototype existed, create one from scratch based on the real components.
>
> Goal: the change prototype must match what was actually shipped."

**Sub-task B — Incorporate into master prototype:**
> "Read the updated `docs/changes/<name>/prototype/index.html` and the current `docs/master/ux/prototype/index.html`.
>
> Integrate the new/updated flows from the change prototype into the master prototype. The master prototype mocks the FULL product — add the new screens/flows without breaking existing ones.
>
> Keep it self-contained (inline CSS/JS), openable in browser without a server.
>
> If no master prototype exists yet at `docs/master/ux/prototype/index.html`, create it from the change prototype as the starting point."

If the tech-spec has no UI component references AND no prototype exists in the change, the ux_specialist may skip with a note: `"No UI components found in tech-spec — prototype update skipped."`

---

## Step 6: Update Architecture Docs — architect Agent (if has_architecture_changes)

If `.change.yaml` shows `has_architecture_changes: true`:

Delegate to **architect agent**:
> "Read `docs/changes/<name>/architecture.md`.
> Apply the 'Master Arch Update Instructions' section from the change doc to update `docs/master/architecture/`:
> 1. Update `docs/master/architecture/system-overview.md` if overall system changed
> 2. Update or create `docs/master/architecture/modules/<module>/architecture.md` for module-level changes
> 3. All diagrams must use Mermaid, max 15 nodes, no implementation details, no code."

---

## Step 7: Update Data Model Docs — database_designer Agent (if has_db_changes)

If `.change.yaml` shows `has_db_changes: true`:

Delegate to **database_designer agent**:
> "Read `docs/changes/<name>/data-model.md`, `docs/config.yaml`, and the current contents of `docs/master/data-model/overview.md`.
>
> Apply the 'Master Data Model Update Instructions' section from the change doc to update `docs/master/data-model/`:
>
> **1. Update `docs/master/data-model/overview.md`**
> - For each new or modified domain: add or update the Mermaid `erDiagram` block for that domain.
> - Each erDiagram must include: entity names, key business attributes (id, name, status, type, foreign-key references, boolean flags), and all relationships with cardinality labels.
> - If overview.md is empty or missing these sections: write the full content — domain sections plus a Cross-Domain Relationship Map diagram.
> - Preserve all existing domain sections that are NOT touched by this change.
> - Add a `**Source**: \`<schema-file-path>\`` line beneath each diagram.
>
> **2. Update `docs/master/data-model/modules/<module>/entities.md`**
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

Delegate to **developer agent**:
> "Read `docs/changes/<name>/tech-spec.md` and `docs/config.yaml`.
> Update master technology docs in `docs/master/technology/`:
> 1. Update or create `docs/master/technology/modules/<module>/tech-spec.md` for each affected module
> 2. Merge the Code Reference Map entries from the change's tech-spec into the master module tech-spec
> 3. Remove any Code Reference Map entries that are now stale (functions renamed/moved/deleted)
> 4. Verify each file path in the Code Reference Map exists in the workspace
> 5. Update `docs/master/technology/README.md` index if new modules were added
>
> The Code Reference Map is the developer's primary code navigation tool — accuracy is critical.
> Load `.github/skills/change-lifecycle/SKILL.md` for format requirements."

---

## Step 9: Update QA Docs — tester Agent

Delegate to **tester agent**:
> "Read `docs/changes/<name>/test-plan.md` and `docs/config.yaml`.
> Update master QA docs in `docs/master/qa/`:
> 1. Update or create `docs/master/qa/test-plans/<module>-test-plan.md` for affected modules
> 2. Update test file references to point to actual test files created during implementation (paths from `docs/config.yaml` `source.tests`)
> 3. Update `docs/master/qa/testing-strategy.md` if the overall strategy changed
>
> No test code in documentation — reference test files only."

---

## Step 9b: Update Master Demo Cases — tester Agent

After updating the QA test plans, also update the master demo-cases file.

Delegate to **tester agent**:
> "Read `docs/changes/<name>/demo-cases.md` (the curated demo scenarios for this change).
>
> Update `docs/master/qa/demo-cases.md` — the whole-product demo cases file:
> 1. If `docs/master/qa/demo-cases.md` does not exist, create it with the structure below.
> 2. If it exists, merge the change's scenarios in — add any new patterns that aren't already present. Do NOT remove existing patterns from other changes.
> 3. Remove any pattern that refers to a test that no longer exists (stale reference).
>
> **File format for `docs/master/qa/demo-cases.md`**:
> ```markdown
> # Master Demo Cases
> <!-- Whole-product curated demo — one representative scenario per feature -->
> <!-- Use with: /demo-app --cases docs/master/qa/demo-cases.md -->
> <!-- Updated automatically by /change:update-master -->
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


If `.change.yaml` shows `has_deployment_changes: true`:

Delegate to **developer agent**:
> "Read `docs/changes/<name>/deployment.md`.
> Apply the 'Master Deployment Update Instructions' from the change doc to update `docs/master/deployment/`:
> Update relevant deployment instruction files with new configuration, infrastructure changes, migration steps."

---

## Step 11: Update Operations Docs (if has_operations_changes)

If `.change.yaml` shows `has_operations_changes: true`:

Delegate to **developer agent**:
> "Read `docs/changes/<name>/operations.md`.
> Apply the 'Master Operations Update Instructions' from the change doc to update `docs/master/operations/`:
> Update monitoring, alerting, and runbook files."

---

## Step 12: Update Reference Docs (if applicable)

If `docs/changes/<name>/reference.md` exists:

Delegate appropriate agent:
> "Read `docs/changes/<name>/reference.md`. Add or update relevant files in `docs/master/reference/`:
> Good candidates: external API doc summaries, domain concept explanations, glossary entries, configuration references."

---

## Step 12b: Review and Update config.yaml

After all master docs have been updated, review `docs/config.yaml` for accuracy:

1. **Check source paths** — verify all paths in `source.*` still exist in the workspace
2. **Check for new source directories** — did this change add new frontend/backend/test directories not in the config?
3. **Check tech stack** — did this change introduce a new framework, library, or infrastructure component that should be reflected?
4. **Check conventions** — did this change establish a new coding convention that all agents should follow going forward?
5. **Check domain knowledge** — did this change introduce new business rules or domain concepts agents should always know?

If any updates are needed, update `docs/config.yaml` directly with the confirmed changes.

If source paths were added or removed, announce them clearly:
> "Updated docs/config.yaml: added `source.tests: e2e/tests/` (new test directory created in this change)."

If nothing needs updating:
> "docs/config.yaml reviewed — no updates needed."

---

## Step 13: Update Change Status and Archive

Update `.change.yaml`:
```yaml
status: master-updated
master_updated_at: <YYYY-MM-DD>
```

Ask the user:
> "Master docs have been updated. Would you like to archive this change to `docs/changes/archive/<date>-<name>/`? (yes/no)"

If yes, perform a **move** (copy then delete original) using these explicit steps:
1. Create the archive destination: `docs/changes/archive/<YYYY-MM-DD>-<name>/`
2. Copy **all files and subdirectories** from `docs/changes/<name>/` into the archive destination (preserving subdirectory structure)
3. **Delete the original `docs/changes/<name>/` directory** and all its contents
4. Confirm: "Archived to `docs/changes/archive/<date>-<name>/` and removed the original change directory."

> The original folder must be deleted. If it still exists after the copy, the archive operation is incomplete.

---

## Step 14: Show Completion Summary

```
## Master Docs Updated

**Change:** <name>

### Updated Areas
- [x] docs/master/product/ — Product specs updated
- [x/skipped] docs/master/ux/ — Prototype updated
- [x/skipped] docs/master/architecture/ — Architecture diagrams updated
- [x/skipped] docs/master/data-model/ — Data model updated
- [x] docs/master/technology/ — Tech spec + Code Reference Map updated
- [x] docs/master/qa/ — Test plans updated
- [x] docs/master/qa/demo-cases.md — Master demo cases updated
- [x/skipped] docs/master/deployment/ — Deployment docs updated
- [x/skipped] docs/master/operations/ — Operations docs updated
- [x/skipped] docs/master/reference/ — Reference docs updated

### Next Steps
- Run `/change:review` to verify master docs are accurate and well-structured
- Or archive the change if not done: move to openspec/changes/archive/
```

---

## Guardrails
- Always load the change-lifecycle skill before delegating to agents
- Always verify implementation is complete before updating master docs
- Each agent updates only their domain — don't cross-delegate
- Never add code snippets to master docs — send back for revision if found
- The Code Reference Map in tech specs must be verified against actual source files
- If a master doc area doesn't exist yet, create it following the change-lifecycle skill conventions
