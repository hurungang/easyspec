---
name: es-master-review
description: Audit canonical master docs for quality, accuracy, and structure, and validate the codebase with a full test run
---

Review master product docs under `<docs-folder>/master/` for quality, accuracy, freshness, and merge-friendly structure, and run the full test suite to confirm a clean status.

**Input**: Optionally specify scope (e.g., `/es-master-review tech` or `/es-master-review all`). Valid scopes: `all`, `product`, `ux`, `architecture`, `data-model`, `tech`, `qa`, `deployment`, `operations`, `reference`, `structure`. Defaults to `all` if not specified. `structure` reviews modularization and link integrity across every area.

---

## Step 1: Load Review Skill and Project Config

Read `.github/skills/es-change-lifecycle/SKILL.md` for master doc structure conventions.

Read `easyspec-config.yaml` for project source paths (needed to verify code references and test file paths).

---

## Step 2: Determine Scope

Parse the input argument:
- `all` → Review all `<docs-folder>/master/` folders
- `product` → `<docs-folder>/master/product/` only
- `ux` → `<docs-folder>/master/ux/` only
- `architecture` → `<docs-folder>/master/architecture/` only
- `data-model` → `<docs-folder>/master/data-model/` only
- `tech` → `<docs-folder>/master/technology/` only
- `qa` → `<docs-folder>/master/qa/` only
- `deployment` → `<docs-folder>/master/deployment/` only
- `operations` → `<docs-folder>/master/operations/` only
- `reference` → `<docs-folder>/master/reference/` only
- `structure` → modularization and link integrity for all areas (no domain content review)

Announce: **"Reviewing: <scope>"**

---

## Step 3: Collect Documents

For each folder in scope:
1. List all `.md` files in the folder and its subfolders
2. Read the content of each file
3. Note file paths for code reference checking
4. Record line count and byte size for every file — required for the modularization assessment in Step 5f

---

## Step 4: Run Full Test Suite

Validate the codebase is healthy and the QA docs are accurate by running the project's tests:

1. Determine the test command(s):
   - Read `easyspec-config.yaml` `source.tests` for test directories.
   - Read `package.json` (or equivalent build config) for the test script (e.g., `scripts.test`).
   - Read `<docs-folder>/master/qa/testing-strategy.md` for the documented test layers and commands.
2. Run every test layer (unit, integration, e2e) using the documented commands.
3. Capture the pass/fail summary, including failing test names and error output.
4. Cross-check the QA docs:
   - Every test file referenced in `<docs-folder>/master/qa/` test plans exists under the `source.tests` paths.
   - Every documented test command actually runs and completes.
5. Treat any test failure as a **Critical** issue — a clean test status is required.

Announce: **"Running test suite…"** then report the result in the review summary (Step 6).

---

## Step 5: Run Checks

Execute all applicable checks:

