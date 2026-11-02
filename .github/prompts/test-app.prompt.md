---
description: Run the easyspec project test suite with optional filtering
---

# Test App: easyspec

This project is a Node.js CLI (no build step, no server). Its entire test layer is the Node test runner suite invoked via `npm test`.

## Usage

- Run with no arguments → run the **full suite**.
- `--filter <pattern>` → run only test files/suites whose name matches the pattern (e.g. `--filter config`, `--filter upgrade`). A filter alone still runs the full (single) test layer across matching files.

## Test layout (from `easyspec-config.yaml` / tests/)

| File | Covers |
|------|--------|
| `tests/template.test.js` | Template content rules: no hardcoded `docs/` paths, no `es-change-init`, `es-init` present, per-profile rendering |
| `tests/config.test.js` | `src/config.mjs`: docs-folder resolution, defaults, malformed-config degradation |
| `tests/ownership.test.js` | `src/ownership.mjs`: tag embed/detect round-trip, idempotency, frontmatter handling |
| `tests/upgrade.test.js` | Manifest recording, upgrade cleanup, untagged-file safety, dry-run behavior |
| `tests/.fakehome/` | Simulated home dirs for opencode/copilot/claude-code install fixtures |

## Commands

```bash
# Full suite
npm test

# Filtered (matches file names / suite names)
node --test --test-name-pattern="<pattern>" tests/
```

## Requirements

- All tests must pass before marking a change `implemented`.
- After running, report: total suites, total tests, pass/fail counts, and any failures with their file + test name.
