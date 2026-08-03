# Epic PRD: Automated NPM Publish Workflow

## Epic Overview

The `easyspec-prompts` CLI package is published to npm but lacks an automated release pipeline. Currently, the release process relies on manual steps: bump the version, create a tag, publish a GitHub Release, and then GitHub Actions publishes to npm — but the workflow YAML itself does not yet exist in the repository. This epic adds a production-grade GitHub Actions workflow that automates npm publishing with tag-based triggers, provenance attestation, version conflict detection, and beta/alpha prerelease support. It also clarifies the user-facing installation instructions in the README so consumers know exactly how to install and initialize the tool.

## Business Goals

- Eliminate manual npm publish steps by providing a reliable, automated release pipeline
- Ensure every npm package published from this repo carries cryptographically verifiable provenance attestation
- Prevent accidental re-publication of already-published versions (idempotency)
- Support prerelease channels (beta, alpha) for testing before stable releases
- Provide clear, discoverable installation instructions in the README for end users

## Users & Personas

- **Maintainer** — The person responsible for cutting releases. Needs a simple, reliable way to publish a new version by pushing a tag or triggering a workflow. Wants confidence that the right version goes to the right npm dist-tag.
- **End User** — A developer installing `easyspec-prompts` for the first time. Needs a one-line install command and a way to try before committing (`npx easyspec-prompts init`).
- **CI/CD Auditor** — A security-conscious stakeholder who wants to verify that every package on the npm registry came from this repo's official build pipeline via provenance attestation.

## User Stories

1. **As a Maintainer**, I want to publish a new version to npm by pushing a version tag (e.g., `v0.2.0`), so that the release process is automated and consistent.
2. **As a Maintainer**, I want to publish prerelease versions under a `beta` or `alpha` dist-tag, so that I can test changes before promoting them to the `latest` channel.
3. **As a Maintainer**, I want the workflow to fail fast if the version I'm trying to publish already exists on npm, so that I don't waste time or accidentally overwrite a release.
4. **As a CI/CD Auditor**, I want every npm publication to include a provenance attestation linked to the exact commit and workflow run, so that I can verify the integrity of the supply chain.
5. **As an End User**, I want the README to show clear one-line npm install commands (`npm install -g easyspec-prompts` and `npx easyspec-prompts init`), so that I can get started without confusion.

## Acceptance Criteria

### Workflow

- A workflow file `.github/workflows/easyspec-npm-release.yml` exists in the repository
- The workflow triggers on version tags pushed to the repository (matching pattern `v*`)
- The workflow also supports manual triggering with dist-tag selection (`latest`, `beta`, `alpha`)
- The workflow uses npm trusted publishing — no long-lived secrets or tokens are stored in the repository
- Every published package carries a cryptographic provenance attestation linking it to the exact commit, repository, and workflow run
- Before publishing, the workflow verifies the package version is not already on npm; if the version already exists, the workflow fails with a clear message
- On tag push of a prerelease version (e.g., `v0.2.0-beta.1`), the workflow publishes to the `beta` dist-tag
- On tag push of a stable version (e.g., `v0.2.0`), the workflow publishes to the `latest` dist-tag
- A protected approval gate requires reviewer sign-off before packages are published
- All tests in the repository must pass before a package can be published

### README

- The README "Install" section clearly shows `npm install -g easyspec-prompts` as the primary installation command
- The README "Install" section clearly shows `npx easyspec-prompts init --scope project` as the no-install alternative
- The README "Release" section is updated to reference the new automated workflow instead of manual GitHub Release steps

## Out of Scope

- Multi-platform binary releases (Linux, macOS, Windows installers)
- Docker image publishing
- Cross-OS release validation or smoke testing
- Automated changelog generation
- Semantic version bumping (version number is still managed manually in `package.json`)
- Integration with a prerelease branch strategy (e.g., `alpha`/`beta` branches)
- Post-publish notification (Slack, Discord, etc.)

## Dependencies & Constraints

- **npm Trusted Publishing**: The npm package `easyspec-prompts` must be configured in the npm registry for trusted publishing via GitHub OIDC (requires npm package ownership configuration). No long-lived npm access tokens are needed.
- **Approval Gate**: A protected environment must be configured in the repository settings with reviewer protection rules as the sign-off gate before publish.
- **Tag Convention**: Version tags must follow the format `v<semver>` for stable releases and `v<semver>-<prerelease>.<n>` for prereleases (e.g., `v0.2.0-beta.1`).
- **No Build Step**: The project distributes source directly, so no compilation or build step is required before publishing.
