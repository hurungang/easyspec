<!-- easyspec:managed v1 -->
# Testing Strategy

**Owner**: es-tester agent
**Applies to**: @myaider/easyspec — Node.js CLI (ESM), no build step, published to npm.

---

## 1. Overall Approach

Easyspec is a Node CLI that installs prompts, agents, and skills into user projects (copilot, opencode, claude-code tool profiles) and orchestrates spec-driven development via agent prompts. The test strategy reflects that reality:

- **Automated layer: a single Node built-in test-runner suite.** Run with `npm test`; test files live in `tests/` (per `easyspec-config.yaml`, `source.tests = tests/`). There is no pytest/vitest/jest/Playwright in this repo — the built-in runner is the entire automated test layer. Within it, unit-level suites cover individual modules (`src/config.mjs`, `src/ownership.mjs`, `src/upgrade.mjs`) and integration/e2e-style suites drive the CLI (`bin/easyspec-init.js`) end-to-end against temporary workspace fixtures.
- **Fakehome fixtures.** Global-scope install tests use `tests/.fakehome/` as a fixture HOME so installs never touch the developer's real home directory. Per-test workspaces use temp directories; tests must not depend on this repo's own config state (the repo uses the configured `easyspec-docs/` layout — see root `easyspec-config.yaml`).
- **Manual E2E install verification.** LLM-driven behavior (master-doc generation by `es-init`) and real install UX are verified manually in sandbox projects: (a) a fresh greenfield project, (b) a project with pre-existing/stale docs, and (c) a legacy `docs/config.yaml` project to verify the confirmed one-step migration. Verify: config scaffolding with docs-folder confirmation, legacy migration preserves `docs/` content and adds `docs_folder: docs`, all files tagged with the ownership marker, no `es-change-init` remnants, existing project docs byte-for-byte unmodified, upgrade cleanup offering only tagged retired artifacts.
- **Non-destructive guarantee as top priority.** Init and upgrade must never delete or overwrite files lacking the `easyspec:managed v1` tag. Negative tests (untagged name-colliding lookalikes, missing/corrupt manifest, non-interactive no-op) are prioritized over happy paths because deletion is irreversible.

## 2. Suite Layout

| Test file | Scope |
|-----------|-------|
| `tests/template.test.js` | Template content and installer pipeline (rendering, tagging, rename completeness, path hygiene, CLI flags, sync) |
| `tests/config.test.js` | `src/config.mjs` unit tests (parsing, docs-folder resolution, scaffolding, degradation) |
| `tests/ownership.test.js` | `src/ownership.mjs` unit tests (tag embed/detect, rendering survival) |
| `tests/upgrade.test.js` | CLI-level install + upgrade cleanup (tagging per profile, manifest, candidate classification, non-destructive safety) |
| `tests/.fakehome/` | Fixture HOME for global-scope install tests |

## 3. Demo Cases

**Not applicable.** Easyspec has no browser UI, and this project has no Playwright/browser E2E framework and no `demo-cases.md`. E2E verification is manual CLI installation into sandbox projects; no demo cases are curated for this CLI project.
