---
description: Fix an issue in an existing change by creating a reproduction test, implementing the fix, and updating affected documentation. All fix activities are timestamped for traceability.
---

Fix an issue in an existing change through a systematic test-driven approach with full documentation updates.

**Input**: Optionally specify a change name and issue description (e.g., `/change-fix add-dark-mode "navbar toggle doesn't save preference"`). If omitted, the command will ask.

---

## Step 1: Select the Change

If a change name is provided, use it.

Otherwise, list available changes:
```
Get-ChildItem docs/changes/ -Directory | Where-Object { $_.Name -ne 'archive' }
```

If only one active change exists, auto-select it. If multiple, ask the user to select.

Announce: **"Fixing issue in change: `<name>`"**

---

## Step 2: Capture the Issue Description

If no issue description was provided in the input, ask the user:
> "Describe the issue you want to fix in `<name>`. What's the observed behavior? What should happen instead?"

Record the issue as a clear statement including:
- **Observed behavior**: What is currently happening (the bug/problem)
- **Expected behavior**: What should happen instead
- **Context**: Where/when does this occur (if applicable)

If the description is ambiguous or missing critical details, ask one clarifying question before proceeding.

---

## Step 3: Audit Current Change State

Read all existing files in `docs/changes/<name>/` to understand the current state:

1. `.change.yaml` — Current status and completed agents
2. `prd.md` — Requirements and acceptance criteria
3. `spec-change.md` — Spec delta
4. `prototype/index.html` — (if exists) UI prototype
5. `architecture.md` — (if exists) Architecture decisions
6. `data-model.md` — (if exists) Data model
7. `tech-spec.md` — Technical specification and Code Reference Map
8. `implementation-plan.md` — Task list and completion status
9. `test-plan.md` — Test strategy and scenarios
10. `fix-log.md` — (if exists) Previous fixes

Also read `docs/config.yaml` for project context.

Determine the **implementation phase**:
- **Phase A**: No code written yet
- **Phase B**: Partially implemented
- **Phase C**: Fully implemented, pre-test
- **Phase D**: Fully implemented and tested

Announce the detected phase before proceeding.

---

## Step 4: Create Fix Plan with Timestamp

Generate a timestamped fix plan entry. The timestamp format should be ISO 8601: `YYYY-MM-DDTHH:MM:SSZ`

```markdown
## Fix Plan

**Fix ID:** FIX-<timestamp-YYYYMMDD-HHMMSS>
**Created:** <ISO 8601 timestamp>
**Issue:** <issue description>

### Analysis
- **Affected components:** <list components/files likely affected>
- **Root cause hypothesis:** <initial assessment of what might be wrong>
- **Documentation impact:** <which docs may need updates>

### Fix Tasks
1. [ ] **Reproduce** — Create test case that demonstrates the issue
2. [ ] **Fix** — Implement the fix in code
3. [ ] **Verify** — Run all tests (backend, frontend, E2E)
4. [ ] **Document** — Update affected documentation

### Expected Changes
- **Code files:** <list of files expected to change>
- **Test files:** <list of test files to add/modify>
- **Docs:** <list of docs that may need updates>
```

Use the `vscode_askQuestions` tool to confirm with the user before proceeding:
- question: "Proceed with this fix plan?"
- options: `Proceed` (recommended), `Cancel`
- allowFreeformInput: false

If the user selects **Proceed**, continue. If **Cancel**, stop and notify that no changes were made.

---

## Step 5: Create or Update Fix Log

Check if `docs/changes/<name>/fix-log.md` exists.

**If it does NOT exist**, create it with this structure:

```markdown
# Fix Log: <change-name>

This document tracks all bug fixes and issues resolved for this change.

---

## FIX-<timestamp-YYYYMMDD-HHMMSS>

**Created:** <ISO 8601 timestamp>
**Status:** In Progress
**Issue:** <issue description>

### Observed Behavior
<what is currently happening>

### Expected Behavior
<what should happen instead>

### Analysis
- **Affected components:** <list>
- **Root cause hypothesis:** <hypothesis>
- **Documentation impact:** <list>

### Fix Tasks
- [ ] **Reproduce** — Create test case that demonstrates the issue
- [ ] **Fix** — Implement the fix in code
- [ ] **Verify** — Run all tests (backend, frontend, E2E)
- [ ] **Document** — Update affected documentation

### Implementation Details
<!-- Will be filled in as fix progresses -->

### Test Cases Added/Modified
<!-- Will be updated by tester -->

### Code Changes
<!-- Will be updated by developer -->

### Documentation Updates
<!-- Will be updated as docs are revised -->

---
```

**If it EXISTS**, append a new fix entry at the TOP (after the header):

```markdown
---

## FIX-<timestamp-YYYYMMDD-HHMMSS>

<full fix plan structure as above>

---
```

---

## Step 6: Reproduce the Issue (Delegate to Tester)

