# Deployment Notes: Automated NPM Publish Workflow

## Environment Variables

**No new environment variables are required.**

The workflow uses npm trusted publishing via OIDC, which authenticates through GitHub's built-in OIDC provider (`id-token: write` permission). The trust relationship is configured in the npm package settings (linking the GitHub repository to the npm package), not through repository secrets or environment variables.

**Removed**: The `NPM_TOKEN` repository secret used by the old `release.yml` workflow can be removed from repository secrets after the new workflow is verified working.

## Infrastructure Changes

### Added

| Resource | Type | Location | Purpose |
|----------|------|----------|---------|
| `easyspec-npm-release` | GitHub Actions workflow | `.github/workflows/easyspec-npm-release.yml` | Automated npm publish pipeline with OIDC auth, provenance, dist-tag routing, and version conflict detection |

### Removed

| Resource | Type | Location | Purpose |
|----------|------|----------|---------|
| `release` | GitHub Actions workflow | `.github/workflows/release.yml` (deleted) | Old pipeline triggered by GitHub Release events with `NPM_TOKEN` secret |

### External Dependencies (prerequisites)

These must be configured **before** the new workflow will function:

| Dependency | Where | What to Configure |
|-----------|-------|-------------------|
| npm Trusted Publishing | npmjs.com → package `easyspec-prompts` → Settings → Trusted Publishing | Add linked repository as a trusted publisher: owner `easyspec-org`, repository `easyspec`, workflow `.github/workflows/easyspec-npm-release.yml` |
| Protected GitHub Environment | GitHub repo → Settings → Environments → `npm-release` | Create the `npm-release` environment, add at least one required reviewer, and optionally restrict to the default branch |

## Migration Steps

Execute in this order:

### Step 1: Configure npm OIDC Trust (Out-of-band)

- Go to the npm package settings for `easyspec-prompts`
- Under "Trusted Publishing", add the GitHub repository (`easyspec-org/easyspec`) with the workflow path `.github/workflows/easyspec-npm-release.yml`
- This establishes the OIDC trust — only the specified workflow from the specified repo can publish this package

### Step 2: Configure GitHub Environment (Out-of-band)

- Go to the GitHub repository settings → Environments
- Create a new environment named `npm-release`
- Add required reviewers (at minimum one maintainer)
- Optionally restrict deployment to the default branch only (`main` or `master`)
- This establishes the approval gate — publishes require a reviewer to sign off

### Step 3: Deploy the New Workflow File

- Create `.github/workflows/easyspec-npm-release.yml` containing the new workflow definition
- Merge to the default branch (`main`)
- The workflow will now be registered in GitHub Actions but only triggers on tag pushes or manual dispatch

### Step 4: Verify Existing Tests Pass

- Run `npm test` locally and confirm all tests pass
- Optionally, push a branch and observe CI passing on GitHub

### Step 5: Delete the Old Workflow

- Delete `.github/workflows/release.yml` from the default branch
- Verify the old workflow no longer appears in the GitHub Actions tab
- The GitHub Release event trigger is now fully removed

### Step 6: Update the README

- Update the Release section to document the new tag-push process (bump → tag → auto publish)
- Remove `NPM_TOKEN` references
- Update the Install section with polished instructions
- Merge to the default branch

### Step 7: Smoke Test with a Beta Tag

- Bump `package.json` to a beta version (e.g., `0.x.y-beta.1`)
- Commit and push the tag: `git tag v0.x.y-beta.1 && git push origin v0.x.y-beta.1`
- Observe the workflow run in GitHub Actions:
  - ✅ Triggers on tag push
  - ✅ Approval gate requests reviewer sign-off
  - ✅ Version conflict check passes (version is new)
  - ✅ Tests pass
  - ✅ Publishes to `beta` dist-tag
  - ✅ Provenance attestation visible on npm

### Step 8: Smokeless Test with Stable Tag (if beta succeeds)

- Bump `package.json` to a stable version
- Push the tag and repeat verification
- Confirm publish lands on `latest` dist-tag

### Step 9: Clean Up Repository Secrets

- Once the new workflow is verified working for both beta and stable publishes, remove the `NPM_TOKEN` secret from the repository settings
- This eliminates the long-lived credential that the old workflow used

## Rollback Procedure

If the new workflow fails and a critical release is needed immediately:

### Option A: Manual Publish (Fastest)

1. Run `npm publish --access public --provenance` manually from a maintainer's local machine (requires npm login)
2. This bypasses both workflows entirely — the package is published directly
3. Investigate the workflow failure after the release is published

### Option B: Restore Old Workflow (If Manual Publish is Not Viable)

1. Restore `.github/workflows/release.yml` from git history:
   ```bash
   git checkout <commit-before-deletion> -- .github/workflows/release.yml
   ```
2. Ensure `NPM_TOKEN` secret still exists in repository settings (re-add if already removed)
3. Push to default branch
4. Create a GitHub Release — the old workflow triggers and publishes via `NPM_TOKEN`
5. Investigate the new workflow failure; fix before re-deploying the new workflow

### Rollback Risks

- If `NPM_TOKEN` was already deleted, it must be regenerated on npm and re-added as a repository secret
- The old workflow triggers on GitHub Release events — the publish process reverts to the manual step of creating a GitHub Release
- Version conflict detection does not exist in the old workflow — maintainers must manually verify the version is not already published

## Master Deployment Update Instructions

When this change moves to `update-master`, update the following:

### Create: `docs/master/deployment/`

This directory does not yet exist. Create it with:

1. **`docs/master/deployment/release-pipeline.md`** — Master deployment documentation for the release pipeline, derived from:
   - This `deployment.md` (infrastructure changes, environment configuration, migration steps)
   - Include the npm OIDC trust setup as a permanent prerequisite
   - Include the protected `npm-release` environment configuration as a permanent prerequisite
   - Include the tag naming convention (`v<semver>`, `v<semver>-<prerelease>.<n>`)

2. **`docs/master/deployment/README.md`** — Index for the deployment docs directory, listing `release-pipeline.md` as the entry for the release pipeline
