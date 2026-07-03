---
description: Implement a change using the agent team. Reads change docs, delegates implementation to developer agent, and runs tests via tester agent. Tracks progress in implementation-plan.md.
---

Implement a change by orchestrating the developer and tester agents against the prepared change docs.

**Input**: Optionally specify a change name (e.g., `/change:apply add-dark-mode`). If omitted, list available changes and ask the user to select.

---

## Step 1: Select the Change

If a change name is provided, use it.

Otherwise, list available changes:
```
Get-ChildItem docs/changes/ -Directory | Where-Object { $_.Name -ne 'archive' }
```

If only one active change exists, auto-select it. If multiple, ask the user to select.

Announce: **"Implementing change: `<name>`"**

---

## Step 2: Read Change Context

Read all existing files in `docs/changes/<name>/`:
1. `.change.yaml` — Check status and scope
2. `prd.md` — Product requirements and acceptance criteria
3. `spec-change.md` — What product spec areas are affected
4. `implementation-plan.md` — Task list (may be empty or partial)
5. `tech-spec.md` — Technical specification and code reference map
6. `test-plan.md` — Coverage areas and scenarios
7. `architecture.md` — (if exists) Architecture changes
8. `data-model.md` — (if exists) Data model changes

Also read:
- `.github/skills/change-lifecycle/SKILL.md` for document format conventions
- `docs/config.yaml` for project source paths, tech stack, and conventions

---

## Step 3: Validate Readiness

**If `implementation-plan.md` is missing or has no tasks**:
Delegate to **developer agent** to create it:
> "Read all change docs in `docs/changes/<name>/` and `docs/config.yaml`. Create `docs/changes/<name>/implementation-plan.md` with an ordered task list, phases, and clear done conditions for each task. Load `.github/skills/change-lifecycle/SKILL.md`."

**If any prerequisite docs are missing** (prd.md or tech-spec.md not found):
Pause and tell the user:
> "Missing required doc: `<filename>`. Run `/change:propose <name>` first to create all change docs."

**Validate `implementation-plan.md` format** before proceeding:

1. **Check for checkbox format**: Every task must appear as `- [ ]` (incomplete) or `- [x]` (complete) in a Task Checklist section. If the plan uses heading-only tasks with no checkboxes, reformat it in place: add a `## Task Checklist` section at the top of the plan (after the Overview) listing every task as `- [ ] <phase>.<num> — <task title>`, one per line. Do NOT modify the detailed task descriptions below — only add the checklist section.

2. **Check for no pre-checked items**: If `- [x]` entries exist but the change `status` in `.change.yaml` is still `in-progress` and no code has been written, uncheck them all to `- [ ]`. Tasks are only checked during implementation (Step 6), never during planning.

3. **Check for consistent numbering**: If any task numbers are skipped or duplicated (e.g., 7.1, 7.3 with no 7.2), renumber sequentially within each phase before proceeding.

Report any fixes made before showing the progress summary.

---

## Step 4: Show Current Progress

Parse `implementation-plan.md` to count:
- Total tasks: `- [ ]` + `- [x]` entries
- Complete tasks: `- [x]` entries
- Remaining tasks: `- [ ]` entries

Display:
```
## Change: <name>
**Progress:** N/M tasks complete

### Remaining Tasks
- [ ] Task description
- [ ] Task description
...
```

---

## Step 5: Data Model Changes (if has_db_changes)

If `.change.yaml` shows `has_db_changes: true` and schema files haven't been updated:

**5a. Validate data-model.md has attribute-level ER diagrams**

Before delegating schema work, read `docs/changes/<name>/data-model.md` and check:
- Each new entity has a Mermaid `erDiagram` block
- Each erDiagram includes **attribute lines** inside the entity block (id, name, status/type enums, foreign keys, booleans) — not just entity names
- Relationships have cardinality notation (e.g. `||--o{`) and labels