Load `.github/skills/change-lifecycle/SKILL.md` for context.

Delegate to **tester agent**:
> "A bug has been reported in change `<name>`. Fix ID: `FIX-<timestamp>`.
>
> **Issue:** <full issue description with observed vs expected behavior>
>
> Read all change docs in `docs/changes/<name>/` and the current codebase via the Code Reference Map in `tech-spec.md`.
>
> Your task is to **create a failing test case** that reproduces this issue. The test should:
> 1. Demonstrate the observed (incorrect) behavior
> 2. Assert the expected (correct) behavior
> 3. Currently FAIL to prove the bug exists
>
> Choose the appropriate test layer(s):
> - **Backend tests** (pytest) if it's an API/logic issue
> - **Frontend component tests** (Vitest) if it's a component behavior issue
> - **E2E tests** (Playwright) if it's a user flow issue
>
> After creating the test:
> 1. Run it to confirm it fails
> 2. Document the test case location in `docs/changes/<name>/fix-log.md` under the current fix entry in the 'Test Cases Added/Modified' section
> 3. Report the test file path and the failure output
>
> Do NOT fix the issue — only create the reproduction test."

Wait for tester to complete and report the test location and failure details.

Update the fix log with test information:
```markdown
### Test Cases Added/Modified
- **File:** <test file path>
- **Test name:** <test name>
- **Status:** Failing (reproduces issue)
- **Failure output:** 
  ```
  <failure message>
  ```
```

Mark the "Reproduce" task as complete: `- [x] **Reproduce**`

---

## Step 7: Implement the Fix (Delegate to Developer)

Delegate to **developer agent**:
> "A bug in change `<name>` needs to be fixed. Fix ID: `FIX-<timestamp>`.
>
> **Issue:** <issue description>
>
> Read:
> - `docs/changes/<name>/fix-log.md` — current fix entry with failing test details
> - `docs/changes/<name>/tech-spec.md` — Code Reference Map
> - `docs/config.yaml` — project conventions
> - The failing test at: <test file path>
>
> Your task is to:
> 1. Analyze the failing test to understand what needs to be fixed
> 2. Implement the fix in the code
> 3. Ensure the reproduction test now passes
> 4. Ensure all existing tests still pass
> 5. Update `docs/changes/<name>/tech-spec.md` Code Reference Map if you changed any code locations
> 6. Document your changes in `docs/changes/<name>/fix-log.md` under 'Code Changes' section:
>    - List all files modified
>    - Brief description of what was changed and why
>    - Include file paths and line numbers
>
> Run the reproduction test and all related tests to verify the fix. Report results."

Wait for developer to complete and report test results.

Update the fix log status:
```markdown
### Code Changes
**Modified by:** developer agent
**Timestamp:** <ISO 8601 timestamp>

<developer's documentation of changes>
```

Mark the "Fix" task as complete: `- [x] **Fix**`

---

## Step 8: Verify All Tests (Delegate to Tester)

Delegate to **tester agent**:
> "The fix for `<name>` (Fix ID: `FIX-<timestamp>`) has been implemented. Now verify the fix is complete.
>
> Read:
> - `docs/changes/<name>/fix-log.md` — current fix entry
> - `docs/changes/<name>/test-plan.md` — full test coverage
>
> Your task is to:
> 1. Run the reproduction test — confirm it now PASSES
> 2. Run ALL tests across all three layers:
>    - Backend tests (pytest)
>    - Frontend component tests (Vitest)
>    - E2E tests (Playwright)
> 3. Report pass/fail counts for each layer
> 4. If ANY test fails:
>    - Analyze whether it's related to this fix
>    - Report failure details to developer for additional fixes
>    - Iterate until all tests pass
>
> Update `docs/changes/<name>/fix-log.md` with final test results under the current fix entry."

**Test-Fix Iteration (if needed):**
- If tests fail and it's related to the fix, return to developer for additional fixes
- Track iteration count (max 2 attempts)
- If still failing after 2 attempts, escalate to user
- Update fix log with each iteration

When all tests pass, update the fix log:
```markdown
### Verification Results
**Verified by:** tester agent
**Timestamp:** <ISO 8601 timestamp>

- **Backend tests:** ✓ All passing
- **Frontend tests:** ✓ All passing
- **E2E tests:** ✓ All passing
- **Reproduction test:** ✓ Now passing (was failing)
```

Mark the "Verify" task as complete: `- [x] **Verify**`

---

## Step 9: Update Affected Documentation

Based on the fix, determine if any documentation needs updating:

### 9a. Check if PRD needs updates

If the fix revealed that acceptance criteria were unclear or incorrect, delegate to **product_owner agent**:
> "The fix `FIX-<timestamp>` for change `<name>` revealed a potential issue with requirements.
>
> **Issue that was fixed:** <issue description>
> **Code changes made:** <summary from fix log>
>
> Read `docs/changes/<name>/prd.md` and assess if acceptance criteria need clarification or updates to prevent similar issues. If changes are needed, update the PRD. If not, report that PRD is accurate."

