## Overview

Replace the existing `release.yml` workflow with a production-grade `easyspec-npm-release.yml` workflow triggered by version tag pushes (`v*`), using npm OIDC trusted publishing with provenance attestation, automated dist-tag routing, and version conflict detection. Update the README to document the simplified tag-push release process and clarify installation commands.

## Task Checklist

### Phase 1 — Create the NPM Release Workflow
- [x] 1.1 — Create `.github/workflows/easyspec-npm-release.yml` with tag-based trigger and concurrency group
- [x] 1.2 — Configure OIDC permissions and `npm-release` environment protection
- [x] 1.3 — Add checkout, Node.js setup, and dependency install steps
- [x] 1.4 — Add version conflict detection step (fail if already published)
- [x] 1.5 — Add pre-publish test step (`npm test`)
- [x] 1.6 — Add publish step with dist-tag routing (`latest` vs `beta`) and `--provenance`
- [x] 1.7 — Add `workflow_dispatch` trigger with dist-tag selection input
- [x] 1.8 — Add tag/version metadata validation step

### Phase 2 — Replace Old Workflow and Update README
- [x] 2.1 — Remove obsolete `.github/workflows/release.yml`
- [x] 2.2 — Update README Release section (document tag-push trigger, remove GitHub Release step)
- [x] 2.3 — Polish README Install section for clarity on both usage modes

### Phase 3 — Verify End-to-End
- [x] 3.1 — Validate workflow YAML syntax
- [x] 3.2 — Verify README tag naming convention matches workflow expectations

---

## Phase 1 — Create the NPM Release Workflow

### 1.1 — Create `.github/workflows/easyspec-npm-release.yml` with tag-based trigger and concurrency group

Create the new workflow file that triggers on `push: tags: ["v*"]` — replacing the existing `release: [published]` trigger. Add a concurrency group scoped to the git ref with `cancel-in-progress: false` to prevent race conditions during re-tagging.

**Done when**:
- File `.github/workflows/easyspec-npm-release.yml` exists
- `on.push.tags` contains `"v*"`
- Concurrency group is `easyspec-npm-release-${{ github.ref }}`
- `cancel-in-progress` is `false`
- Workflow name is descriptive (e.g., "Easyspec NPM Release")

### 1.2 — Configure OIDC permissions and `npm-release` environment protection

Set `permissions: contents: read, id-token: write` at the job level — `id-token: write` is required for npm OIDC trusted publishing. Assign the publish step to an `npm-release` environment to provide an optional approval gate for maintainers.

**Done when**:
- Job-level permissions include `contents: read` and `id-token: write`
- Publish step (or the job) references `environment: npm-release`
- No `NPM_TOKEN` secret is referenced anywhere in the workflow

### 1.3 — Add checkout, Node.js setup, and dependency install steps

Add `actions/checkout@v4`, `actions/setup-node@v4` with Node 20 (match project convention), and `npm install`. Use the `registry-url` pointing at npmjs.org.

**Done when**:
- Checkout step uses `actions/checkout@v4`
- Node.js setup uses `actions/setup-node@v4` with `node-version: 20`
- `npm install` runs before any test or publish step
- `registry-url` is `https://registry.npmjs.org`

### 1.4 — Add version conflict detection step (fail if already published)

Extract the version from `package.json` and check `npm view easyspec-prompts@<version>` — fail with a clear message if the version already exists. This prevents accidental duplicate publish attempts.

**Done when**:
- Step reads version from package.json via `node -p`
- Step runs `npm view easyspec-prompts@${VERSION} version` and exits 1 if found
- Error message clearly states which version is already published
- Step runs before the publish step and after dependency install

### 1.5 — Add pre-publish test step (`npm test`)

Run `npm test` before the publish step. The test suite must pass for the workflow to proceed.