If the ER diagrams are missing attribute lines (i.e. they only name the entity with no fields listed), delegate back to **database_designer agent** to enrich them first:
> "Read `docs/changes/<name>/data-model.md`. For each entity in the New Entities section, update the Mermaid erDiagram blocks to include key attribute lines inside each entity block. Use generic types (uuid, string, enum, boolean, int, datetime, json) — not database-specific types. Include: primary key (id), all business-meaningful fields (name, status, type, boolean flags), and foreign-key references (as uuid fields). Do NOT add SQL, ORM code, or constraints. After updating, verify every relationship has a cardinality label."

Wait for the enriched data-model.md before proceeding.

**5b. Update schema/model files**

Delegate to **database_designer agent**:
> "Read the enriched `docs/changes/<name>/data-model.md` and `docs/config.yaml` (for schema file paths). Update the project's schema/model files as described in the data-model.md 'Schema File References' section. Follow the project's schema management convention — do NOT write migration scripts manually; use the project's schema tooling to generate them."

Wait for completion before proceeding to implementation.

**Note**: Master data-model docs (`docs/master/data-model/`) are updated by `/change:update-master` — do NOT update them here.

---

## Step 6: Delegate Implementation to Developer Agent

Delegate to **developer agent** with full context:
> "Implement the change `<name>`. Read all change docs from `docs/changes/<name>/`:
> - `prd.md` for requirements
> - `tech-spec.md` for technical approach and Code Reference Map
> - `implementation-plan.md` for ordered tasks
> - `architecture.md` (if exists) for component changes
>
> Also read `docs/config.yaml` for project source paths and conventions.
>
> Work through each unchecked task `- [ ]` in `implementation-plan.md` in order:
> 1. Implement the task
> 2. Mark complete in `implementation-plan.md`: `- [ ]` → `- [x]`
> 3. Update `tech-spec.md` Code Reference Map with any new/changed code locations
> 4. Proceed to next task
>
> Load `.github/skills/change-lifecycle/SKILL.md` for code reference map format.
>
> Pause and report if any task is blocked or unclear."

---

## Step 6a: Verify Database Migration Applied (if has_db_changes)

**CRITICAL: This step is MANDATORY if `.change.yaml` shows `has_db_changes: true`**

After developer completes implementation, **BEFORE running any tests**, verify the database migration has been applied.

### Check Migration Status

Run `alembic current` (or equivalent schema tool command based on the project):

```powershell
cd backend  # or wherever migrations are located
alembic current
```

### Verify Migration Applied

Compare the output with the migration file generated in Step 5b:

1. **If migration ID matches** the latest migration file → ✅ Migration applied, proceed to testing
2. **If migration ID does NOT match** → ❌ Migration NOT applied, apply it now:

```powershell
cd backend
alembic upgrade head
```

After applying, verify again with `alembic current`.

### Why This Matters

**Database migrations are frequently missed** because:
- Tests may use mocked databases that don't require migrations
- Developer implementation doesn't always require local database access
- Migration application is a manual step that's easy to forget

**Consequences of skipping this step:**
- Integration tests fail with "invalid enum value" or "column does not exist" errors
- E2E tests against real backend fail
- Production deployment breaks
- Hours wasted debugging what appears to be a code issue but is actually a schema mismatch

### Announcement

After verifying migration is applied, announce:

```
✅ Database migration verified
- Migration ID: <revision-id>
- Change: <brief description of schema change>
- Ready to proceed with testing
```

If migration had to be applied, also note:

```
⚠️  Migration was not applied — applied now
- This is a common oversight
- Always run `alembic upgrade head` after schema changes
```

**Do NOT proceed to Step 7 until migration is confirmed applied.**

---

## Step 7: Review Test Plan Coverage Quality

**Before writing any tests**, the conductor must review the test plan for coverage quality.

Read `docs/changes/<name>/test-plan.md` and evaluate:

**Coverage quality checklist:**
- [ ] Every feature in `prd.md` has at least one E2E scenario
- [ ] Each E2E scenario covers the **full user journey** (not just "page renders") — including inputs, interactions, state changes, and expected outcomes
- [ ] Happy path AND key error/edge cases are covered per feature
- [ ] For large changes (3+ features): each feature has 3+ distinct E2E scenarios
- [ ] Backend coverage: each API endpoint and service method has a test
- [ ] Frontend coverage: each new page/component has render + interaction tests

