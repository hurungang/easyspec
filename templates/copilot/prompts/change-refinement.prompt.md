---
description: Refine an in-progress change with an adjustment request. Audits what has already been done, updates all affected docs, code, and tests so the adjustment is fully incorporated as if it were part of the original request.
---

Incorporate an adjustment into an existing change by cascading it through all completed work — documentation, implementation, and tests.

**Input**: Optionally specify a change name and adjustment (e.g., `/change:refinement add-dark-mode "add a light/dark toggle to the navbar"`). If omitted, the command will ask.

---

## Step 1: Select the Change

If a change name is provided, use it.

Otherwise, list available changes:
```
Get-ChildItem docs/changes/ -Directory | Where-Object { $_.Name -ne 'archive' }
```

If only one active change exists, auto-select it. If multiple, ask the user to select.

Announce: **"Refining change: `<name>`"**

---

## Step 2: Capture the Adjustment Request

If no adjustment was provided in the input, ask the user:
> "What adjustment do you want to make to `<name>`? Describe what should change, what should be added, or what should be removed."

Record the adjustment as a clear statement in plain English. If the request is ambiguous, ask one clarifying question before proceeding.

---

## Step 3: Audit What Has Been Done

Read all existing files in `docs/changes/<name>/` to build a complete picture of the current state:

1. `.change.yaml` — Current status and which agents have completed
2. `prd.md` — Accepted requirements and user stories
3. `spec-change.md` — Spec delta
4. `prototype/index.html` — (if exists) Approved UI prototype
5. `architecture.md` — (if exists) Architecture decisions
6. `data-model.md` — (if exists) Data model decisions
7. `tech-spec.md` — Technical specification and Code Reference Map
8. `implementation-plan.md` — Task list with `- [x]` (done) and `- [ ]` (pending) tasks
9. `test-plan.md` — Test strategy and scenarios

Also read `docs/config.yaml` for project source paths, tech stack, and conventions.

Then determine the **implementation phase**:

- **Phase A — Proposal only**: `implementation-plan.md` has no checked `- [x]` tasks (or doesn't exist). No code has been written yet.
- **Phase B — Partially implemented**: Some tasks are `- [x]`, others are `- [ ]`. Code exists but the change is not complete.
- **Phase C — Fully implemented, pre-test**: All tasks are `- [x]` but tests have not all passed yet.
- **Phase D — Fully implemented and tested**: All tasks `- [x]` and tests are passing.

Announce the detected phase before proceeding.

---

## Step 4: Impact Analysis

Analyse the adjustment request against the current change docs and determine which artifacts are affected. Produce an **Impact Summary**:

```
## Refinement Impact Summary

**Adjustment:** <adjustment statement>
**Phase detected:** <A / B / C / D>

### Documents to update
- [ ] prd.md — <reason if affected, or "no change needed">
- [ ] spec-change.md — <reason if affected, or "no change needed">
- [ ] prototype/index.html — <reason if affected, or "no change needed">
- [ ] architecture.md — <reason if affected, or "no change needed">
- [ ] data-model.md — <reason if affected, or "no change needed">
- [ ] tech-spec.md — <reason if affected>
- [ ] implementation-plan.md — <reason if affected>
- [ ] test-plan.md — <reason if affected>

### Code changes required (Phase B/C/D only)
- <list of source files / components likely affected>

### Test changes required (Phase B/C/D only)
- <list of test files likely affected>
```

Use the `vscode_askQuestions` tool to confirm with the user before proceeding:
- question: "Proceed with this refinement?"
- options: `Proceed` (recommended), `Cancel`
- allowFreeformInput: false

If the user selects **Proceed**, continue to Step 5. If **Cancel**, stop and notify the user that no changes were made.

---

## Step 5: Update Change Documentation

Load `.github/skills/change-lifecycle/SKILL.md` for document format requirements.

Update each affected document by re-running the relevant agent, passing both the **original change context** and the **adjustment statement**. Agents must treat the adjustment as a first-class requirement — not an afterthought — and revise their output accordingly.

### 5a. Update `prd.md` and `spec-change.md` (if affected)

Delegate to **product_owner agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read the current `docs/changes/<name>/prd.md` and `docs/changes/<name>/spec-change.md`. Update both to incorporate the adjustment as if it were part of the original requirements. Add, modify, or remove user stories and acceptance criteria as needed. Do not add a 'Refinement' section — integrate the changes naturally.
>
> Read `docs/config.yaml` for project context. Load `.github/skills/change-lifecycle/SKILL.md` for format requirements."

After update, delegate to **document_reviewer agent** to review both files.

### 5b. Update `prototype/index.html` (if affected and exists)

Delegate to **ux_specialist agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read the updated `docs/changes/<name>/prd.md` for the revised user flows. Update `docs/changes/<name>/prototype/index.html` to incorporate the adjustment. The prototype must remain self-contained (inline CSS/JS) and work directly in a browser. Check `docs/master/ux/` and other change prototypes for the established product style — do not deviate from it."

After update, delegate to **document_reviewer agent** to review.

### 5c. Update `architecture.md` (if affected and exists)

Delegate to **architect agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read the updated `docs/changes/<name>/prd.md` and the current `docs/changes/<name>/architecture.md`. Update the architecture doc to incorporate the adjustment. Revise Mermaid diagrams, component descriptions, and integration notes as needed."

After update, delegate to **document_reviewer agent** to review.

### 5d. Update `data-model.md` (if affected and exists)

Delegate to **database_designer agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read the updated `docs/changes/<name>/prd.md` and the current `docs/changes/<name>/data-model.md`. Update the data model to incorporate the adjustment. Revise entities, relationships, and schema file references as needed. Data model must remain technology-agnostic."

After update, delegate to **document_reviewer agent** to review.

### 5e. Update `tech-spec.md` and `implementation-plan.md` (always affected)

Delegate to **developer agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read all updated change docs in `docs/changes/<name>/` and `docs/config.yaml`.
>
> Update `docs/changes/<name>/tech-spec.md` to reflect the adjustment — revise the Component Breakdown, API Changes, and Code Reference Map as needed.
>
> Update `docs/changes/<name>/implementation-plan.md`:
> - Keep all `- [x]` completed tasks as-is (do not uncheck them)
> - Add new tasks required by the adjustment as `- [ ]` items, inserted at the appropriate phase
> - Modify or remove pending `- [ ]` tasks that are superseded by the adjustment
> - Renumber tasks sequentially within each phase after any insertions/removals
> - If new tasks require rework of already-completed tasks, mark those `- [x]` items with a `⚠️ NEEDS REWORK` annotation and add corresponding new `- [ ]` rework tasks
>
> Load `.github/skills/change-lifecycle/SKILL.md` for format requirements."

### 5f. Update `test-plan.md` (always affected)

Delegate to **tester agent**:
> "The change `<name>` is being refined. Adjustment: `<adjustment>`.
>
> Read the updated `docs/changes/<name>/prd.md` and the current `docs/changes/<name>/test-plan.md`. Update the test plan to cover the adjustment — add new scenarios, modify existing ones, and remove any that are no longer relevant. Ensure every acceptance criterion in the updated PRD has a corresponding test scenario. Do not write test code — this is planning only."

---

## Step 6: Apply Code Changes (Phase B / C / D only)

If the change is in Phase B, C, or D (code has been written), delegate to **developer agent** to implement the code changes required by the adjustment:

> "The change `<name>` has been refined with this adjustment: `<adjustment>`.
>
> Read the updated docs:
> - `docs/changes/<name>/prd.md` — revised requirements
> - `docs/changes/<name>/tech-spec.md` — updated technical approach and Code Reference Map
> - `docs/changes/<name>/implementation-plan.md` — updated task list (look for `- [ ]` tasks and `⚠️ NEEDS REWORK` tasks)
> - `docs/config.yaml` for source paths and conventions
>
> Work through each pending `- [ ]` task and each `⚠️ NEEDS REWORK` task in order:
> 1. Implement or rework the task
> 2. Mark complete: `- [ ]` → `- [x]` (remove `⚠️ NEEDS REWORK` annotation when done)
> 3. Update `tech-spec.md` Code Reference Map with any new/changed code locations
> 4. Proceed to next task
>
> Pause and report if any task is blocked or unclear."

---

## Step 7: Update Tests (Phase B / C / D only)

If the change is in Phase B, C, or D, after the developer confirms implementation is complete, delegate to **tester agent** to update the tests:

> "The change `<name>` has been refined. Adjustment: `<adjustment>`.
>
> Read:
> - `docs/changes/<name>/test-plan.md` — updated test plan
> - `docs/changes/<name>/prd.md` — updated acceptance criteria
> - `docs/config.yaml` for test directory paths
>
> Update tests across all three layers to reflect the adjustment:
> 1. **Backend tests** — update/add pytest files as needed
> 2. **Frontend component tests** — update/add Vitest files as needed
> 3. **E2E tests** — update/add Playwright specs as needed. Maintain full user journey coverage per scenario. Use `page.route()` to mock API calls.
>
> Run all tests. Report pass/fail counts. Fix any failures before proceeding.
>
> When all layers pass, update `docs/changes/<name>/test-plan.md` Test File References with paths to all created or modified test files."

---

## Step 8: Prepare Demo Cases (Phase D only)

If the change is in Phase D (fully implemented and tested), after all tests pass, prepare demo cases **silently** (no separate announcement):

**If `docs/changes/<name>/demo-cases.md` does NOT exist:**
Delegate to **tester agent** to create it:
> "The tests for `<name>` are all passing after refinement. Now curate a demo-cases file.
>
> Read `docs/changes/<name>/test-plan.md` and `e2e/tests/` to understand what test cases exist.
>
> Select **one best representative E2E test per feature** — the one that shows the most user-visible behaviour. Skip tests that only validate one small detail (e.g. 'page does not redirect to login') or tests that duplicate the same flow.
>
> Create `docs/changes/<name>/demo-cases.md` with this format:
>
> ```markdown
> # Demo Cases: <change-name>
> <!-- Curated representative scenarios for product demo -->
> <!-- Use with: /demo-app --cases docs/changes/<name>/demo-cases.md -->
>
> ## Grep Patterns
> <!-- One Playwright test title per line (must match the test's describe + test name exactly) -->
> <!-- demo-app reads these lines and joins them into a --grep regex -->
> - <Describe suite name> > <test name>
> - <Describe suite name> > <test name>
> ...
>
> ## Scenario Details
> | # | Feature | What it Shows | Spec File | Test Name |
> |---|---------|---------------|-----------|-----------|
> | 1 | <feature> | <one sentence — what user sees/does> | <spec file> | <test name> |
> ...
> ```
>
> Rules for selection:
> - Pick tests that show real user interactions (not just renders/redirects)
> - Prefer tests that exercise the full user journey for a feature
> - 1 test per distinct feature — never duplicate a flow
> - The grep pattern must be `<describe block name> > <test name>` (exact Playwright title format — use `>` not `›`)"

**If demo-cases.md EXISTS:**
Delegate to **tester agent** to update it:
> "The refinement for `<name>` is complete and all tests pass. Review `docs/changes/<name>/demo-cases.md` to ensure it includes scenarios for any new or changed features from the adjustment: `<adjustment>`.
>
> Read the E2E tests in `e2e/tests/` to identify any new test scenarios. If new scenarios exist that aren't in demo-cases.md and represent distinct user-facing features, add them. If existing scenarios no longer exist or were renamed, update the grep patterns and table rows accordingly.
>
> The grep pattern must be `<describe block name> > <test name>` (exact Playwright title format — use `>` not `›`)."

---

## Step 9: Verify Project Slash Commands (Phase D only)

If the change is in Phase D, **silently** check and update project utility slash commands in `.github/prompts/`:
- `start-app.prompt.md`
- `stop-app.prompt.md`
- `test-app.prompt.md`
- `demo-app.prompt.md`

For each file:
- If it **does not exist** → create it with commands tailored to this project's stack (read `docs/config.yaml`)
- If it **exists but may be outdated** (e.g., missing new scenarios from this refinement) → review and update relevant sections

**For `demo-app.prompt.md`**: Ensure new E2E scenarios are listed in "Available scenarios" and the prompt supports `--cases <file>`.

---

## Step 10: Show Completion Summary and Offer Demo

```
## Refinement Complete

**Change:** <name>
**Adjustment:** <adjustment>

### Documents Updated
- [x/skipped] prd.md
- [x/skipped] spec-change.md
- [x/skipped] prototype/index.html
- [x/skipped] architecture.md
- [x/skipped] data-model.md
- [x] tech-spec.md
- [x] implementation-plan.md
- [x] test-plan.md

### Code & Tests (if applicable)
- [x/skipped] Code updated and implementation-plan.md tasks resolved
- [x/skipped] Tests updated and passing

### Demo Preparation (if Phase D)
- [x/skipped] Demo cases curated/updated
- [x/skipped] Slash commands verified
```

**If the change is in Phase D**, immediately follow with the demo offer using vscode_askQuestions:

First show this text:
```
---

## 🎬 Demo Available

All tests are passing after the refinement. The demo uses curated scenarios from `docs/changes/<name>/demo-cases.md` (one representative test per feature).
```

Then use vscode_askQuestions to present options:
```javascript
{
  "questions": [{
    "header": "Demo Mode",
    "question": "How would you like to demo the changes?",
    "options": [
      { "label": "Full demo (normal speed)", "description": "Run all scenarios automatically at comfortable viewing pace", "recommended": true },
      { "label": "Fast review", "description": "Run all scenarios at quick pace (1s delays)" },
      { "label": "Manual control", "description": "Playwright UI — you click ▶ to run each scenario" },
      { "label": "Skip for now", "description": "Proceed to update master docs" }
    ]
  }]
}
```

Based on the user's selection:
- **"Full demo (normal speed)"** → invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --speed normal`
- **"Fast review"** → invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --speed fast`
- **"Manual control"** → invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --pause`
- **"Skip for now"** → announce: "Run `/change:update-master` when ready to update master product docs."

If the user provides a specific scenario name as freeform input, invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --filter <scenario> --speed normal`

After any demo completes, remind the user:
> "Run `/change:update-master` to apply changes to master product docs."

**If the change is NOT Phase D**, show next steps instead:

```
### Next Steps
- Run `/change:apply <name>` to implement the change
```

---

## Guardrails

- Never uncheck `- [x]` completed tasks unless they are explicitly marked `⚠️ NEEDS REWORK`
- Always confirm the Impact Summary with the user before making any changes
- Always load the change-lifecycle skill before delegating to agents
- Always run document_reviewer on updated prd.md, spec-change.md, architecture.md, data-model.md, and prototype
- If an agent produces content with code snippets in docs, send back for revision
- The adjustment must be integrated naturally — do NOT add a "Refinement history" or "Change log" section to any document
- If the adjustment fundamentally contradicts completed work (e.g., removes a core feature that's already built), pause and ask the user to confirm before proceeding