**Done when**:
- `npm test` step runs after dependency install and before publish
- Step is a hard gate — workflow fails if tests fail
- No CI-specific test configuration is needed (project's `package.json` already defines `"test": "node --test tests/template.test.js"`)

### 1.6 — Add publish step with dist-tag routing (`latest` vs `beta`) and `--provenance`

Publish with `npm publish --access public --provenance`. Route prerelease versions (matching `*-beta.*`) to the `beta` dist-tag; stable versions go to `latest` (the npm default, no `--tag` needed). The `--provenance` flag generates a cryptographically verifiable provenance attestation.

**Done when**:
- `npm publish --access public --provenance` is used
- Prerelease versions (`*-beta.*`) include `--tag beta`
- Stable versions omit `--tag` (defaulting to `latest`)
- No `NODE_AUTH_TOKEN` env var is set (OIDC handles auth)

### 1.7 — Add `workflow_dispatch` trigger with dist-tag selection input

Add a `workflow_dispatch` trigger alongside the tag push trigger, with a `dist-tag` input that accepts `latest`, `beta`, or `alpha` — defaulting to `latest`. On manual dispatch, the chosen dist-tag overrides the automatic routing logic.

**Done when**:
- `on.workflow_dispatch` is present with `inputs.dist-tag`
- Input has `type: choice` with options `latest`, `beta`, `alpha`
- Default value is `latest`
- Publish step logic routes to the selected dist-tag when triggered by `workflow_dispatch`
- Tag-based trigger logic is unaffected (automatic routing still works)

### 1.8 — Add tag/version metadata validation step

Validate that the tag name (e.g., `v0.2.0`) matches the version in `package.json` minus the `v` prefix. Fail with a descriptive message if they don't match.

**Done when**:
- Step strips `v` prefix from `github.ref_name` and compares to `package.json` version
- Mismatch produces a clear error message showing both values
- Step is a non-blocking warn or a hard fail depending on maintainer preference
- Step runs before publish

---

## Phase 2 — Replace Old Workflow and Update README

### 2.1 — Remove obsolete `.github/workflows/release.yml`

Delete the existing `release.yml` workflow that triggers on `release: [published]` and uses `NPM_TOKEN`. The new `easyspec-npm-release.yml` fully replaces it.

**Done when**:
- File `.github/workflows/release.yml` no longer exists
- No other files reference `release.yml` (grep confirms zero references)

### 2.2 — Update README Release section (document tag-push trigger, remove GitHub Release step)

Rewrite the "Release" section to describe the automated tag-push process:
1. Bump `package.json` version
2. Create and push a version tag (e.g., `git tag v0.2.0 && git push origin v0.2.0`)
3. The workflow automatically tests and publishes to npm

Remove the GitHub Release step and the `NPM_TOKEN` secret reference.

**Done when**:
- Release section shows 3 steps (bump → tag → automated publish)
- No mention of GitHub Release creation
- No mention of `NPM_TOKEN` secret
- Tag naming convention is documented (`v<semver>` for stable, `v<semver>-beta.<n>` for prereleases)
- Optional: mention the `workflow_dispatch` manual trigger for dist-tag overrides

### 2.3 — Polish README Install section for clarity on both usage modes

Retain both installation commands but add brief context so users understand when to use each:
- `npm install -g easyspec-prompts` — permanent global installation, use `easyspec init`
- `npx easyspec-prompts init --scope project` — try without installing, runs once

**Done when**:
- Global install command is clearly labeled as the recommended permanent method
- `npx` command is clearly labeled as the no-install alternative
- Both commands include the necessary flags (`--scope project` for npx)
- No content is removed; only clarity polish is added

---

## Phase 3 — Verify End-to-End

### 3.1 — Validate workflow YAML syntax

Run the workflow YAML through a syntax validator to catch formatting errors before push.

**Done when**:
- Workflow YAML passes `actionlint` or manual GitHub Actions YAML validation
- No indentation errors, missing colons, or invalid keys
- All step references (`actions/checkout@v4`, `actions/setup-node@v4`) resolve correctly

### 3.2 — Verify README tag naming convention matches workflow expectations

Cross-check the README's documented tag format against the workflow's `push: tags: ["v*"]` trigger and the dist-tag routing regex (`*-beta.*`). All examples in the README must match the conventions the workflow expects.

**Done when**:
- Documented tag format (`v<semver>`, `v<semver>-beta.<n>`) matches trigger pattern and routing regex
- No example tags in README contradict the conventions in the workflow
- Prerelease dist-tag routing is clearly documented

---

## Completion Checklist

### Phase 1 — Create the NPM Release Workflow
- [x] 1.1 — `.github/workflows/easyspec-npm-release.yml` exists with tag trigger and concurrency
- [x] 1.2 — OIDC permissions and `npm-release` environment configured
- [x] 1.3 — Checkout, Node.js setup, and npm install steps added
- [x] 1.4 — Version conflict detection step added
- [x] 1.5 — `npm test` step added as pre-publish gate
- [x] 1.6 — Publish step with dist-tag routing and `--provenance` added
- [x] 1.7 — `workflow_dispatch` trigger with dist-tag input added
- [x] 1.8 — Tag/version metadata validation step added

### Phase 2 — Replace Old Workflow and Update README
- [x] 2.1 — `.github/workflows/release.yml` removed
- [x] 2.2 — README Release section updated (tag-push trigger, no GitHub Release)
- [x] 2.3 — README Install section polished for clarity

### Phase 3 — Verify End-to-End
- [x] 3.1 — Workflow YAML syntax validated
- [x] 3.2 — README tag naming convention matches workflow expectations
