<!-- easyspec:managed v1 -->
# CLI Installer Test Plan

**Owner**: es-tester agent
**Scope**: Automated test coverage for the easyspec CLI installer, config resolution, ownership tagging, and upgrade cleanup.

All automated tests live in the single Node built-in test-runner suite (`npm test`, `tests/`). This plan references the actual test files on disk; it contains no test code. Overall approach: see `../testing-strategy.md`.

---

## 1. Template & Installer Suite — `tests/template.test.js`

Covers template content and the installer rendering pipeline:

- Rename completeness: `es-init` body present and renders per tool profile; retired command names (`es-change-init`, `es-change-review`) absent from all template content and rendered output.
- Path hygiene: no hardcoded `docs/` project paths in template bodies; the only allowed legacy reference is `docs/config.yaml` inside the migration flow. All docs paths resolve from `easyspec-config.yaml`.
- Ownership-tag presence and frontmatter integrity at every write site.
- `es-` prefix and kebab-case cross-reference consistency.
- Per-profile rendering (copilot / opencode / claude-code), model selection, global vs. project scope install locations.
- CLI flag semantics: `--force`, `--dry-run`, help/error behavior; `sync` command including `collectPromptFiles` picking up `es-init`.

## 2. Config Module — `tests/config.test.js`

Unit tests for `src/config.mjs`:

- Flat-config parsing (scalars, maps, lists); missing config treated as fresh-install state.
- Docs-folder resolution and derived `master/` / `changes/` paths; default-folder fallback; trailing-slash handling.
- Malformed-config degradation: parses to `{}` and falls back to the default docs folder (documented behavior, no crash).
- `scaffoldConfig`: creation, no-clobber of existing config, dry-run makes no writes.
- Legacy migration: `readLegacyConfig` detects/parses `docs/config.yaml` only when it looks like an easyspec config (a third-party `docs/config.yaml` is ignored); `renderMigratedConfigYaml` preserves the body and emits exactly one `docs_folder: docs`; `migrateLegacyConfig` writes the root config and removes the legacy file; it never overwrites a root config; dry-run writes/deletes nothing.

## 3. Ownership Module — `tests/ownership.test.js`

Unit tests for `src/ownership.mjs`:

- Tag embed/detect round-trip; idempotent embedding.
- Tag placement after frontmatter so it survives per-tool rendering (placeholder substitution, frontmatter rewriting, skill-directory copying).
- Detection across target-tool text formats; `fileHasTag` on disk with missing files treated as untagged.

## 4. Install & Upgrade — `tests/upgrade.test.js`

CLI-level end-to-end coverage (drives the installer against temp workspaces; `tests/.fakehome/` serves as fixture HOME for global scope):

- Project install (opencode profile, non-TTY): tags every written file, scaffolds root `easyspec-config.yaml` with default `docs_folder: easyspec-docs`, writes the install manifest, leaves a pre-existing `docs/` folder untouched.
- Non-interactive legacy install: when only `docs/config.yaml` exists, no root config is scaffolded and the legacy config is preserved (migration requires interactive confirmation). A third-party `docs/config.yaml` that is not an easyspec config does not block normal scaffolding.
- All three profiles produce only tagged files; install renders `es-init` and leaves no `es-change-init` or `es-change-review` artifact.
- Global scope creates no project config; `--dry-run` writes nothing; re-install refreshes the manifest. Copilot global scope records a separate manifest in its external prompts directory.
- Custom `docs_folder` honored at the CLI level (no `easyspec-docs` created, existing config not clobbered); malformed config does not crash init.
- Upgrade cleanup: candidate classification into three buckets — retired names (`es-change-init`, `es-change-review`, auto-removed regardless of tag/manifest), tag-verified obsolete manifest entries, and untagged `es-*` files from pre-manifest installs; untagged same-named files that are not retired are never tag-verified candidates and are never deleted automatically; non-interactive run auto-removes retired names and keeps the other buckets (`kept` populated); dry-run no-op.
- Pre-manifest legacy cleanup: with no install manifest, untagged non-retired `es-*` artifacts in install dirs (`commands/`, `prompts/`, `agents/`, `skills/`) are surfaced separately as legacy candidates; flat prompt directories (Copilot's global prompts dir) are covered via the `layout` option; non-`es-` user files are ignored; non-interactive/dry-run keep them; interactive runs require explicit confirmation before deletion.

## 5. Manual E2E (not automated)

Verify in sandbox projects per `../testing-strategy.md`: fresh install scaffolds config and tagged artifacts; pre-existing docs untouched; upgrade cleanup auto-removes retired commands (`es-change-init`, `es-change-review`) and offers only tagged retired artifacts with a keep option in non-interactive mode. LLM-driven master-doc generation (`es-init` code-wins behavior, codebase-only scan, graceful degradation) is covered by prompt-body assertions in `tests/template.test.js` plus manual verification — it is not automatable in the Node suite.

---

## Coverage → Acceptance Criteria

Maps to the change PRD ACs (AC1–AC12) as detailed in `easyspec-docs/changes/archive/2026-11-02-easyspec-config-and-init-rework/test-plan.md` §5–6; every AC has at least one automated reference above, with AC6–AC8 (generation behavior) additionally verified manually.
