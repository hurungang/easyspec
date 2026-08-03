---
name: es-quick-fix
description: es-quick-fix command
---

Quickly diagnose and fix an issue without going through the full change lifecycle. This command is for standalone bugs or issues that don't belong to any active change.

**Input**: A description of the issue (e.g., `/es-quick-fix "login page shows 500 error when submitting empty form"`). If omitted, the command will ask.

---

## Step 1: Understand the Issue and Gather Context

If an issue description is provided, use it. Otherwise, ask:

> "Describe the issue you're seeing. What's the observed behavior? What should happen instead? Where does it occur?"

Announce: **"Quick-fix: investigating `<brief issue summary>`"**

Read the following project context files in parallel:
1. `docs/config.yaml` — project structure, tech stack, conventions, source/test paths
2. `docs/master/` directory listing — master product docs for spec reference.

---

## Step 2: Triage — Identify the Affected Area

Based on the issue description and `docs/config.yaml`, determine which project area is affected:

- **Frontend UI issue** (component rendering, interaction, styling) → delegate to **es-ux-specialist agent**
- **Backend API/logic issue** (endpoint behavior, data processing) → delegate to **es-developer agent**  
- **Database/schema issue** (data integrity, queries, models) → delegate to **es-database-designer agent**
- **Architecture/system issue** (component interaction, service boundaries) → delegate to **es-architect agent**

If the area is ambiguous, ask the user one clarifying question before delegating.

---

## Step 3: Investigate with the Appropriate Agent

Delegate to the identified agent with this prompt:

> "A bug has been reported: `<issue description>`.
>
> Read `docs/config.yaml` for project context and structure.
> Read relevant master docs from `docs/master/` for expected behavior.
>
> Your task is to **investigate the issue and identify the root cause**. Do NOT fix it yet.
>
> 1. Identify which files/components are affected
> 2. Trace the code path that produces the incorrect behavior
> 3. Determine what the correct behavior should be (based on master docs or conventions)
> 4. Report your findings including:
>    - **Affected files** with line numbers
>    - **Root cause** analysis
>    - **Proposed fix** (high-level approach, not code)

Wait for the agent to complete the investigation.

---

## Step 4: Create Reproduction Test (Tester)

If the issue is reproducible, delegate to **es-tester agent**:

> "An issue has been identified: `<issue description>`.
>
> **Investigation findings:** <summary from Step 3>
>
> Read `docs/config.yaml` for test directory paths and conventions.
>
> Your task:
> 1. Create a failing test case that reproduces this issue
> 2. The test should:
>    - Demonstrate the observed (incorrect) behavior
>    - Assert the expected (correct) behavior
>    - Currently FAIL to prove the bug exists
> 3. Choose the appropriate test layer(s):
>    - **Backend tests** (pytest) if it's an API/logic issue
>    - **Frontend component tests** (Vitest) if it's a component behavior issue
>    - **E2E tests** (Playwright) if it's a user flow issue
> 4. Run the test to confirm it fails
> 5. Report the test file path and failure output
>
> Do NOT fix the issue — only create the reproduction test."

Wait for tester to complete and report. If the issue is not practically reproducible with an automated test, skip to Step 5.

---

## Step 5: Implement the Fix (Developer)

Delegate to **es-developer agent**:

> "A bug needs to be fixed: `<issue description>`.
>
> Read:
> - `docs/config.yaml` for project conventions and source paths
> - Investigation findings from the agent in Step 3
> - The failing reproduction test at: <test file path> (if created)
>
> Your task is to:
> 1. Implement the fix based on the root cause analysis
> 2. Ensure the reproduction test passes (if one exists)
> 3. Run all existing tests to ensure no regressions
> 4. Document the changes:
>    - List all files modified with line numbers
>    - Brief description of what was changed and why"

Wait for developer to complete.

---

## Step 6: Verify and Sign Off (Tester)

Delegate to **es-tester agent**:

> "The fix for `<issue description>` has been implemented. Verify the fix.
>
> Read `docs/config.yaml` for test directory paths.
>
> Your task:
> 1. Run the reproduction test — confirm it now PASSES (if created)
> 2. Run related tests to ensure no regressions
> 3. If the reproduction test was skipped, manually verify the fix by examining the code changes
> 4. Report verification results
>
> If any test fails, report details for additional fixes. Iterate up to 2 attempts."

If tests fail after 2 iterations, escalate to the user.

---

## Step 7: Show Fix Summary

```markdown
## Quick-Fix Complete

**Issue:** <issue description>
**Root Cause:** <summary from investigation>
**Who Investigated:** <agent name>
**Fix Applied:** <high-level description of changes>

### Files Modified
- `<file path>` — <what changed>
...

### Test Results
- **Reproduction test:** <result>
- **Related tests:** <pass/fail summary>

### Verified By
**es-tester agent** — <sign-off>
```

---

## Guardrails

- **No change docs required** — this workflow skips the change lifecycle entirely
- **Always read docs/config.yaml first** — project context is essential
- **Always check master docs** in `docs/master/` for expected behavior reference
- **Reproduction test is encouraged but optional** — some issues (visual, flaky) may not be practical to automate
- **Maximum 2 fix-test iterations** — escalate to user if not resolved
- **Triage before delegating** — send investigation to the right agent to avoid wasted effort
- **Do NOT create change docs** — this is for quick fixes only. If the issue requires a full change, recommend the user run `/es-change-init` and `/es-change-propose` instead.
- **If the issue scope is too large** (3+ files across layers, requires architecture changes), recommend using the full change lifecycle