**If the test plan is shallow or missing scenarios:**

Delegate back to **tester agent** to expand it:
> "The test plan for `<name>` needs deeper coverage. Read `docs/changes/<name>/prd.md` to enumerate every feature and acceptance criterion. For each feature, define:
> 1. The full user journey (step-by-step actions a user takes)
> 2. At least one happy-path E2E scenario with specific UI interactions and assertions
> 3. At least one error/edge-case scenario
> 4. Backend test cases for each API endpoint involved
> 5. Frontend component test cases for each UI element involved
>
> Update `docs/changes/<name>/test-plan.md` with expanded scenarios. Do NOT write code — this is planning only."

**Do not proceed to test implementation until the test plan passes all coverage checklist items.**

Announce: "✅ Test plan coverage approved — proceeding to test implementation."

---

## Step 8: Run Tests via Tester Agent

After developer reports implementation complete AND test plan is approved:

Delegate to **tester agent**:
> "The change `<name>` has been implemented. Read:
> - `docs/changes/<name>/test-plan.md` for coverage areas and scenarios (the approved plan)
> - `docs/changes/<name>/prd.md` for acceptance criteria
> - `docs/config.yaml` for test directory paths
>
> Create or update tests in **all three test layers**:
>
> 1. **Backend tests** — pytest files in the backend test directory (`source.tests` in `docs/config.yaml`). Cover service logic, API endpoints, and data model operations. Each scenario in the test plan must have a corresponding test.
>
> 2. **Frontend component tests** — Vitest files in `frontend/src/__tests__/`. Cover each new or modified React component/page: renders correctly, handles loading/error states, and responds to user interaction (clicks, form input).
>
> 3. **E2E tests** — Playwright spec files in `e2e/tests/`. Implement the **full user journey** for each scenario in the test plan — not just page renders. Each scenario must include real UI interactions (clicks, form fills, navigation) and specific assertions on outcomes. Use `page.route()` to mock all API calls so no live backend is needed.
>
> For each layer:
> - Run the tests
> - Report pass/fail counts
> - Fix any failures before proceeding
>
> When all three layers pass, update `docs/changes/<name>/test-plan.md` Test File References section with paths to all created test files (backend, frontend, e2e)."

---

## Step 8a: Review and Update Documentation

**After all tests pass and BEFORE demo preparation**, review the change documentation to ensure it reflects what was actually implemented.

During implementation, details often change:
- File paths or component names may differ from the plan
- New functions or API endpoints may have been added
- Implementation details may have evolved

Delegate to **developer agent** to review and update:

> "The implementation and tests for `<name>` are complete. Now review the change documentation to ensure accuracy.
>
> 1. **Review `docs/changes/<name>/tech-spec.md`**:
>    - Verify the Code Reference Map matches actual file paths and component names
>    - Add any new API endpoints, functions, or components created during implementation
>    - Update technical approach if implementation deviated from the original plan
>    - Ensure all code references are accurate and complete
>
> 2. **Review `docs/changes/<name>/test-plan.md`**:
>    - Verify Test File References section lists all actual test files created
>    - Ensure all scenarios described match the implemented tests
>    - Add any additional test coverage that was implemented
>    - Update file paths if test files were organized differently than planned
>
> 3. **Review `docs/changes/<name>/implementation-plan.md`**:
>    - Verify all `- [x]` tasks accurately reflect what was completed
>    - If any tasks were skipped or changed during implementation, update task descriptions to match reality
>
> Make updates in place to ensure documentation accurately reflects the actual implementation. Do NOT add 'Implementation Notes' or 'Changes During Implementation' sections — integrate updates naturally into the existing structure."

Announce: "✅ Documentation reviewed and updated to match implementation."

---

## Step 8b: Curate Demo Cases

After documentation is reviewed and updated, delegate to **tester agent** to select representative demo scenarios:

> "The tests for `<name>` are all passing. Now curate a demo-cases file.
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

