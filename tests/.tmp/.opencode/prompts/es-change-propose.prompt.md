---
name: es-change-propose
description: 'es-change-propose command'
---

Create a new change with a complete documentation set by orchestrating the agent team.

**Input**: Optionally specify a change name (e.g., `/es-change-propose add-dark-mode`). If omitted, ask what the user wants to build.

---

## Step 0: Verify Config is Initialized

Check if `docs/config.yaml` exists and is populated (no fields containing `<` and `>` or `TODO:`).

**If `docs/config.yaml` does not exist**:
> "docs/config.yaml is missing. Running `/es-change-init` first to set up project configuration..."
> Execute the `/es-change-init` workflow fully before continuing.

**If `docs/config.yaml` exists but has uninitialized placeholders** (`<` or `>` in any value, or fields starting with `TODO:`):
> "docs/config.yaml has uninitialized fields. Please run `/es-change-init` to complete setup before proposing a change."
> Stop and wait for the user to run `/es-change-init`.

**If `docs/config.yaml` is properly initialized**: Read it and proceed.

---

## Step 1: Determine Change Name

If no change name is provided in the input, ask the user:
> "What change do you want to work on? Describe what you want to build or fix."

From the description, derive a kebab-case name (e.g., "add dark mode toggle" → `add-dark-mode`).

Announce: **"Creating change: `<name>`"**

---

## Step 2: Assess Scope

**Analyze the user's requirements** and determine scope automatically based on what they've described:

- **has_ui_changes**: True if the requirement mentions new screens, changed layouts, user interactions, UI components, forms, or visual changes
- **has_architecture_changes**: True if the requirement mentions new services, components, integrations, APIs, system design, or architectural patterns
- **has_db_changes**: True if the requirement mentions new data entities, tables, relationships, fields, or data model changes
- **has_deployment_changes**: True if the requirement mentions environment variables, infrastructure, deployment steps, configuration, or hosting changes
- **has_operations_changes**: True if the requirement mentions monitoring, alerting, logging, observability, runbooks, or operational concerns

**Only ask clarifying questions if the requirements themselves are ambiguous or incomplete**. Focus questions on understanding WHAT the user wants, not confirming scope.

