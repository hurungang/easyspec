---
name: change-lifecycle
description: Core knowledge for managing the full development lifecycle: creating change doc sets, implementing changes with the agent team, and updating master product docs. Load this when working on any change management, proposal, apply, or master-update task.
license: MIT
metadata:
  author: openspec
  version: "2.0"
---

# Change Lifecycle Skill

This skill defines the conventions, document formats, and workflows for the full development lifecycle using the software engineering agent team. It is project-agnostic — all project-specific context (tech stack, source paths, conventions) comes from `docs/config.yaml`.

---

## Step 0: Always Read Project Config First

Before starting any task, read `docs/config.yaml` to understand:
- Project name and description
- Source code locations (frontend, backend, schema files, test directories)
- Technology stack context
- Project-specific conventions and domain knowledge

Use the source paths from `docs/config.yaml` everywhere file paths are referenced in this skill.

---

## Change Directory Structure

Every change lives at `docs/changes/<change-name>/` with the following structure:

```
docs/changes/<change-name>/
├── .change.yaml              # Metadata: dates, status, scope flags
├── prd.md                    # Product requirements (product_owner agent)
├── spec-change.md            # Delta spec: what changes in product spec (product_owner agent)
├── prototype/                # (if has_ui_changes)
│   └── index.html            #   UI prototype (ux_specialist agent)
├── architecture.md           # (if has_architecture_changes) Mermaid diagrams (architect agent)
├── data-model.md             # (if has_db_changes) Entity model (database_designer agent)
├── implementation-plan.md    # Task list with done conditions (developer agent)
├── tech-spec.md              # Technical spec with code reference map (developer agent)
├── test-plan.md              # Test coverage and scenarios (tester agent)
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
  product_owner: false
  ux_specialist: false       # skipped if has_ui_changes is false
  architect: false           # skipped if has_architecture_changes is false
  database_designer: false   # skipped if has_db_changes is false
  developer: false
  tester: false
```

---

## Master Product Docs Structure

Master docs live in `docs/master/` with the following structure:

| Folder | Purpose | Owner Agent |
|--------|---------|-------------|
| `docs/master/product/` | Overall product specification; feature-based product specs | product_owner |
| `docs/master/ux/` | Complete product UI HTML prototype (single mock of whole product) | ux_specialist |
| `docs/master/architecture/` | System architecture Mermaid diagrams; module-level only when needed | architect |
| `docs/master/data-model/` | Overall entity model (tech-agnostic UML/ER); no schema code | database_designer |
| `docs/master/technology/` | Master technical specification with code function reference map | developer |
| `docs/master/qa/` | Feature/module based master test plan set | tester |
| `docs/master/deployment/` | Master deployment instruction | developer |
| `docs/master/operations/` | Master operation instruction | developer |
| `docs/master/reference/` | Reference docs: background context, glossary, API references | any agent |

---

## Document Format Requirements

### Global Rules for ALL Documents

- **NO code snippets or scripts** — documents reference source code, they do not contain it
- **NO schema code in docs** — schema/model files (configured in `docs/config.yaml` `source.schema`) are the source of truth
- **NO verbose prose** — concise, scannable, use bullet points
- **Mermaid only for diagrams** — no ASCII art, no DrawIO screenshots, no image embeds
- **Source code references** — use relative paths from workspace root, e.g. `backend/app/api/v1/auth.py`
- **Strong detail level** — enough for an informed engineer to act; not so much it duplicates source code

---

### `prd.md` — Product Requirements Document

**Owner**: product_owner agent  
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

**Owner**: product_owner agent  
**Purpose**: Documents what changes in the product specification as a delta from current state.

**Required sections**:
1. **Affected Spec Areas** — Which master spec areas this change touches (with links to `openspec/specs/`)
2. **New Capabilities** — New user-facing capabilities being added
3. **Modified Capabilities** — Existing capabilities being changed, with before/after description
4. **Removed Capabilities** — Capabilities being removed (if any)
5. **Spec Update Instructions** — Bullet list of what needs to change in master spec files

---

### `architecture.md` — Architecture Changes

**Owner**: architect agent  
**Purpose**: Documents how the system architecture changes.

**Required sections**:
1. **Changed Components** — Which existing components change and how
2. **New Components** — New components being added (Mermaid `flowchart` or `C4Context`)
3. **Integration Points** — New or changed integration points
4. **Data Flow Changes** — How data flow changes (Mermaid `sequenceDiagram` if helpful)
5. **Master Arch Update Instructions** — What to update in `docs/master/architecture/`

**Rules**: Max 15 nodes per diagram. No implementation details. Component/service level only.

---

### `data-model.md` — Data Model Changes

**Owner**: database_designer agent  
**Purpose**: Documents entity model changes in a technology-agnostic way. Shows business entities and their relationships regardless of the underlying database technology.