### 5a. Code Snippet Detection
Search every doc file for:
- Fenced code blocks: ` ```language ` patterns
- Embedded SQL, JSON configs, or script blocks

Flag any found as **Critical violations**.

### 5b. Code Reference Accuracy (tech docs only)
For every Code Reference Map table in `<docs-folder>/master/technology/`:
1. Extract each row: Symbol | Type | Description | File
2. For each file path in the map:
   - Check if the file exists in the workspace
   - Search for the symbol name in that file
3. Flag broken paths or missing symbols as **Critical violations**

Reverse check: Scan source directories (from `easyspec-config.yaml` `source.frontend` and `source.backend`) for key function/component patterns and verify they appear in the Code Reference Map.

### 5c. Structure Compliance
For each folder, check required sections as defined in the es-change-lifecycle skill:
- Product docs: Epic Overview, Business Goals, User Stories, Acceptance Criteria, Out of Scope
- Architecture docs: Mermaid diagrams with ≤15 nodes
- Database docs: Mermaid erDiagram, no SQL, database-objects.md currency
- Tech docs: Code Reference Map present and populated
- QA docs: WHEN/THEN scenarios, test file references exist

### 5d. Redundancy Detection
Scan across files in scope for:
- Same function/component described in detail in multiple docs
- Same endpoint or data flow described in both system-level and module-level docs
- Change summaries or historical notes that should have been removed after master update

### 5e. Detail Level Assessment
Flag as **too detailed** if:
- Product docs contain API routes or database field names
- Architecture docs list method signatures or class names
- UX docs describe CSS properties

Flag as **too vague** if:
- Tech specs lack a Code Reference Map
- Architecture docs describe a component with no Mermaid diagram
- QA test plans have no WHEN/THEN scenarios

### 5f. Modularization & Merge-Readiness (all scopes; full check for `structure`)

Assess whether each area is split at the right granularity for future changes. The policy lives in the es-change-lifecycle skill under **Master Doc Modularization** — apply its criteria, don't invent new ones.

**1. Oversized files (split candidate)**
Compute line count and size for every master doc and prototype file. Flag any file over the soft limit:

| Artifact | Soft limit (evaluate) | Hard limit (split now) |
|----------|-----------------------|------------------------|
| Markdown master doc | 500 lines / 25 KB | 800 lines / 40 KB |
| HTML master prototype | 1,500 lines / 120 KB | 2,500 lines / 200 KB |
| Code Reference Map table | 150 rows | 250 rows |

A file over the soft limit is **not automatically wrong** — it is a candidate. Only recommend a split when the file also contains **two or more clearly separable modules** and future changes are likely to touch them independently.

**2. Split opportunity (warning)**
Recommend splitting when all are true:
- Over the soft limit
- At least two natural seams (independent modules/domains/screens)
- Content can be relocated without duplication
- No resulting module would be under ~80 lines

Report the proposed target structure, e.g. `<docs-folder>/master/ux/prototype/index.html` hub + `prototype/modules/<module>.html`.

**3. Over-fragmentation (warning)**
Flag the opposite problem too:
- Many tiny module files (< ~80 lines) that should be one file
- Nesting deeper than `<area>/modules/<module>/<file>.md`
- A hub that is only a link list with no useful summary
- Content duplicated between a hub and its modules instead of relocated

**4. Hub and link integrity (critical)**
For every modularized area:
- A stable hub file exists (`overview.md`, `README.md`, or `index.html`) and is the documented entry point
- Every module is linked from the hub
- Every module links back to the hub
- Every relative link resolves to an existing file (check Markdown links and HTML `href`/`src`)
- No orphan modules and no stale links to files that were renamed or removed
- No duplicated copy of the same section in both the hub and a module

**5. Prototype loadability (critical for `ux` and `structure`)**
For `<docs-folder>/master/ux/`:
- `prototype/index.html` opens directly from disk and links to every module page
- Module pages use only relative `<link rel="stylesheet">` and classic `<script src>`
- No `fetch`, XHR, ES modules, absolute paths, or build step — these break `file://` loading
- Shared styles live in `prototype/shared/`, not copied inline into every module
- Editing one module page does not require editing another

**6. Merge-friendliness (warning)**
- Heading names and section order are stable (no gratuitous reordering)
- Change summaries or historical notes left in master docs (should have been removed)
- Multiple unrelated modules packed into one file while separate files already exist for siblings

Do **not** treat "single file" as a defect. A cohesive 900-line doc with one module is healthier than an artificial split.

---

## Step 6: Generate Review Report

Output the full report in this format:

