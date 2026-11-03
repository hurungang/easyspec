---
name: es-change-lifecycle
description: Core knowledge for managing the full development lifecycle: creating change doc sets, implementing changes with the agent team, and updating master product docs. Load this when working on any change management, proposal, apply, or master-update task.
license: MIT
metadata:
  author: openspec
  version: "2.0"
---

<!-- easyspec:managed v1 -->
# Change Lifecycle Skill

This skill defines the conventions, document formats, and workflows for the full development lifecycle using the software engineering agent team. It is project-agnostic — all project-specific context (tech stack, source paths, conventions) comes from `easyspec-config.yaml`.

---

## Step 0: Always Read Project Config First

Before starting any task, read `easyspec-config.yaml` (project root) to understand:
- The docs folder: the `docs_folder` setting defines `<docs-folder>` — every path below is rooted there (default `easyspec-docs`)
- Project name and description
- Source code locations (frontend, backend, schema files, test directories)
- Technology stack context
- Project-specific conventions and domain knowledge

Use the source paths from `easyspec-config.yaml` everywhere file paths are referenced in this skill.

---

## Change Directory Structure

Every change lives at `<docs-folder>/changes/<change-name>/` with the following structure:

```
<docs-folder>/changes/<change-name>/
├── .change.yaml              # Metadata: dates, status, scope flags
├── prd.md                    # Product requirements (es-product-owner agent)
├── spec-change.md            # Delta spec: what changes in product spec (es-product-owner agent)
├── prototype/                # (if has_ui_changes)
│   └── index.html            #   UI prototype (es-ux-specialist agent)
├── architecture.md           # (if has_architecture_changes) Mermaid diagrams (es-architect agent)
├── data-model.md             # (if has_db_changes) Entity model (es-database-designer agent)
├── implementation-plan.md    # Task list with done conditions (es-developer agent)
├── tech-spec.md              # Technical spec with code reference map (es-developer agent)
├── test-plan.md              # Test coverage and scenarios (es-tester agent)
├── deployment.md             # (if has_deployment_changes) Deployment steps
└── operations.md             # (if has_operations_changes) Operations notes
```

### `.change.yaml` Format

```yaml
name: <change-name>
created_at: YYYY-MM-DD
status: in-progress        # in-progress | implemented | master-updated | archived
scope:
  has_ui_changes: false
  has_architecture_changes: true
  has_db_changes: false
  has_deployment_changes: false
  has_operations_changes: false
agents_complete:
  es-product-owner: false
  es-ux-specialist: false       # skipped if has_ui_changes is false
  es-architect: false           # skipped if has_architecture_changes is false
  es-database-designer: false   # skipped if has_db_changes is false
  es-developer: false
  es-tester: false
```

---

## Master Product Docs Structure

Master docs live in `<docs-folder>/master/` with the following structure:

| Folder | Purpose | Owner Agent |
|--------|---------|-------------|
| `<docs-folder>/master/product/` | Overall product specification; feature-based product specs | es-product-owner |
| `<docs-folder>/master/ux/` | Product UI prototype — hub `prototype/index.html` plus module pages once the prototype grows (see Master Doc Modularization) | es-ux-specialist |
| `<docs-folder>/master/architecture/` | System architecture Mermaid diagrams; module-level only when needed | es-architect |
| `<docs-folder>/master/data-model/` | Overall entity model (tech-agnostic UML/ER); no schema code | es-database-designer |
| `<docs-folder>/master/technology/` | Master technical specification with code function reference map | es-developer |
| `<docs-folder>/master/qa/` | Feature/module based master test plan set | es-tester |
| `<docs-folder>/master/deployment/` | Master deployment instruction | es-developer |
| `<docs-folder>/master/operations/` | Master operation instruction | es-developer |
| `<docs-folder>/master/reference/` | Reference docs: background context, glossary, API references | any agent |

Every area has **one stable hub file** as its entry point (for example `overview.md`, `README.md`, or `index.html`). By default the hub also holds the content. Modules are added beneath the hub only when the area grows past the modularization criteria below — never pre-split an area that is still small.

---

## Master Doc Modularization

Master docs start as a single file per area and are split only when a file has grown large **and** contains multiple independent modules. The goal is merge-friendly docs: two changes touching different modules should edit different files, not fight over one giant file. Smaller module files also cut agent context cost — an update reads and rewrites only the module it touches.

### When to split

Split a master doc only when **all** of these are true:

1. **Size** — the file exceeds the soft limit below, or will within one or two changes
2. **Multiple modules** — the content has at least two clearly separable modules/domains/screens
3. **Merge pressure** — future changes are likely to touch different modules independently

| Artifact | Soft limit (evaluate) | Hard limit (split now) |
|----------|-----------------------|------------------------|
| Markdown master doc | 500 lines / 25 KB | 800 lines / 40 KB |
| HTML master prototype | 1,500 lines / 120 KB | 2,500 lines / 200 KB |
| Code Reference Map table | 150 rows | 250 rows |

**Never split when:**
- The file is one cohesive topic with no natural seam
- Only one module exists — a large single-module file is still easier to merge than a fake split
- Splitting would duplicate content instead of relocating it
- The file is large only because of prose that should be trimmed instead
- A module would be under ~80 lines — keep it in its parent

**Do not split ahead of need.** A 900-line file with one module stays one file. A 400-line file with three unrelated modules may split early. Judgment beats thresholds.

### Layout pattern

Every modularized area keeps a **stable hub file** as its entry point, with modules beneath it:

```
<docs-folder>/master/<area>/
├── overview.md                 # hub: purpose, short summary per module, links
└── modules/
    ├── <module-a>.md           # one module per file
    └── <module-b>.md
```

Rules:
- **The hub is the source of truth for navigation.** Every module is linked from the hub; every module links back to the hub.
- Use relative Markdown links, e.g. `modules/<module-a>.md`.
- Keep the tree shallow — the deepest allowed path is `<area>/modules/<module>/<file>.md`. No nesting beyond that (`modules/a/b/c.md` is wrong).
- One module per file — never split a single cohesive module into section files.
- Relocating content must not leave duplicate copies. Remove the original section and replace it with a one-line summary plus a link.
- The hub must remain useful on its own: state what the area covers and give a one-line summary of each module.
- Keep hub file names stable (`overview.md`, `README.md`, `index.html`) so existing links never break.

### Area-specific guidance