Announce: "✅ Demo cases curated — `docs/changes/<name>/demo-cases.md` created."

---


After all tasks complete and **all three test layers pass** (backend pytest, frontend vitest, e2e Playwright):

Update `.change.yaml`:
```yaml
status: implemented
agents_complete:
  developer: true
  tester: true
```

---

## Step 10: Show Completion Summary

```
## Implementation Complete

**Change:** <name>
**Progress:** M/M tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

### Test Results
<summary from tester agent — must include pass counts for backend, frontend, and e2e>

### Next Steps
Run `/change:update-master` to apply changes to master product docs.
```

---

## Step 11: Ensure Project Slash Commands Are Up to Date

After the implementation is confirmed complete, check whether the four project utility slash commands exist and are current for this project.

These are **project-level** slash commands — they live in `.github/prompts/` inside the project repo (not the global user prompts folder), because each project may have a different tech stack, ports, and tooling.

Check for these files in `.github/prompts/`:
- `start-app.prompt.md`
- `stop-app.prompt.md`
- `test-app.prompt.md`
- `demo-app.prompt.md`

For each file:
- If it **does not exist** → create it at `.github/prompts/<name>.prompt.md` with commands tailored to this project's stack (read `docs/config.yaml` for source paths, ports, and tech stack)
- If it **exists but is outdated** (e.g., wrong ports, wrong test commands, missing scenarios added by this change) → update the relevant sections in place

**Scenarios to keep current in `demo-app.prompt.md`**: After any change that adds new testable features or E2E scenarios, add them to the "Available scenarios" list. Also ensure the prompt supports `--cases <file>` to load demo-cases.md files (see demo-app creation requirements below).

**Test commands to keep current in `test-app.prompt.md`**: If `docs/config.yaml` or the project test setup changes (new test directories, changed ports), update accordingly. The prompt must enforce: `--filter` alone (no layer flag) runs **all 3 layers** with the filter — only `--filter` combined with a layer flag restricts to one layer.

**Requirements for `start-app.prompt.md`** — when creating or updating this file, it must:
1. **Distinguish dev vs preview ports**: port 5173 = Vite dev server (correct); port 4173 = Vite preview server (wrong). Never treat port 4173 as the frontend being ready — always target port 5173 for the dev server.
2. **Kill stale preview servers**: If port 4173 is occupied but 5173 is not, stop the preview process before starting `npm run dev`.
3. **Check infrastructure separately**: detect Docker engine availability before attempting `docker compose`; if Docker Desktop is not running, start it and wait for the engine to be ready before proceeding.
4. **Support flags**: `--frontend`, `--backend`, `--infra`, `--docker` — each starts only the relevant subset.
5. **Verify all services before confirming ready**: after starting each component, probe its HTTP endpoint (e.g. `Invoke-WebRequest`) to confirm it actually responds. If any check fails, report failure with log context — do NOT show the "✅ Application Started" summary until all probes pass.
6. **Report endpoints clearly**: after all probes pass, list the URL for each component with its actual status (✅ Started / ⏭️ Already running / ⏭️ Skipped).

### Creating `demo-app.prompt.md` — General Requirements

The demo command must:
1. **Ask the user** how they want to demo before starting (speed options + manual-control option)
2. **Speed modes**: fast (quick review) / normal (comfortable viewing, default) / slow (presentation pace)
3. **Manual control mode**: lets user trigger each scenario individually — useful for pausing between features
4. **Check prerequisites** before running (app must be reachable, demo tooling must be configured)
5. **Report results** after demo completes — which scenarios passed/failed

The specific implementation depends on the project's E2E framework:

**If using Playwright (most common):**
- Create `e2e/playwright.demo.config.ts` that reads a `DEMO_SPEED` env var and maps it to `launchOptions.slowMo`:
  - `fast` → 1000ms, `normal` → 5000ms, `slow` → 10000ms
