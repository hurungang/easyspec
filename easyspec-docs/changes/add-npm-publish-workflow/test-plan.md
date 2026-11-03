# Test Plan: Automated NPM Publish Workflow

## Test Strategy

This change replaces the existing `release.yml` workflow (triggered by GitHub Release events, authenticating via `NPM_TOKEN` secret) with a new `easyspec-npm-release.yml` workflow (triggered by tag pushes, authenticating via npm OIDC trusted publishing). It also updates the README release documentation.

**Testing approach**:

- **Existing CLI tests** — The workflow gates publishing on `npm test`, so existing tests in `tests/` must continue passing. Re-run the full test suite to confirm the baseline.
- **Workflow YAML validation** — The workflow file is declarative YAML. Validation focuses on structural correctness (syntax, trigger patterns, environment references, permission scopes). GitHub Actions itself validates and executes it; there is no programmatic workflow runner to unit-test.
- **Manual CI/CD verification** — The critical runtime behavior (tag trigger, OIDC auth, version conflict detection, dist-tag routing, provenance attestation) can only be validated post-deployment by pushing a test tag and observing the workflow run in GitHub Actions.
- **README documentation review** — Verify the Release section correctly describes the new tag-push process, removes `NPM_TOKEN` references, and the Install section clearly presents both installation modes.

**Test layers involved**: CLI unit/integration tests (`node:test` in `tests/`), manual workflow validation, documentation review.

## Coverage Areas

| Area | Why It's Critical | How Covered |
|------|------------------|-------------|
| **CLI test baseline** | The workflow runs `npm test` as a hard gate — all existing tests must pass for any publish to succeed | Re-run existing test suite |
| **Workflow trigger — tag push** | The automated publish path depends on tag matching (`v*`) | Manual tag push validation |
| **Workflow trigger — manual dispatch** | Maintainers need an alternative trigger for edge cases, including dist-tag override | Manual workflow_dispatch validation |
| **OIDC authentication** | Replaces the `NPM_TOKEN` secret; misconfiguration means publish fails with no fallback | Manual validation against npm trusted publishing |
| **Version conflict detection** | Prevents accidental re-publication of existing versions (idempotency guarantee) | Manual tag reuse validation |
| **Dist-tag routing — stable** | `v0.2.0` must publish to `latest` (the npm default) | Manual stable tag validation |
| **Dist-tag routing — prerelease** | `v0.2.0-beta.1` must publish to `beta` dist-tag, NOT `latest` | Manual prerelease tag validation |
| **Provenance attestation** | Supply chain integrity — every package must carry verifiable provenance | Manual attestation verification on npm |
| **Approval gate** | The `npm-release` environment requires reviewer sign-off before publish proceeds | Manual environment gate validation |
| **README Install section** | End users discover installation commands from the README | Documentation review |
| **README Release section** | Maintainers discover the release process from the README | Documentation review |
| **Old workflow removal** | Two publish workflows must not coexist — running both could cause conflicts | Verify `release.yml` is deleted |

## Critical Scenarios

### SC-1: Stable version tag publishes to latest

- **WHEN** a maintainer pushes a stable version tag (e.g., `v0.2.0`) matching `package.json` version
- **THEN** the workflow triggers automatically, tests pass, the version does not already exist on npm, the approval gate is satisfied, and the package is published to the `latest` dist-tag with provenance attestation

### SC-2: Prerelease version tag publishes to beta

- **WHEN** a maintainer pushes a prerelease version tag (e.g., `v0.2.0-beta.1`) matching `package.json` version
- **THEN** the workflow triggers automatically, tests pass, the version does not already exist on npm, the approval gate is satisfied, and the package is published to the `beta` dist-tag with provenance attestation

### SC-3: Version conflict blocks re-publication

- **WHEN** a maintainer pushes a tag for a version that already exists on the npm registry
- **THEN** the workflow fails at the version conflict check stage with a clear message indicating the version already exists, and no publish occurs

### SC-4: Manual dispatch with dist-tag override

- **WHEN** a maintainer manually triggers the workflow via `workflow_dispatch` and selects a dist-tag (e.g., `alpha`)
- **THEN** the workflow runs with the selected dist-tag, regardless of the version string in `package.json`, and publishes to that dist-tag with provenance attestation

### SC-5: Tag/package.json version mismatch

- **WHEN** a maintainer pushes a version tag (e.g., `v0.3.0`) that does not match the version in `package.json`
- **THEN** the workflow fails at the metadata validation stage with a clear message before any publish attempt

### SC-6: Tests fail blocks publish

- **WHEN** `npm test` exits with a non-zero status during a publish workflow run
- **THEN** the workflow fails at the test stage with the test failure details, and no publish occurs

### SC-7: Old workflow no longer triggers

- **WHEN** a GitHub Release is published after the new workflow is deployed and the old `release.yml` is removed
- **THEN** no workflow triggers from the release event — the old pipeline is gone

