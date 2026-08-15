---
name: es-master-review
description: 'Audit canonical master docs for quality and accuracy, and validate the codebase with a full test run'
---

Review master product docs under `docs/` for quality, accuracy, and freshness, and run the full test suite to confirm a clean status.

**Input**: Optionally specify scope (e.g., `/es-master-review tech` or `/es-master-review all`). Valid scopes: `all`, `product`, `ux`, `architecture`, `data-model`, `tech`, `qa`, `deployment`, `operations`, `reference`. Defaults to `all` if not specified.

---

## Step 1: Load Review Skill and Project Config

Read `.github/skills/es-change-lifecycle/SKILL.md` for master doc structure conventions.

Read `docs/config.yaml` for project source paths (needed to verify code references and test file paths).

---

## Step 2: Determine Scope

Parse the input argument:
- `all` → Review all `docs/master/` folders
- `product` → `docs/master/product/` only
- `ux` → `docs/master/ux/` only
- `architecture` → `docs/master/architecture/` only
- `data-model` → `docs/master/data-model/` only
- `tech` → `docs/master/technology/` only
- `qa` → `docs/master/qa/` only
- `deployment` → `docs/master/deployment/` only
- `operations` → `docs/master/operations/` only
- `reference` → `docs/master/reference/` only

Announce: **"Reviewing: <scope>"**

---

## Step 3: Collect Documents

For each folder in scope:
1. List all `.md` files in the folder and its subfolders
2. Read the content of each file
3. Note file paths for code reference checking

---

## Step 4: Run Full Test Suite

Validate the codebase is healthy and the QA docs are accurate by running the project's tests:

1. Determine the test command(s):
   - Read `docs/config.yaml` `source.tests` for test directories.
   - Read `package.json` (or equivalent build config) for the test script (e.g., `scripts.test`).
   - Read `docs/master/qa/testing-strategy.md` for the documented test layers and commands.
2. Run every test layer (unit, integration, e2e) using the documented commands.
3. Capture the pass/fail summary, including failing test names and error output.
4. Cross-check the QA docs:
   - Every test file referenced in `docs/master/qa/` test plans exists under the `source.tests` paths.
   - Every documented test command actually runs and completes.
5. Treat any test failure as a **Critical** issue — a clean test status is required.

Announce: **"Running test suite…"** then report the result in the review summary (Step 6).

---

## Step 5: Run Checks

Execute all applicable checks:

### 4a. Code Snippet Detection
Search every doc file for:
- Fenced code blocks: ` ```language ` patterns
- Embedded SQL, JSON configs, or script blocks

Flag any found as **Critical violations**.

### 4b. Code Reference Accuracy (tech docs only)
For every Code Reference Map table in `docs/master/technology/`:
1. Extract each row: Symbol | Type | Description | File
2. For each file path in the map:
   - Check if the file exists in the workspace
   - Search for the symbol name in that file
3. Flag broken paths or missing symbols as **Critical violations**

Reverse check: Scan source directories (from `docs/config.yaml` `source.frontend` and `source.backend`) for key function/component patterns and verify they appear in the Code Reference Map.

### 4c. Structure Compliance
For each folder, check required sections as defined in the es-change-lifecycle skill:
- Product docs: Epic Overview, Business Goals, User Stories, Acceptance Criteria, Out of Scope
- Architecture docs: Mermaid diagrams with ≤15 nodes
- Database docs: Mermaid erDiagram, no SQL, database-objects.md currency
- Tech docs: Code Reference Map present and populated
- QA docs: WHEN/THEN scenarios, test file references exist

### 4d. Redundancy Detection
Scan across files in scope for:
- Same function/component described in detail in multiple docs
- Same endpoint or data flow described in both system-level and module-level docs
- Change summaries or historical notes that should have been removed after master update

### 4e. Detail Level Assessment
Flag as **too detailed** if:
- Product docs contain API routes or database field names
- Architecture docs list method signatures or class names
- UX docs describe CSS properties

Flag as **too vague** if:
- Tech specs lack a Code Reference Map
- Architecture docs describe a component with no Mermaid diagram
- QA test plans have no WHEN/THEN scenarios

---

## Step 6: Generate Review Report

Output the full report in this format:

```markdown
# Spec Review Report

**Date**: YYYY-MM-DD
**Scope**: <scope>
**Files Reviewed**: N

## Summary
- ✓ Passing: <N> files
- ✗ Critical: <N> issues (must fix)
- ⚠ Warnings: <N> issues (should fix)
- Tests: ✓ all passing (<N> suites) — or — ✗ <N> failing (list below)

---

## Critical Issues (Must Fix)

### 1. Broken Code Reference
**File**: docs/5-implementation/modules/auth/tech-spec.md  
**Issue**: Code Reference Map entry `authenticate_user` → `backend/app/api/v1/auth.py` — file exists but symbol not found.  
**Action**: Verify function name or update reference.

### 2. Forbidden Code Snippet
**File**: docs/3-architecture/mcp-server-architecture.md  
**Issue**: Contains Python fenced code block (lines 45-52).  
**Action**: Remove code block. Reference `backend/app/services/mcp_service.py` instead.

---

## Warnings (Should Fix)

### 3. Missing Code Reference
**File**: docs/5-implementation/modules/recommendations/tech-spec.md  
**Issue**: `generate_recommendations()` mentioned in text but not in Code Reference Map.  
**Action**: Add entry: `generate_recommendations | function | Generates AI recommendations | backend/app/services/recommendation_service.py`

### 4. Possible Redundancy
**File**: docs/3-architecture/system-overview.md AND docs/3-architecture/modules/mcp/architecture.md  
**Issue**: MCP connection flow described in full detail in both files.  
**Action**: Keep detail in module doc, replace in system-overview with a one-line summary and reference.

---

## Passing Areas

- docs/1-product/ — All feature specs are code-free and properly structured ✓
- docs/4-database/ — Data model current, uses Mermaid ER, no SQL ✓
- docs/6-testing/ — Test plans have WHEN/THEN scenarios and valid test file references ✓

---

## Recommended Actions (Priority Order)

1. Fix failing tests (N failing) — delegate to es-tester / es-developer
2. Fix broken code references (N items)
3. Remove code snippets (N items)
4. Add missing code reference map entries (N items)
5. Resolve redundancy (N items)
```

---

## Step 7: Offer to Fix Issues

After presenting the report, ask:
> "Would you like me to auto-fix any of these issues? Options:
> 1. Fix all Critical issues automatically
> 2. Fix failing tests (delegate to es-tester / es-developer)
> 3. Fix broken code references only
> 4. Fix code snippets only
> 5. Show me each issue and I'll decide
> 6. No — I'll fix manually"

If the user chooses auto-fix:
- For failing tests: delegate to **es-tester** (diagnose) and **es-developer** (fix source), then re-run the full suite until clean
- For broken code references: search workspace for the symbol to find correct file, update the map
- For code snippets in docs: remove the code block and replace with a source file reference
- For missing Code Reference Map entries: search workspace for the function, add map entry

---

## Guardrails
- Always load es-change-lifecycle skill before running checks
- Run the full test suite in Step 4 — never skip it or assume a clean status
- A clean test status is required before declaring the review complete
- During doc review, only docs are changed; test fixes may require source changes — confirm with the user and delegate to es-tester / es-developer
- Report all issues found — don't silently skip
- When fixing broken code references, search the workspace to find the correct current location
- If a symbol genuinely no longer exists, remove it from the Code Reference Map (don't guess a new location)
- Flag but don't auto-fix redundancy — this requires human judgment to decide which doc is authoritative
