## Technical Overview

Replace the existing `release.yml` workflow (triggered by GitHub Release events, authenticating to npm via long-lived `NPM_TOKEN` secret) with an `easyspec-npm-release.yml` workflow triggered by version tag pushes (`v*`), authenticating via npm OIDC trusted publishing (`id-token: write`), and publishing with cryptographically verifiable provenance attestation (`--provenance`). The new workflow adds version conflict detection, prerelease dist-tag routing (`beta`), and a protected `npm-release` GitHub Environment as an approval gate. The README is updated to document the simplified tag-push release process and clarify the two installation modes (global install vs. npx).

No build step is required — the project distributes source directly per `package.json` `files` field. The workflow runs on `ubuntu-latest` (required for npm trusted publishing) with Node.js 20.

## Component Breakdown

### 1. `easyspec-npm-release` Workflow (`.github/workflows/easyspec-npm-release.yml`)

**Responsibility**: Automated npm publishing pipeline that replaces manual GitHub Release-based publishing.

**Pipeline stages**:

| Stage | Purpose | Key Detail |
|-------|---------|------------|
| Trigger | Tag push (`v*`) or manual dispatch | Replaces `release: [published]` |
| Concurrency gate | Prevent race conditions | `cancel-in-progress: false`, scoped to git ref |
| Auth | OIDC trusted publishing | `permissions: id-token: write` — no `NPM_TOKEN` |
| Environment gate | Optional approval step | `environment: npm-release` |
| Setup | Checkout, Node.js 20, npm install | `actions/checkout@v4`, `actions/setup-node@v4` |
| Metadata validation | Tag matches `package.json` version | Strips `v` prefix, compares |
| Version conflict | Check npm registry for existing version | `npm view easyspec-prompts@<ver>` |
| Test | Run `npm test` | Hard gate — must pass to publish |
| Publish | `npm publish --access public --provenance` | With dist-tag routing |

**Dist-tag routing logic**:
- **Automatic (tag push)**: Version matching `*-beta.*` → `--tag beta`; all others → `latest` (default)
- **Manual (`workflow_dispatch`)**: User-selected dist-tag from `latest`, `beta`, `alpha`

### 2. Old Workflow Removal (`.github/workflows/release.yml`)

**Responsibility**: Removed. The existing workflow uses `release: [published]` trigger and `NPM_TOKEN` secret — both replaced by the new workflow. No migration of logic is needed; the new workflow is a clean replacement.

**Affected references**: No other files reference `release.yml`. Removal is a simple file deletion.

### 3. README Release Section (`README.md`)

**Responsibility**: Documents the release process for maintainers.

**Changes**:
- Replace 4-step manual process (bump → tag → GitHub Release → publish) with 3-step automated process (bump → tag → auto publish)
- Remove `NPM_TOKEN` secret reference
- Document tag naming convention: `v<semver>` for stable, `v<semver>-beta.<n>` for prereleases
- Optionally document `workflow_dispatch` as a manual override

### 4. README Install Section (`README.md`)

**Responsibility**: Documents installation for end users.

**Changes**: Polish existing content — no new commands, just clarity improvements:
- Label global install as the recommended permanent method
- Label npx as the no-install / try-before-buy alternative
- Ensure both commands show the necessary flags

## API Changes

n/a — This change introduces no API endpoints. The workflow interacts with npm's publish API via the `npm` CLI (`npm publish`), but this is handled entirely by the workflow runtime and no custom API code is authored.

## State Management

n/a — No frontend state management is involved in this change. The workflow is a stateless CI/CD pipeline.

## Data Access Patterns

n/a — No data access patterns are involved. The workflow reads `package.json` for version metadata and queries the npm registry for version conflict detection, but no application database or storage is accessed.

## Code Reference Map

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `easyspec-npm-release` | workflow | Automated npm publish pipeline with OIDC, provenance, dist-tag routing, and version conflict detection | `.github/workflows/easyspec-npm-release.yml` |
| Release section | documentation | Updated release process documenting tag-push trigger and automated publish | `README.md` |
| Install section | documentation | Polished installation instructions for global install and npx modes | `README.md` |

### Removed

| Symbol | Type | Description | File |
|--------|------|-------------|------|
| `release` | workflow | Old release pipeline triggered by GitHub Release events with `NPM_TOKEN` secret | `.github/workflows/release.yml` |