### SC-8: Provenance attestation is verifiable

- **WHEN** a package is published via the new workflow
- **THEN** the npm registry displays a "Provenance" badge for that version, linked to the exact GitHub Actions workflow run and commit

### SC-9: Readme documents correct release process

- **WHEN** a maintainer reads the README Release section
- **THEN** they see a 3-step process (bump → tag → auto publish) with tag naming conventions; they see no reference to `NPM_TOKEN` or GitHub Release creation

### SC-10: Readme shows both install modes

- **WHEN** an end user reads the README Install section
- **THEN** they see `npm install -g easyspec-prompts` clearly as the recommended method and `npx easyspec-prompts init --scope project` as the no-install alternative

## Edge Cases & Risks

| Edge Case / Risk | Impact | Mitigation |
|-----------------|--------|------------|
| **Tag pushed to wrong branch** — Tag exists on a branch that hasn't passed CI | Package published from untested code | The workflow runs `npm test` as a hard gate before publish; branch protection rules on the default branch can also prevent direct pushes to main |
| **OIDC trust not configured in npm** — npm package settings don't have the GitHub repo/OIDC provider configured | All publishes fail with auth errors; workflow broken until config is updated | Document OIDC configuration as a prerequisite in deployment notes; workflow will fail with a clear npm auth error |
| **Approval gate environment not configured** — The `npm-release` environment doesn't exist in repository settings | Workflow either skips the gate (if not required) or fails on environment reference | Document environment setup as a prerequisite in deployment notes |
| **Concurrent tag pushes** — Two tags pushed simultaneously | Race condition: two runs publishing the same or conflicting versions | Concurrency gate (`cancel-in-progress: false`, scoped to git ref) prevents overlapping runs for the same ref |
| **Tag format ambiguity** — A tag like `v0.2.0-rc.1` (not strictly `-beta.*`) | Could be routed to `latest` instead of a prerelease dist-tag by auto-detection | Tech-spec defines: `*-beta.*` → `beta`; all others → `latest`. Non-beta prereleases must use `workflow_dispatch` for correct routing |
| **npm registry unavailable** — `npm view` or `npm publish` fails due to registry outage | Workflow fails; maintainer must re-trigger when registry is available | Workflow is idempotent — re-triggering after outage resolves works correctly (version check prevents duplicate publish) |
| **Package scope vs. OIDC mismatch** — OIDC trust is misconfigured to a different npm scope or package | Publish fails with permission error | The package name is hardcoded as `easyspec-prompts`; mismatch would be a one-time setup error caught on first publish attempt |
| **Branch-tag mismatch** — Tag is pushed that only exists on a diverged branch | CI context may not match the tagged commit's intent | Tags are git refs pointing to specific commits — the workflow checks out the tagged commit directly, so the branch is irrelevant to the workflow content |

## Acceptance Criteria Checklist

Maps to PRD acceptance criteria (Section "Acceptance Criteria").

### Workflow

- [ ] `.github/workflows/easyspec-npm-release.yml` exists in the repository
- [ ] Workflow triggers on version tags matching pattern `v*`
- [ ] Workflow supports manual triggering (`workflow_dispatch`) with dist-tag selection (`latest`, `beta`, `alpha`)
- [ ] Workflow uses npm trusted publishing (`permissions: id-token: write`) — no `NPM_TOKEN` secret
- [ ] Every published package carries cryptographic provenance attestation (linked to repo, commit, and workflow run)
- [ ] Version conflict detection runs before publish — if version already exists on npm, workflow fails with clear message
- [ ] Prerelease tag push (e.g., `v0.2.0-beta.1`) publishes to `beta` dist-tag
- [ ] Stable tag push (e.g., `v0.2.0`) publishes to `latest` dist-tag
- [ ] Protected approval gate (`environment: npm-release`) requires reviewer sign-off before publish
- [ ] `npm test` passes before publish can proceed (hard gate)

### README

- [ ] Install section shows `npm install -g easyspec-prompts` as the primary install command
- [ ] Install section shows `npx easyspec-prompts init --scope project` as the no-install alternative
- [ ] Release section references the new automated tag-push workflow (not manual GitHub Release steps)
- [ ] Release section does not reference `NPM_TOKEN`

### Cleanup

- [ ] Old `.github/workflows/release.yml` is deleted from the repository
- [ ] No other files reference `release.yml` or `NPM_TOKEN`

## Test File References

| Test File | Purpose |
|-----------|---------|
| `tests/template.test.js` | Existing CLI template and rendering test suite — baseline verification that all tests pass (required gate for any publish) |

**Additional manual validation** is performed via:
- GitHub Actions workflow run log inspection (trigger, auth, publish stages)
- npm registry inspection (package page for provenance badge, version listing, dist-tag assignment)
- README review against the acceptance criteria checklist above