**Required sections**:
1. **New Entities** — New business entities and their attributes (Mermaid `erDiagram`)
2. **Modified Entities** — Changes to existing entities (added/removed/renamed fields)
3. **Removed Entities/Fields** — What is being removed and why
4. **Schema File References** — Which schema/model files to update (paths from `docs/config.yaml` `source.schema`)
5. **Master Data Model Update Instructions** — What to update in `docs/master/data-model/`

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

**Owner**: developer agent  
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

**Owner**: developer agent  
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

Use actual paths from your workspace (relative from root), informed by `docs/config.yaml` `source` settings.

**Code reference rules**:
- Every function, class, component, or hook mentioned in the spec MUST appear in the Code Reference Map
- Paths are relative from workspace root
- Update the map whenever: new code is added, files are moved/renamed, functions are removed
- This map is the developer's primary navigation tool — keep it accurate and current

**Must NOT contain**: Code snippets, SQL, implementation-level details that belong in source code comments.

---

### `test-plan.md` — Test Plan

**Owner**: tester agent  
**Purpose**: Coverage areas, scenarios, and acceptance criteria for testing this change.

**Required sections**:
1. **Test Strategy** — Overall approach (unit, integration, E2E, manual)
2. **Coverage Areas** — What needs to be tested and why it's critical
3. **Critical Scenarios** — Key test scenarios with WHEN/THEN format (no code)
4. **Edge Cases & Risks** — What could go wrong, risk areas
5. **Acceptance Criteria Checklist** — Maps to PRD acceptance criteria
6. **Test File References** — Links to test implementation files (paths from `docs/config.yaml` `source.tests`)

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

**Owner**: developer agent  
**Purpose**: What needs to change in deployment when this change ships.

**Required sections**:
1. **Environment Variables** — New or changed env vars
2. **Infrastructure Changes** — New services, scaling changes
3. **Migration Steps** — Ordered steps needed during deployment
4. **Rollback Procedure** — How to roll back if deployment fails
5. **Master Deployment Update Instructions** — What to update in `docs/master/deployment/`

---

### `operations.md` — Operations Notes

**Owner**: developer agent  
**Purpose**: What operations teams need to know about monitoring and operating this change.

**Required sections**:
1. **Monitoring** — New metrics, alerts, dashboards needed
2. **Logging** — What is logged and where to find it
3. **Common Issues** — Known failure modes and how to resolve
3. **Master Operations Update Instructions** — What to update in `docs/master/operations/`

---

## Master Doc Update Conventions

When updating master docs after a change is implemented:

### `docs/master/product/`
- `product-vision.md` — Update if strategic direction changed
- `features/` — Update or create feature-level spec file
- Keep feature specs concise, business-language, no implementation details

### `docs/master/ux/`
- Maintain a **single** `prototype/index.html` that mocks the FULL product
- Update the prototype to reflect new UI flows from the change
- Keep it self-contained (inline CSS/JS), openable without a server

### `docs/master/architecture/`
- `system-overview.md` — Update if overall system architecture changed
- `modules/` — Update module-level diagrams only if needed
- Keep diagrams to max 15 nodes, Mermaid only

### `docs/master/data-model/`
- `overview.md` — Update entity-relationship diagram to reflect new entities/relations (Mermaid `erDiagram`)
- `modules/<module>/entities.md` — Update module entity list (names only, no schema code)
- Show business entities and relationships only — no storage implementation details

### `docs/master/technology/`
- `README.md` — Overall tech spec index
- `modules/<module>/tech-spec.md` — Module-level tech spec with code reference map
- Update the Code Reference Map table whenever code locations change
- This is the **developer's navigation aid** — accuracy is critical

### `docs/master/qa/`
- `testing-strategy.md` — Update if overall strategy changed
- `test-plans/<module>-test-plan.md` — Update module-level test plan
- Reference actual test files using paths from `docs/config.yaml` `source.tests`

### `docs/master/deployment/`
- Update relevant deployment instruction files
- Keep deployment steps ordered and verifiable

### `docs/master/operations/`
- Update monitoring, alerting, and runbook files
- Keep runbooks actionable and concise

### `docs/master/reference/`
- Add new reference docs when they provide context not available elsewhere
- Good candidates: external API docs summaries, domain concept explanations, glossary entries

---

## Agent Delegation Map

| Document | Primary Agent | Reviewer |
|----------|---------------|---------|
| `prd.md` | product_owner | document_reviewer |
| `spec-change.md` | product_owner | document_reviewer |
| `prototype/index.html` | ux_specialist | document_reviewer |
| `architecture.md` | architect | document_reviewer |
| `data-model.md` | database_designer | document_reviewer |
| `implementation-plan.md` | developer | — |
| `tech-spec.md` | developer | — |
| `test-plan.md` | tester | — |
| `deployment.md` | developer | — |
| `operations.md` | developer | — |

> The agent team (product_owner, ux_specialist, architect, database_designer, developer, tester, document_reviewer) is a generic software engineering team. Project-specific tools and conventions are defined in `docs/config.yaml`, not in these skills or agent definitions.

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