- Headed speed demo: `$env:DEMO_SPEED="normal"; npx playwright test --headed --config playwright.demo.config.ts --project=chromium`
- Manual control (UI mode): launch as a **detached background process** using `Start-Process -WindowStyle Hidden` serving on `--ui-host=localhost --ui-port=8080 --headed` — so the server persists after the shell closes. Open `http://localhost:8080` in a browser — clicking ▶ runs each scenario with the app browser opening automatically (`--headed` is required for the browser to open)
- Add `--grep <pattern>` for scenario filtering
- `--slow-mo` is NOT a valid CLI flag — use `playwright.demo.config.ts` with `launchOptions.slowMo` instead
- **Windows grep caveat (critical)**: On Windows, `|` in a `--grep` argument is interpreted as a pipe operator by PowerShell and cmd.exe — even inside quoted strings or batch files. When filtering by multiple patterns joined with `|`, **do not pass `--grep` via the shell**. Instead, write a temp Node.js script that sets `process.argv` directly and calls `require()` on the Playwright CLI:
  ```javascript
  process.chdir('C:\\path\\to\\e2e');
  process.env.DEMO_SPEED = 'normal';
  const grep = ['pattern1 > test name', 'pattern2 > test name'].join('|');
  process.argv = ['node', 'pw', 'test', '--headed', '--config', 'playwright.demo.config.ts', '--grep', grep, '--project=chromium'];
  require('C:\\path\\to\\e2e\\node_modules\\@playwright\\test\\cli.js');
  ```
  The generated `demo-app.prompt.md` must include this technique for multi-pattern grep on Windows.
- **Grep pattern format**: demo-cases.md files use `>` (U+003E) as the describe/test separator (e.g. `Dashboard > dashboard renders…`), matching Playwright's internal test title format exactly. The generated `demo-app.prompt.md` must use `>` in its format comment and grep pattern examples.

**If using Cypress or another framework**: adapt speed/control mechanisms to that framework's equivalent options.

**Scenarios list**: enumerate all testable features from `e2e/tests/` (or equivalent) in the prompt so users know what to filter by.

Report: "✅ Slash commands verified/updated: `/start-app`, `/stop-app`, `/test-app`, `/demo-app`"

---

## Step 12: Offer Demo

After all tests pass and slash commands are verified, ask the user:

```
## 🎬 Would you like a demo?

All tests are passing. Would you like to see a live demo of the **<change name>** changes?

The demo will use the curated scenarios from `docs/changes/<name>/demo-cases.md`
(one representative test per feature — focused, no repetition).

- **Yes, full demo** → `/demo-app --cases docs/changes/<name>/demo-cases.md --speed normal`
- **Yes, specific feature** → Tell me which scenario (e.g., "notifications", "scheduling")
- **Yes, let me control it** → `/demo-app --cases docs/changes/<name>/demo-cases.md --pause`
- **No thanks** → Proceed to `/change:update-master` to update master product docs

Type your choice or just say "demo" to start the full demo.
```

If the user says yes (any variant):
- Full demo → invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --speed normal`
- Specific feature → invoke `/demo-app --filter <scenario> --speed normal`
- Manual control → invoke `/demo-app --cases docs/changes/<name>/demo-cases.md --pause`

After the demo completes, remind the user:
> "Run `/change:update-master` to apply changes to master product docs."

---

## If Implementation is Paused

If the developer agent encounters a blocker:

```
## Implementation Paused

**Change:** <name>
**Progress:** N/M tasks complete

### Blocked On
<description of the issue>

### Options
1. <suggested resolution 1>
2. <suggested resolution 2>
3. Clarify requirements and update change docs

Resume with `/change:apply <name>` after resolving.
```

---

## Guardrails
- Always read all change docs before starting implementation
- Never skip the database step if `has_db_changes: true`
- Always run tests after implementation — don't skip tester agent
- Require **all three test layers**: backend (pytest), frontend (vitest), and e2e (Playwright)
- Never mark `status: implemented` unless all three test layers pass
- Mark tasks complete in `implementation-plan.md` immediately after each is done
- Update Code Reference Map in `tech-spec.md` whenever new code is created or moved
- Pause on blockers — don't guess at requirements
- If test-fix cycles exceed 2 iterations, escalate to user