```markdown
# Master Docs Review Report

**Date**: YYYY-MM-DD
**Scope**: <scope>
**Files Reviewed**: N

## Summary
- ✓ Passing: <N> files
- ✗ Critical: <N> issues (must fix)
- ⚠ Warnings: <N> issues (should fix)
- Tests: ✓ all passing (<N> suites) — or — ✗ <N> failing (list below)
- Structure: ✓ healthy — or — ⚠ <N> split candidates, <N> over-fragmented files, <N> broken links

---

## Critical Issues (Must Fix)

### 1. Broken Code Reference
**File**: <docs-folder>/master/technology/modules/auth/tech-spec.md  
**Issue**: Code Reference Map entry `authenticate_user` → `backend/app/api/v1/auth.py` — file exists but symbol not found.  
**Action**: Verify function name or update reference.

### 2. Forbidden Code Snippet
**File**: <docs-folder>/master/architecture/mcp-server-architecture.md  
**Issue**: Contains Python fenced code block (lines 45-52).  
**Action**: Remove code block. Reference `backend/app/services/mcp_service.py` instead.

---

## Warnings (Should Fix)

### 3. Missing Code Reference
**File**: <docs-folder>/master/technology/modules/recommendations/tech-spec.md  
**Issue**: `generate_recommendations()` mentioned in text but not in Code Reference Map.  
**Action**: Add entry: `generate_recommendations | function | Generates AI recommendations | backend/app/services/recommendation_service.py`

### 4. Possible Redundancy
**File**: <docs-folder>/master/architecture/system-overview.md AND <docs-folder>/master/architecture/modules/mcp/architecture.md  
**Issue**: MCP connection flow described in full detail in both files.  
**Action**: Keep detail in module doc, replace in system-overview with a one-line summary and reference.

---

## Structure & Merge-Readiness

### Split Candidates (over soft limit + multiple modules)
| File | Size | Modules Found | Proposed Structure |
|------|------|---------------|--------------------|
| <docs-folder>/master/ux/prototype/index.html | 3,240 lines / 210 KB | auth, dashboard, billing | `prototype/index.html` hub + `prototype/modules/{auth,dashboard,billing}.html` |
| ... | ... | ... | ... |

### Over-Fragmentation
- <file> — <N> lines, <why it should merge back>

### Broken Links / Orphans
- <hub or module> — link to `<path>` does not resolve

### Prototype Loadability
- <file> — <issue, e.g. uses `fetch()` and will not open from `file://`>

If the structure is healthy, state: `All areas are appropriately sized and linked ✓`

---

## Passing Areas

- <docs-folder>/master/product/ — All feature specs are code-free and properly structured ✓
- <docs-folder>/master/data-model/ — Data model current, uses Mermaid ER, no SQL ✓
- <docs-folder>/master/qa/ — Test plans have WHEN/THEN scenarios and valid test file references ✓

---

## Recommended Actions (Priority Order)

1. Fix failing tests (N failing) — delegate to es-tester / es-developer
2. Fix broken links and orphans (N items)
3. Fix broken code references (N items)
4. Remove code snippets (N items)
5. Add missing code reference map entries (N items)
6. Resolve redundancy (N items)
7. Optimize structure: split oversized docs / merge over-fragmented files (N candidates)
```

---

## Step 7: Offer to Fix Issues

After presenting the report, ask:
> "Would you like me to auto-fix any of these issues? Options:
> 1. Fix all Critical issues automatically
> 2. Fix failing tests (delegate to es-tester / es-developer)
> 3. Fix broken code references only
> 4. Fix code snippets only
> 5. Fix broken links and orphans only
> 6. Optimize master doc structure (split oversized docs, merge over-fragmented files)
> 7. Show me each issue and I'll decide
> 8. No — I'll fix manually"

If the user chooses auto-fix:
- For failing tests: delegate to **es-tester** (diagnose) and **es-developer** (fix source), then re-run the full suite until clean
- For broken code references: search workspace for the symbol to find correct file, update the map
- For code snippets in docs: remove the code block and replace with a source file reference
- For missing Code Reference Map entries: search workspace for the function, add map entry
- For broken links and orphans: fix the relative path or add the missing link; delete orphaned modules only after confirming their content exists elsewhere
- For structure optimization: delegate each area to its owning agent (product-owner, ux-specialist, architect, database-designer, developer, tester) with the exact target layout from the report. Require them to relocate content (never duplicate), keep the hub as the entry point, and verify links afterwards. Show the user the proposed split before applying it when more than one file is affected.

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
- Never split a master doc just because it is large — require the size **and** multiple-module criteria from the lifecycle skill
- Never recommend splitting a cohesive single-module doc, and never split content just to hit a line target
- When applying a split, relocate content (remove from the hub) instead of duplicating it, and verify every hub/module link resolves
- Keep modularized trees shallow: no more than two levels below the area root, and no module file under ~80 lines