**product/** — `product-vision.md` is the hub. Split features into `product/features/<feature>.md` (the default shape). Create a feature-group hub only when `features/` itself outgrows the threshold.

**ux/** — see *Master prototype modularization* below.

**architecture/** — `system-overview.md` is the hub with the system diagram. Split subsystem detail into `architecture/modules/<module>/architecture.md` when the diagram set outgrows the threshold or changes touch different subsystems.

**data-model/** — `overview.md` is the hub with the cross-domain relationship map. Split domain diagrams into `data-model/modules/<domain>/entities.md`. The overview keeps the cross-domain map and a one-line summary per domain.

**technology/** — `README.md` is the hub. Split by module into `technology/modules/<module>/tech-spec.md`. A Code Reference Map over 250 rows must be split by module — never keep one table spanning unrelated modules.

**qa/** — `testing-strategy.md` is the hub. Split test plans by module into `qa/test-plans/<module>-test-plan.md`. `qa/demo-cases.md` stays one file until it outgrows the threshold, then splits by feature group with a `qa/demo-cases/` hub.

**deployment/ and operations/** — keep a `README.md` hub. Split by environment or service only when the file outgrows the threshold and covers independent services.

### Master prototype modularization

The master prototype is the most common file to outgrow a single page. Split it when **either**:
- The file exceeds 1,500 lines / 120 KB, or
- It contains 3+ top-level screens/modules and future changes will touch them independently

Structure:

```
<docs-folder>/master/ux/
└── prototype/
    ├── index.html              # hub: shell, global nav, links to module pages
    ├── modules/
    │   ├── <module-a>.html
    │   └── <module-b>.html
    └── shared/
        ├── styles.css          # design tokens + component CSS
        └── app.js              # nav helpers, toasts, modals
```

Rules:
- `prototype/index.html` must remain a working prototype of the whole product: global navigation, a landing screen, and links to every module page.
- Each module page must open directly from disk (`file://`) — no server. Use only relative `<link rel="stylesheet">` and classic `<script src>`; no `fetch`, no ES modules, no build step.
- Each module page loads the shared stylesheet plus its own screen markup/JS. Never copy the entire stylesheet inline into every module.
- Keep module pages independent: editing one module must not require editing another.
- Change prototypes stay single-file at `<docs-folder>/changes/<name>/prototype/index.html` — only the master prototype modularizes.

### Merge-friendly authoring rules

- Keep headings and section order stable — append new modules to the hub index instead of reordering.
- Update the smallest file that owns the content; do not rewrite the hub unless navigation changed.
- Never reformat or re-wrap unrelated content while updating a module — it creates pointless merge conflicts.
- When a change spans multiple modules, edit each module file separately and update the hub once.
- Record every split in the change summary so reviewers can follow the new layout.

---

## Document Format Requirements

### Global Rules for ALL Documents

- **NO code snippets or scripts** — documents reference source code, they do not contain it
- **NO schema code in docs** — schema/model files (configured in `easyspec-config.yaml` `source.schema`) are the source of truth
- **NO verbose prose** — concise, scannable, use bullet points
- **Mermaid only for diagrams** — no ASCII art, no DrawIO screenshots, no image embeds
- **Source code references** — use relative paths from workspace root, e.g. `backend/app/api/v1/auth.py`
- **Strong detail level** — enough for an informed engineer to act; not so much it duplicates source code

---

### `prd.md` — Product Requirements Document

**Owner**: es-product-owner agent  
**Purpose**: Business-level description of what is being built and why.

**Required sections**:
1. **Epic Overview** — One paragraph: what problem it solves, why it matters to the business
2. **Business Goals** — 3–5 measurable outcomes
3. **Users & Personas** — Who benefits and their primary needs
4. **User Stories** — "As a [user], I want [goal], so that [benefit]" format
5. **Acceptance Criteria** — Observable, testable outcomes from user perspective
6. **Out of Scope** — What this change explicitly does NOT cover
7. **Dependencies & Constraints** — External dependencies or business constraints

**Must NOT contain**: Technical design, API specs, database schema, implementation approaches, code.

---

### `spec-change.md` — Specification Delta

**Owner**: es-product-owner agent  
**Purpose**: Documents what changes in the product specification as a delta from current state.

**Required sections**:
1. **Affected Spec Areas** — Which master spec areas this change touches (with links to `openspec/specs/`)
2. **New Capabilities** — New user-facing capabilities being added
3. **Modified Capabilities** — Existing capabilities being changed, with before/after description
4. **Removed Capabilities** — Capabilities being removed (if any)
5. **Spec Update Instructions** — Bullet list of what needs to change in master spec files

---

### `architecture.md` — Architecture Changes

**Owner**: es-architect agent  
**Purpose**: Documents how the system architecture changes.

**Required sections**:
1. **Changed Components** — Which existing components change and how
2. **New Components** — New components being added (Mermaid `flowchart` or `C4Context`)
3. **Integration Points** — New or changed integration points
4. **Data Flow Changes** — How data flow changes (Mermaid `sequenceDiagram` if helpful)
5. **Master Arch Update Instructions** — What to update in `<docs-folder>/master/architecture/`

**Rules**: Max 15 nodes per diagram. No implementation details. Component/service level only.

---

### `data-model.md` — Data Model Changes

**Owner**: es-database-designer agent  
**Purpose**: Documents entity model changes in a technology-agnostic way. Shows business entities and their relationships regardless of the underlying database technology.

**Required sections**:
1. **New Entities** — New business entities and their attributes (Mermaid `erDiagram`)
2. **Modified Entities** — Changes to existing entities (added/removed/renamed fields)
3. **Removed Entities/Fields** — What is being removed and why
4. **Schema File References** — Which schema/model files to update (paths from `easyspec-config.yaml` `source.schema`)
5. **Master Data Model Update Instructions** — What to update in `<docs-folder>/master/data-model/`

**ER Diagram Requirements**: Every Mermaid `erDiagram` block MUST include:
- Attribute lines inside each entity block using **generic types only**: `uuid`, `string`, `enum`, `boolean`, `int`, `datetime`, `json`
- All relationships with cardinality (`||--o{`, `}o--||`, etc.) and a relationship label
- Foreign-key fields shown as `uuid <field_name>` attributes within the entity block
- At minimum: `id`, business name/slug fields, status/type enums, and boolean flags

**What to include vs. exclude**:
- INCLUDE: entity names, business attributes with generic types, relationships, foreign-key reference fields
- EXCLUDE: SQL DDL (CREATE TABLE, ALTER TABLE), ORM class syntax, database-specific types (VARCHAR, TIMESTAMP WITH TIME ZONE), indexes, constraints, migration scripts
- Mermaid erDiagram attribute blocks are NOT schema code — they are the required business domain model representation

**Rules**: Show business entities and relationships only — not implementation details, storage types, indexes, or constraints. No SQL, ORM, or migration code of any kind. Tech stack is irrelevant here; focus on the domain model.

---

### `implementation-plan.md` — Implementation Task List

**Owner**: es-developer agent  
**Purpose**: Ordered task list for implementing the change.

**Format**:
```markdown
## Implementation Plan: <change-name>

### Phase 1: <phase name>
- [ ] Task 1: <clear description> — _Done when: <verifiable condition>_
- [ ] Task 2: <clear description> — _Done when: <verifiable condition>_

### Phase 2: <phase name>
- [ ] Task 3: <clear description> — _Done when: <verifiable condition>_
```

**Rules**:
- Each task completable in one session (max ~2 hours)
- Tasks ordered by dependency (prerequisites first)
- Every task has a clear done condition
- Check off tasks as complete: `- [x]`

---

### `tech-spec.md` — Technical Specification

**Owner**: es-developer agent  
**Purpose**: How the feature is technically designed and where the code lives. The primary navigation aid for developers.

**Required sections**:
1. **Technical Overview** — High-level technical approach (what, not how)
2. **Component Breakdown** — Each technical component with its responsibility
3. **API Changes** — New or modified API endpoints (no code — just descriptions and routes)
4. **State Management** — Any frontend state changes
5. **Data Access Patterns** — How data is accessed (client-side vs server-side and why)
6. **Code Reference Map** — Table mapping functions/components to source files

**Code Reference Map Format**:
```markdown
## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `authenticateUser` | function | Validates user credentials | `<backend-src>/api/v1/auth.py` |
| `LoginForm` | component | User login UI | `<frontend-src>/components/auth/LoginForm.tsx` |
| `useAuthStore` | hook | Global auth state management | `<frontend-src>/stores/authStore.ts` |
```

Use actual paths from your workspace (relative from root), informed by `easyspec-config.yaml` `source` settings.

**Code reference rules**:
- Every function, class, component, or hook mentioned in the spec MUST appear in the Code Reference Map
- Paths are relative from workspace root
- Update the map whenever: new code is added, files are moved/renamed, functions are removed
- This map is the developer's primary navigation tool — keep it accurate and current

**Must NOT contain**: Code snippets, SQL, implementation-level details that belong in source code comments.

---

### `test-plan.md` — Test Plan

**Owner**: es-tester agent  
**Purpose**: Coverage areas, scenarios, and acceptance criteria for testing this change.

**Required sections**:
1. **Test Strategy** — Overall approach (unit, integration, E2E, manual)
2. **Coverage Areas** — What needs to be tested and why it's critical
3. **Critical Scenarios** — Key test scenarios with WHEN/THEN format (no code)
4. **Edge Cases & Risks** — What could go wrong, risk areas
5. **Acceptance Criteria Checklist** — Maps to PRD acceptance criteria
6. **Test File References** — Links to test implementation files (paths from `easyspec-config.yaml` `source.tests`)

**CRITICAL for Database Changes** (`has_db_changes: true`):

When creating test plans for changes that modify database schema:

1. **Backend Integration Tests MUST verify schema changes took effect**:
   - Test NOT just service logic, but actual database constraints
   - Include negative tests: try violating the constraint that should be removed
   - Query `information_schema` to verify column properties (nullable, type, constraints)
   - Example: If migration makes `group_id` nullable, test inserting NULL and verify it succeeds

2. **E2E Tests MUST include at least ONE real backend test**:
   - Default E2E tests can use `page.route()` mocks for speed
   - BUT: Create ONE test variant that hits the real backend (no mocks)
   - Label it: `test.describe('Real Backend Integration - <feature>')`
   - This catches migration issues that mocked tests miss
   - Example: Submit actual POST request to real API, verify 201 response with real DB insert

3. **Pre-Test Checklist for Database Changes**:
   - Verify migration was applied: `alembic current` shows new migration ID
   - If not applied: `alembic upgrade head` before running tests
   - Backend test fixture must apply migrations: `alembic upgrade head` in setup
   - Test database should match production schema

**Why this matters**: Tests can pass with mocked backends while the real database migration was never applied. This causes production failures that tests didn't catch. Always test against real database for schema changes.

**Must NOT contain**: Test code, pseudo-code, step-by-step scripts (those belong in test files).

---

### `deployment.md` — Deployment Notes

**Owner**: es-developer agent  
**Purpose**: What needs to change in deployment when this change ships.

**Required sections**:
1. **Environment Variables** — New or changed env vars
2. **Infrastructure Changes** — New services, scaling changes
3. **Migration Steps** — Ordered steps needed during deployment
4. **Rollback Procedure** — How to roll back if deployment fails
5. **Master Deployment Update Instructions** — What to update in `<docs-folder>/master/deployment/`

---

### `operations.md` — Operations Notes

**Owner**: es-developer agent  
**Purpose**: What operations teams need to know about monitoring and operating this change.

**Required sections**:
1. **Monitoring** — New metrics, alerts, dashboards needed
2. **Logging** — What is logged and where to find it
3. **Common Issues** — Known failure modes and how to resolve
3. **Master Operations Update Instructions** — What to update in `<docs-folder>/master/operations/`

---

## Master Doc Update Conventions

When updating master docs after a change is implemented:

After updating an area, evaluate it against **Master Doc Modularization**. If a touched file is over the soft limit and covers multiple modules, split it as part of this update and record the split in the change summary. Otherwise leave the structure alone — do not reorganize docs that are still healthy.

### `<docs-folder>/master/product/`
- `product-vision.md` — Update if strategic direction changed
- `features/` — Update or create feature-level spec file
- Keep feature specs concise, business-language, no implementation details

### `<docs-folder>/master/ux/`
- Keep `<docs-folder>/master/ux/prototype/index.html` as the hub that mocks the FULL product and links to every module page
- Update the specific module page touched by the change; update the hub only for landing/navigation changes
- Start with a single `prototype/index.html`; split into `prototype/modules/<module>.html` when the modularization criteria are met
- Every page must remain openable directly in a browser from disk (no server, no fetch)

### `<docs-folder>/master/architecture/`
- `system-overview.md` — Update if overall system architecture changed; this is the hub
- `modules/` — Update module-level diagrams only if needed
- Keep diagrams to max 15 nodes, Mermaid only
- Split subsystem detail into `modules/<module>/architecture.md` when the criteria are met; keep the system diagram in the hub

### `<docs-folder>/master/data-model/`
- `overview.md` — Update entity-relationship diagram to reflect new entities/relations (Mermaid `erDiagram`); this is the hub
- `modules/<module>/entities.md` — Update module entity list (names only, no schema code)
- Show business entities and relationships only — no storage implementation details
- Split domains into `modules/<domain>/entities.md` when the criteria are met; keep the cross-domain map in the hub

### `<docs-folder>/master/technology/`
- `README.md` — Overall tech spec index; this is the hub
- `modules/<module>/tech-spec.md` — Module-level tech spec with code reference map
- Update the Code Reference Map table whenever code locations change
- This is the **developer's navigation aid** — accuracy is critical
- Split a Code Reference Map over 250 rows by module; one table must never span unrelated modules

### `<docs-folder>/master/qa/`
- `testing-strategy.md` — Update if overall strategy changed; this is the hub
- `test-plans/<module>-test-plan.md` — Update module-level test plan
- Reference actual test files using paths from `easyspec-config.yaml` `source.tests`
- Split demo cases by feature group when `demo-cases.md` outgrows the threshold

### `<docs-folder>/master/deployment/`
- Update relevant deployment instruction files
- Keep deployment steps ordered and verifiable

### `<docs-folder>/master/operations/`
- Update monitoring, alerting, and runbook files
- Keep runbooks actionable and concise

### `<docs-folder>/master/reference/`
- Add new reference docs when they provide context not available elsewhere
- Good candidates: external API docs summaries, domain concept explanations, glossary entries

---

## Agent Delegation Map

| Document | Primary Agent | Reviewer |
|----------|---------------|---------|
| `prd.md` | es-product-owner | es-document-reviewer |
| `spec-change.md` | es-product-owner | es-document-reviewer |
| `prototype/index.html` | es-ux-specialist | es-document-reviewer |
| `architecture.md` | es-architect | es-document-reviewer |
| `data-model.md` | es-database-designer | es-document-reviewer |
| `implementation-plan.md` | es-developer | — |
| `tech-spec.md` | es-developer | — |
| `test-plan.md` | es-tester | — |
| `deployment.md` | es-developer | — |
| `operations.md` | es-developer | — |

> The agent team (es-product-owner, es-ux-specialist, es-architect, es-database-designer, es-developer, es-tester, es-document-reviewer) is a generic software engineering team. Project-specific tools and conventions are defined in `easyspec-config.yaml`, not in these skills or agent definitions.

---

## Workflow States

```
propose → in-progress
  (all change docs created by agents)

apply → implemented
  (code changes complete, tests passing)

update-master → master-updated
  (all master docs updated from change docs)

archive → archived
  (change moved to openspec/changes/archive/)
```
