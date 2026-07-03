---
description: Review master product docs for accuracy, structure, and freshness. Checks code references against source files, detects code snippets (forbidden), finds redundancy, and verifies docs are at the right detail level.
---

Review master product docs under `docs/` for quality, accuracy, and freshness.

**Input**: Optionally specify scope (e.g., `/change:review tech` or `/change:review all`). Valid scopes: `all`, `product`, `ux`, `architecture`, `data-model`, `tech`, `qa`, `deployment`, `operations`, `reference`. Defaults to `all` if not specified.

---

## Step 1: Load Review Skill and Project Config

Read `.github/skills/spec-review/SKILL.md` for the full review checklist and criteria.

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

## Step 4: Run Checks

Execute all applicable checks from the spec-review skill:

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
For each folder, check required sections as defined in the spec-review skill:
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

## Step 5: Generate Review Report

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

1. Fix broken code references (N items)
2. Remove code snippets (N items)
3. Add missing code reference map entries (N items)
4. Resolve redundancy (N items)
```

---

## Step 6: Offer to Fix Issues

After presenting the report, ask:
> "Would you like me to auto-fix any of these issues? Options:
> 1. Fix all Critical issues automatically
> 2. Fix broken code references only
> 3. Fix code snippets only
> 4. Show me each issue and I'll decide
> 5. No — I'll fix manually"

If the user chooses auto-fix:
- For broken code references: search workspace for the symbol to find correct file, update the map
- For code snippets in docs: remove the code block and replace with a source file reference
- For missing Code Reference Map entries: search workspace for the function, add map entry

---

## Guardrails
- Always load spec-review skill before running checks
- Never modify source code during a review — only docs are changed
- Report all issues found — don't silently skip
- When fixing broken code references, search the workspace to find the correct current location
- If a symbol genuinely no longer exists, remove it from the Code Reference Map (don't guess a new location)
- Flag but don't auto-fix redundancy — this requires human judgment to decide which doc is authoritative