Examples of when to ask:
- ❌ "Does this involve database changes?" (Don't ask — analyze the requirement)
- ✅ "Should the user skill library support versioning of skill definitions?" (Clarify unclear requirement)
- ✅ "When you say 'improve performance,' which operations are too slow?" (Clarify vague requirement)
- ✅ "Should administrators have different permissions than regular users?" (Clarify missing requirement detail)

**Make your best judgment from the requirements.** If the user says "add a user dashboard," you can infer `has_ui_changes: true` and `has_db_changes: true` (likely needs user data) without asking.

Record the scope flags for use in `.change.yaml`.

---

## Step 3: Create Change Directory

Create the directory `docs/changes/<name>/` and the `.change.yaml` file:

```yaml
name: <name>
created_at: <YYYY-MM-DD>
status: in-progress
scope:
  has_ui_changes: <bool>
  has_architecture_changes: <bool>
  has_db_changes: <bool>
  has_deployment_changes: <bool>
  has_operations_changes: <bool>
agents_complete:
  es-product-owner: false
  es-ux-specialist: <false|skipped>
  es-architect: <false|skipped>
  es-database-designer: <false|skipped>
  es-developer: false
  es-tester: false
```

---

## Step 4: Load Lifecycle Skill and Project Config

Read `.github/skills/es-change-lifecycle/SKILL.md` for full document format requirements.

Read `docs/config.yaml` for project-specific context (source paths, tech stack, conventions) to pass to agents.

---

## Step 5: Delegate to Agents (in order)

### 5a. es-Product Owner Agent → `prd.md` + `spec-change.md`

Delegate to **es-product-owner agent**:
> "Create `docs/changes/<name>/prd.md` following the PRD format in the es-change-lifecycle skill. Then create `docs/changes/<name>/spec-change.md` documenting the delta to the product specification. Context: [summary of the change from user input]. Read `docs/config.yaml` for project context."

After creation, delegate to **es-document-reviewer agent** to review both files.

Update `.change.yaml`: `agents_complete.product-owner: true`

### 5b. es-UX Specialist Agent → `prototype/index.html` (if has_ui_changes)

If `has_ui_changes` is true, delegate to **es-ux-specialist agent**:
> "Review `docs/changes/<name>/prd.md` for user flows, then create `docs/changes/<name>/prototype/index.html` — a self-contained HTML prototype demonstrating the key UI flows for this change. Must work in browser without a server."

After creation, delegate to **es-document-reviewer agent** to review.

Update `.change.yaml`: `agents_complete.ux-specialist: true`

### 5c. es-Architect Agent → `architecture.md` (if has_architecture_changes)

If `has_architecture_changes` is true, delegate to **es-architect agent**:
> "Review `docs/changes/<name>/prd.md`. Create `docs/changes/<name>/architecture.md` showing: (1) Changed components with Mermaid diagram, (2) New components, (3) Integration point changes, (4) Data flow changes if relevant, (5) What to update in `docs/master/architecture/`."

After creation, delegate to **es-document-reviewer agent** to review.

Update `.change.yaml`: `agents_complete.architect: true`

### 5d. es-Database Designer Agent → `data-model.md` (if has_db_changes)

If `has_db_changes` is true, delegate to **es-database-designer agent**:
> "Review `docs/changes/<name>/prd.md`. Create `docs/changes/<name>/data-model.md` showing: (1) New entities with Mermaid erDiagram, (2) Modified entities, (3) Removed entities/fields, (4) Which schema files need updating (refer to `docs/config.yaml` `source.schema`), (5) What to update in `docs/master/data-model/`. Data model must be technology-agnostic — show business entities and relationships only, no schema code."

After creation, delegate to **es-document-reviewer agent** to review.

Update `.change.yaml`: `agents_complete.database-designer: true`

### 5e. es-Developer Agent → `implementation-plan.md` + `tech-spec.md`

Delegate to **es-developer agent**:
> "Review all completed change docs in `docs/changes/<name>/`. Read `docs/config.yaml` for project source paths and conventions. Create:
> 1. `docs/changes/<name>/implementation-plan.md` — ordered task list with clear done conditions, grouped in phases.
>    **Required format rules**:
>    - Start with an `## Overview` section (2-3 sentences).
>    - Follow with a `## Task Checklist` section listing every task as `- [ ] <phase>.<num> — <task title>`, grouped under `### Phase N — <name>` sub-headings. All items must use `- [ ]` (never `- [x]` — tasks are only checked during implementation, not planning).
>    - Follow with detailed `## Phase N` sections containing the full task descriptions and **Done when** conditions.
>    - End with a `## Completion Checklist` section using `- [ ]` items (never pre-check anything — implementation hasn't happened yet).
>    - Task numbers must be sequential within each phase with no gaps (1.1, 1.2, 1.3 — not 1.1, 1.3).
> 2. `docs/changes/<name>/tech-spec.md` — technical specification with Component Breakdown, API Changes, Data Access Patterns, and a complete Code Reference Map table.
>
> Load `.github/skills/es-change-lifecycle/SKILL.md` for format requirements."

Update `.change.yaml`: `agents_complete.developer: true`

### 5f. es-Tester Agent → `test-plan.md`

Delegate to **es-tester agent**:
> "Review `docs/changes/<name>/prd.md` and `docs/changes/<name>/tech-spec.md`. Create `docs/changes/<name>/test-plan.md` with: Test Strategy, Coverage Areas, Critical Scenarios (WHEN/THEN format), Edge Cases, Acceptance Criteria Checklist, and Test File References (use test paths from `docs/config.yaml` `source.tests`). No test code."

Update `.change.yaml`: `agents_complete.tester: true`

### 5g. Deployment Notes (if has_deployment_changes)

If `has_deployment_changes` is true, delegate to **es-developer agent**:
> "Create `docs/changes/<name>/deployment.md` documenting: new env vars, infrastructure changes, ordered migration steps, rollback procedure, and what to update in `docs/master/deployment/`."

### 5h. Operations Notes (if has_operations_changes)

If `has_operations_changes` is true, delegate to **es-developer agent**:
> "Create `docs/changes/<name>/operations.md` documenting: new monitoring/alerting, logging details, common failure modes, and what to update in `docs/master/operations/`."

---

## Step 6: Show Completion Summary

```
## Change Proposal Complete

**Change:** <name>
**Location:** docs/changes/<name>/

### Documents Created
- [x] prd.md — Product requirements
- [x] spec-change.md — Spec delta
- [x/skipped] prototype/index.html — UI prototype
- [x/skipped] architecture.md — Architecture changes
- [x/skipped] data-model.md — Data model changes
- [x] implementation-plan.md — Task list
- [x] tech-spec.md — Technical specification
- [x] test-plan.md — Test plan
- [x/skipped] deployment.md — Deployment notes
- [x/skipped] operations.md — Operations notes

### Next Steps
- Review the change docs in openspec/changes/<name>/
- Run `/es-change-apply` to implement the change
```

---

## Guardrails
- Always Load the es-change-lifecycle skill before delegating to agents
- Always run document-reviewer on prd.md, spec-change.md, architecture.md, data-model.md, and prototype
- If an agent produces content with code snippets, send back for revision
- Only ask clarifying questions when requirements are genuinely ambiguous — analyze scope from requirements autonomously
- Keep going until all applicable docs are created
