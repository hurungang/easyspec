# Specification Delta: Add NPM Publish Workflow

## Affected Spec Areas

- `docs/master/deployment/` — New automated release pipeline
- `README.md` — Installation and release process documentation
- `.github/workflows/` — New workflow file added (no existing workflows to modify)

This change introduces a new deployment capability where none currently exists in the repository. No existing spec files are modified — this is a net-new addition.

## New Capabilities

1. **Automated NPM Release Pipeline**: Pushing a version tag (`v*`) to the repository automatically triggers a GitHub Actions workflow that tests the package and publishes it to npm with provenance attestation. No manual GitHub Release creation is needed.

2. **Trusted Publishing with Provenance**: The workflow uses npm's OIDC-based trusted publishing with OIDC token exchange — no long-lived npm access tokens are stored. Every published package carries a cryptographic provenance attestation that links it back to the exact commit, repository, and workflow run.

3. **Prerelease Channel Support**: Beta and alpha prereleases are supported via dist-tags. Pushing a tag like `v0.2.0-beta.1` publishes to the `beta` dist-tag, while `v0.1.0` publishes to `latest`. A manual workflow trigger allows maintainers to select the dist-tag explicitly.

4. **Version Conflict Prevention**: Before publishing, the workflow checks whether the version from `package.json` already exists on npm. If it does, the workflow fails immediately with a clear error — preventing accidental overwrites or duplicate publish attempts.

5. **Release Approval Gate**: The publish step runs in a protected environment with reviewer protection rules, providing an optional approval step before packages are published. This allows teams to require reviewer sign-off on releases.

6. **Clear Installation Instructions**: The README explicitly documents the two primary ways to use `easyspec-prompts`: global install (`npm install -g easyspec-prompts`) and zero-install via npx (`npx easyspec-prompts init`).

## Modified Capabilities

### Release Process (current vs. new)

**Before**: The README "Release" section describes a manual process:
1. Bump `package.json` version
2. Create and push a tag
3. Publish a GitHub Release
4. GitHub Actions publishes to npm

The workflow YAML for step 4 does not actually exist in the repository.

**After**: The README "Release" section describes an automated process:
1. Bump `package.json` version
2. Create and push a tag (e.g., `v0.2.0`)
3. The automated workflow tests and publishes to npm with provenance

The GitHub Release step is removed — tag push is the sole trigger. A manual trigger override is available for cases where the maintainer wants to override the dist-tag.

### README Install Section

**Before**: The "Install" section shows `npm install -g easyspec-prompts` and `npx easyspec-prompts init --scope project` with brief context.

**After**: The "Install" section retains and clarifies both commands with explicit context:
- `npm install -g easyspec-prompts` for permanent global installation
- `npx easyspec-prompts init --scope project` for trying without installing

No content is removed; the section is polished for clarity.

## Removed Capabilities

None. This change adds automation; it does not remove any existing capability. The manual release process steps are superseded but remain available as a fallback if the workflow is ever disabled.

## Spec Update Instructions

- **`README.md`**: Update the "Release" section to document the tag-push trigger (remove GitHub Release step). Polish the "Install" section for clarity on the two usage modes.
- **`docs/master/deployment/`**: Create or update the deployment specification to document:
  - The `easyspec-npm-release.yml` workflow as the automated release mechanism
  - Tag naming convention (`v<semver>` for stable, `v<semver>-<prerelease>.<n>` for prereleases)
  - The protected environment as the release approval gate
  - npm trusted publishing configuration (OIDC, not secrets)
  - Verifying provenance via `npm provenance` command post-publication
- **No changes needed** to: `docs/master/product/`, `docs/master/ux/`, `docs/master/architecture/`, `docs/master/data-model/`, `docs/master/technology/`, `docs/master/qa/`, `docs/master/operations/`