If updated, delegate to **document_reviewer agent** to review.

### 9b. Check if Spec Change needs updates

If the fix changed the intended behavior described in spec-change.md, delegate to **product_owner agent**:
> "Review `docs/changes/<name>/spec-change.md` in light of fix `FIX-<timestamp>`. Update if the spec delta description needs to reflect the corrected behavior."

If updated, delegate to **document_reviewer agent** to review.

### 9c. Check if Tech Spec needs updates

Delegate to **developer agent**:
> "Review `docs/changes/<name>/tech-spec.md` after fix `FIX-<timestamp>`. Ensure the Code Reference Map is up-to-date with all changes made during the fix. Update technical approach description if the fix revealed architectural considerations."

### 9d. Check if Test Plan needs updates

Delegate to **tester agent**:
> "Review `docs/changes/<name>/test-plan.md` after fix `FIX-<timestamp>`. Add the new test scenario if it represents a gap in the original test plan. Update test strategy if this fix revealed a testing blind spot."

### 9e. Update Fix Log

After all documentation updates (if any) are complete, update the fix log entry:
```markdown
### Documentation Updates
**Updated by:** conductor agent
**Timestamp:** <ISO 8601 timestamp>

<list of documents updated, or "No documentation updates required">
```

Mark the "Document" task as complete: `- [x] **Document**`

Update the fix status: `**Status:** Resolved`

---

## Step 10: Show Fix Completion Summary

```markdown
## Fix Complete

**Change:** <name>
**Fix ID:** FIX-<timestamp-YYYYMMDD-HHMMSS>
**Issue:** <issue description>

### Fix Timeline
- **Started:** <timestamp>
- **Completed:** <timestamp>
- **Duration:** <calculated duration>

### Activities Completed
- [x] **Reproduce** — Test case created and confirmed failing
- [x] **Fix** — Code changes implemented
- [x] **Verify** — All tests passing (backend, frontend, E2E)
- [x] **Document** — Affected documentation updated

### Test Results
- **Reproduction test:** ✓ Now passing
- **Backend tests:** ✓ <count> passing
- **Frontend tests:** ✓ <count> passing
- **E2E tests:** ✓ <count> passing

### Files Modified
**Code:**
<list of code files changed>

**Tests:**
<list of test files added/modified>

**Documentation:**
<list of docs updated, or "No docs required updates">

### Fix Log
Full details recorded in: `docs/changes/<name>/fix-log.md#fix-<timestamp-yyyymmdd-hhmmss>`

---

**Next Steps:**
- Run `/change:update-master` if this change is ready to merge to master docs
- Continue development or run `/change-fix` again for additional issues
```

---

## Guardrails

- **Always create a timestamped fix log entry BEFORE starting the fix**
- **Never skip the reproduction test** — tester must create a failing test first
- **Test-driven:** Fix must make the failing test pass without breaking others
- **Track all iterations** — if fix requires multiple attempts, log each in fix-log.md
- **Maximum 2 fix iterations** — escalate to user if tests still fail after 2 developer attempts
- **Documentation is not optional** — if fix changes behavior, docs must be updated
- **Preserve fix history** — never delete or overwrite previous fix entries in fix-log.md
- **Use ISO 8601 timestamps** for all datetime entries (e.g., `2026-05-18T14:30:00Z`)
- **Fix IDs must be unique** — format: `FIX-YYYYMMDD-HHMMSS`
- **Load change-lifecycle skill** before delegating to agents
- **Always run document_reviewer** after any doc updates
- **Phase awareness** — fix approach may differ based on whether code exists yet

## Fix Log Format Reference

The fix-log.md file maintains a chronological record of all fixes with this structure:

```markdown
# Fix Log: <change-name>

This document tracks all bug fixes and issues resolved for this change.

---

## FIX-YYYYMMDD-HHMMSS

**Created:** YYYY-MM-DDTHH:MM:SSZ
**Status:** [In Progress|Resolved|Escalated]
**Issue:** <one-sentence summary>

### Observed Behavior
<detailed description of the bug>

### Expected Behavior
<detailed description of correct behavior>

### Analysis
- **Affected components:** <list>
- **Root cause hypothesis:** <initial hypothesis>
- **Documentation impact:** <list>

### Fix Tasks
- [x/[ ]] **Reproduce** — Create test case that demonstrates the issue
- [x/[ ]] **Fix** — Implement the fix in code
- [x/[ ]] **Verify** — Run all tests (backend, frontend, E2E)
- [x/[ ]] **Document** — Update affected documentation

### Test Cases Added/Modified
<test file locations and details>

### Code Changes
<modified files and descriptions>

### Documentation Updates
<updated docs>

### Verification Results
<final test results>

---
```

Most recent fixes appear at the top (after the header), making the log a reverse-chronological timeline.
