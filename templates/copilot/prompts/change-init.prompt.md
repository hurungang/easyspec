---
description: Initialize or update docs/config.yaml by scanning the project structure. Detects source paths, tech stack, and conventions automatically. Run this once per project before using any /change:* tools.
---

Initialize or update `docs/config.yaml` by scanning the project structure and asking targeted questions.

**Input**: No arguments needed. Run as `/change:init`.

---

## Step 1: Check Existing Config

Check if `docs/config.yaml` exists.

- **If it does not exist**: Proceed to Step 2 (create from scratch).
- **If it exists and has placeholder values** (any field contains `<` and `>`): Announce "Config found but not yet initialized — running setup." Proceed to Step 2.
- **If it exists and appears populated**: Announce "Config already initialized. Reviewing for accuracy..." and jump to Step 5 (Verify Accuracy).

---

## Step 2: Scan Project Structure

Explore the workspace root to detect the project layout. Run these checks in parallel:

### Detect project name
- Read `package.json` (name field) if it exists
- Or read `pyproject.toml` (name field) if it exists
- Or use the workspace root folder name as fallback

### Detect frontend source root
Look for these patterns (in order of confidence):
- `src/` with `.tsx` or `.ts` or `.vue` files → `src/`
- `frontend/src/` → `frontend/src/`
- `app/` with component files → `app/`
- `web/src/` → `web/src/`
- If none found, leave as `<not detected>`

### Detect backend source root
Look for these patterns:
- `backend/app/` → `backend/app/`
- `app/` with Python/Go/C# files (not frontend) → `app/`
- `src/` with server entry points → `src/`
- `api/` → `api/`
- If none found, leave as `<not detected>`

### Detect schema/model files
Look for these patterns:
- `prisma/schema.prisma` → `prisma/schema.prisma`
- `supabase/schemas/` directory → `supabase/schemas/`
- `database/models/` → `database/models/`
- `db/models/` → `db/models/`
- `**/models.py` files → path to models directory
- `drizzle.config.ts` → directory referenced in config
- Any `*.sql` schema files in a `schema/` or `database/` folder
- If none found, leave as `<not detected>`

### Detect test directories
Look for these patterns:
- `frontend-test/tests/` → add to list
- `backend/tests/` or `tests/` → add to list
- `src/__tests__/` → add to list
- `e2e/` or `cypress/` or `playwright/` → add to list
- `spec/` → add to list
- Collect all found paths as a list

### Detect tech stack
**Frontend**: Check for these indicators:
- `package.json` dependencies: look for `react`, `vue`, `angular`, `svelte`, `next`, `nuxt`
- `tsconfig.json` → TypeScript confirmed
- Check MUI, TailwindCSS, Bootstrap presence in `package.json`

**Backend**: Check for these indicators:
- `pyproject.toml` or `requirements.txt` → Python; check for `fastapi`, `django`, `flask`
- `package.json` at root with `express`/`nestjs` → Node.js
- `*.csproj` → .NET
- `go.mod` → Go
- `pom.xml` or `build.gradle` → Java/Kotlin

**Database**: Check for:
- `prisma/` → PostgreSQL/MySQL via Prisma
- `supabase/` → PostgreSQL via Supabase
- Any `docker-compose.yml` mentioning postgres/mysql/mongo/redis
- `drizzle.config.ts` → check which DB

**Auth**: Check for:
- `@supabase/supabase-js` in package.json → Supabase Auth
- `passport` in package.json → Passport.js
- `jose` or `jsonwebtoken` → JWT
- `python-jose` in requirements → JWT (Python)
- Auth0, Clerk, NextAuth mentions

**Infra**: Check for:
- `docker-compose.yml` → Docker
- `Dockerfile` → Docker
- `*.tf` files → Terraform
- AWS/Azure/GCP config files or directories

---

## Step 3: Ask Clarifying Questions

Ask the user to confirm detected values and fill in gaps. Batch into a single ask:

> "I've scanned the project and detected the following. Please confirm or correct:
>
> **Project name**: `<detected or unknown>`  
> **Description**: [what does this project do? one sentence]  
>
> **Source paths** (detected — correct if wrong):
> - Frontend: `<detected>`
> - Backend: `<detected>`
> - Schema files: `<detected>`
> - Test directories: `<detected list>`
>
> **Tech stack** (detected — correct if wrong):
> - Frontend: `<detected>`
> - Backend: `<detected>`
> - Database: `<detected>`
> - Auth: `<detected or unknown>`
> - Infra: `<detected>`
>
> **Project conventions** (I'll add defaults — add any specific ones):
> e.g. typing rules, i18n approach, data access patterns, schema migration approach
>
> **Domain knowledge** (optional): Any business rules agents should always know?
> e.g. credit tiers, subscription logic, multi-tenancy rules, access control model"

---

## Step 4: Write config.yaml

Create or overwrite `docs/config.yaml` with the confirmed values:

```yaml
# Change Lifecycle Configuration
# Provides project-specific context for the /change:* workflow tools.
# All agents read this file first before starting any task.
# Run /change:init to update this file when the project evolves.

project:
  name: <confirmed name>
  description: <confirmed description>

# Source code locations — used by agents to resolve code references
source:
  frontend: <confirmed or null>
  backend: <confirmed or null>
  schema: <confirmed or null>
  tests:
    - <test dir 1>
    - <test dir 2>

# Technology stack — context for agents, not prescriptive
tech_stack:
  frontend: <confirmed>
  backend: <confirmed>
  database: <confirmed>
  auth: <confirmed>
  infra: <confirmed>

# Key project conventions — agents follow these when making decisions
conventions:
  - "<convention 1>"
  - "<convention 2>"

# Domain knowledge — business rules agents must always know
domain:
  - "<rule 1>"
  - "<rule 2>"
```

If any field could not be detected or confirmed, leave it as a descriptive placeholder starting with `TODO:` rather than angle-bracket templates (e.g. `TODO: specify auth library`).

---

## Step 5: Verify Accuracy (for existing configs)

When re-running `/change:init` on an already-populated config, perform these checks:

### Source path verification
For each path in `source.*`:
- Check if the path exists in the workspace
- If a path no longer exists, flag it
- Scan for new source directories that aren't listed yet

### Tech stack freshness
- Check `package.json` and `pyproject.toml` (or equivalent) for major dependency changes
- If a new framework appears that isn't reflected in `tech_stack`, flag it

### `TODO:` items
- List any fields still containing `TODO:` — these need human attention

### Output a brief verification report:
```
## Config Verification

**File**: docs/config.yaml
**Status**: ✓ Current / ⚠ Needs update

### Path Checks
- ✓ source.frontend: frontend/src — exists
- ✓ source.backend: backend/app — exists
- ✗ source.schema: supabase/schemas/ — NOT FOUND (directory moved?)

### TODO Items
- ⚠ tech_stack.auth: TODO: specify auth library

### Suggestions
- Consider adding test directory: e2e/tests/ (detected in project)
```

If issues found, offer to re-run the setup interactively.

---

## Step 6: Confirm and Finish

Show the final `docs/config.yaml` content to the user for review.

Announce:
```
## Config Initialized

docs/config.yaml is ready.

All /change:* tools will now read this file for project context.
Run /change:init again anytime the project structure changes.

Next steps:
- Run /change:propose to start a new change
- Run /change:review to audit existing master docs
```

---

## Guardrails
- Never overwrite a fully-populated config without user confirmation
- If detection is ambiguous (e.g. both `src/` and `frontend/src/` have TypeScript), ask the user to choose
- Leave fields as `TODO:` rather than guessing incorrectly — a wrong path is worse than an unset one
- Domain knowledge and conventions MUST come from the user — never fabricate business rules
