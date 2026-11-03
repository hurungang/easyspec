# Test Plan: easyspec-config-and-init-rework

**Owner**: es-tester agent
**Purpose**: Coverage areas, scenarios, and acceptance criteria for testing the docs-folder configuration, `es-change-init` → `es-init` rename, code-authoritative master-doc generation, ownership tagging, and upgrade cleanup.

---

## 1. Test Strategy

- **Unit tests (Node.js built-in test runner, `tests/`)** — Cover the new modules in isolation: `src/config.mjs` (config read, defaults, scaffolding, derived paths), `src/ownership.mjs` (tag embedding and detection), and manifest read/write helpers. Use temporary workspace fixtures (temp dirs) to avoid touching repo state.
- **Integration tests (extend `tests/template.test.js`)** — Exercise the installer end-to-end per target tool profile (copilot, opencode, claude-code) using the existing `tests/.fakehome/` fixture pattern: rendering pipeline, tagging write sites, manifest recording, `es-init` presence, `es-change-init` absence, and config-resolved path references in rendered output.
- **Upgrade-cleanup tests** — Simulate a prior-version install (old manifest + tagged/untagged files on disk) in a temp workspace, then run the upgrade path of `easyspec init` and assert candidate classification, per-file confirmation behavior (including non-interactive and keep choices), and that untagged files survive byte-for-byte.
- **CLI behavior tests** — Run `bin/easyspec-init.js` (or `runCli`) with `--dry-run`, `--force`, and non-TTY scenarios against fixture workspaces to confirm preserved flags, non-interactive defaults, and no unexpected writes.
- **Template-content assertions** — Grep-level assertions over `templates/content/` bodies: no hardcoded `docs/` project path references, `/es-change-init` fully replaced by `/es-init`, ownership tag present in `es-init` prompt and lifecycle skill outputs.
- **Manual/E2E verification** — Manual run of `es-init` in two sandbox projects: (a) a fresh greenfield project, (b) a project with a pre-existing `docs/` folder and stale documentation that contradicts the code. Verify master docs follow code, existing docs are unmodified, and no easyspec content lands outside the configured docs folder.

---

## 2. Coverage Areas

1. **Docs Folder Resolver (`src/config.mjs`)** — Reading `easyspec-config.yaml` from workspace root; default `easyspec-docs` when file/setting absent; custom folder names; derivation of `<docs-folder>/master/` and `<docs-folder>/changes/`; scaffolding a new root config with the confirmed value; distinct handling of "config missing" (fresh install) vs. malformed config. Critical because every path in the kit derives from it — a resolver bug misroutes all artifacts.
2. **Root config scaffolding & docs-folder confirmation** — Interactive confirmation flow (default offered, user can override), stored value persisted correctly, non-TTY fall-back to default without hanging, `--dry-run` making no writes.
3. **`es-change-init` → `es-init` rename completeness** — Old prompt body removed; new `es-init.body.md` present; `es-init.prompt.md` (copilot) and `es-init.md` (opencode/claude-code command) render for every tool profile; `collectPromptFiles` picks up `es-init` for `sync`; no template, installer path, or rendered output references the old name. Critical because a missed reference silently breaks the entry-point command in some target tools only.
4. **Ownership tagging** — Tag embedded at every installer write site (prompts, agents, skills, config file, generated docs) for every tool profile; tag survives generic-template rendering (`renderTemplate`, `renderEntitiesFromContent`, `copySkillDirectory`); detector finds the tag regardless of target-tool format; detector returns "untagged" for arbitrary user files. Critical because upgrade-deletion safety rests entirely on tag reliability.
5. **Install manifest** — Manifest written after each install (project and global scope) with destination paths and content identities; readable on subsequent runs; tolerant of missing/corrupt manifest.
6. **Upgrade cleanup** — Candidate classification (retired from the new version by name **or** present in the old manifest, plus verified tagged on disk — retired artifacts are offered even without a prior manifest); removal of obsolete `es-change-init` artifacts; per-file confirmation with keep option; skipped deletions produce no error; no-ops in non-interactive mode and under `--dry-run`.
7. **Non-destructive guarantee** — No file lacking the tag is deleted or overwritten by init or upgrade, including name-colliding user files; existing project docs are read but never modified.
8. **Master-doc generation behavior (es-init)** — Existing docs used as input context; code wins on conflict (docs stale vs. code); codebase-only scan when no usable docs exist; graceful degradation (asks user) when code structure is undetectable; generated docs land under `<docs-folder>/master/` for all standard areas and carry the ownership tag.
9. **Installer regression safety** — Existing behavior preserved: tool-profile transformation pipeline, generic-template rendering, skill copying, model selection/frontmatter updates, `sync` command, `--force`/`--dry-run` semantics, global vs. project scope, platform-specific copilot prompt path.
10. **Path-reference hygiene across templates** — All agent bodies, remaining prompt bodies, and the lifecycle skill resolve paths from config (Step 0 rule) with no hardcoded `docs/` project paths.

---

## 3. Critical Scenarios

### Config resolution & scaffolding

- **WHEN** `easyspec init` runs on a fresh project with no `easyspec-config.yaml` **THEN** a root `easyspec-config.yaml` is created, the docs-folder prompt is shown with default `easyspec-docs`, and on confirmation the configured folder is created.
- **WHEN** `easyspec-config.yaml` already exists with a custom docs folder (e.g. not `docs/` and not `easyspec-docs`) **THEN** all easyspec paths derive from the configured folder and no `easyspec-docs` folder is created.
- **WHEN** init runs in a non-TTY environment **THEN** the docs-folder prompt is skipped and the default `easyspec-docs` is used without hanging.
- **WHEN** `easyspec init --dry-run` runs **THEN** no config file, docs folder, or manifest is written.
- **WHEN** `easyspec-config.yaml` exists but is malformed **THEN** the unparsable content parses to an empty config and the CLI silently falls back to the default `easyspec-docs` folder (documented degradation, no error).
- **WHEN** a project was initialized with a legacy hardcoded `docs/` layout and is re-inited **THEN** the upgrade messaging clearly states that a manual re-init is required and the legacy layout is not auto-migrated.

### Rename completeness

- **WHEN** install completes for any tool profile **THEN** an `es-init` prompt/command exists in the target location and no `es-change-init` artifact remains.
- **WHEN** the full rendered output of every prompt, agent, and skill body is inspected **THEN** no occurrence of `/es-change-init` or a hardcoded `docs/` project path remains; all directory references are rooted at the configured docs folder.
- **WHEN** `easyspec sync` runs **THEN** `es-init` is included in the collected prompt sources (via the updated `collectPromptFiles`) and is synced correctly.

### Master-doc generation

- **WHEN** `es-init` runs in a project with existing documentation that contradicts the code **THEN** generated master docs follow the code, and the pre-existing documentation files are unmodified.
- **WHEN** `es-init` runs in a project with no usable documentation **THEN** master docs are produced from codebase scanning (workspace exploration plus the config `source` sections).
- **WHEN** code structure cannot be reliably detected during init **THEN** the agent asks the user instead of guessing.
- **WHEN** `es-init` completes **THEN** master docs exist under `<docs-folder>/master/` for all applicable standard areas and every generated file carries the ownership tag.

### Ownership tagging & upgrade cleanup

- **WHEN** any file is written by the installer or `es-init` **THEN** the written content contains the ownership tag, detectable programmatically, in every target-tool format.
- **WHEN** an upgrade runs in a project where a prior install recorded `es-change-init` artifacts **THEN** those retired artifacts are identified as deletion candidates only if tagged on disk, and are removed after confirmation.
- **WHEN** an upgrade runs with no prior manifest but a tagged retired `es-change-init` artifact exists on disk **THEN** it is still identified as a deletion candidate by its retired name (tagged-only), and is not deleted in a non-interactive run.
- **WHEN** a file on disk matching a retired artifact lacks the ownership tag **THEN** it is never offered for deletion and is left untouched.
- **WHEN** the user chooses "keep" for a deletion candidate **THEN** that file is skipped, the upgrade continues, and the command exits successfully.
- **WHEN** the upgrade runs non-interactively or with `--dry-run` **THEN** no deletions occur and no error is raised.
- **WHEN** a user file shares a name with an easyspec artifact but has no tag **THEN** init and upgrade never overwrite or delete it (existing skip/overwrite policy plus tag verification).
- **WHEN** the manifest is missing or corrupted on upgrade **THEN** cleanup degrades safely — no manifest-derived candidates, but tagged retired-by-name artifacts (e.g. `es-change-init`) are still offered — rather than guessing deletions.

### Installer regression

- **WHEN** `easyspec init` installs for copilot, opencode, and claude-code profiles (project and global scope, via the fakehome fixture) **THEN** prompts, agents, and skills render into the correct per-tool locations with correct extensions, and model selection still applies.
- **WHEN** an existing installed file is present without `--force` **THEN** the current skip/overwrite policy behavior is unchanged; with `--force` it overwrites as before.
- **WHEN** `easyspec sync` runs **THEN** template profiles refresh from source directories exactly as before the rework.

---

## 4. Edge Cases & Risks

- **Tag stability across versions** — The ownership tag scheme must be identical to what earlier releases embed (or backwards-detectable); if the tag format drifts, old artifacts become invisible to cleanup and turn into permanent orphans, or worse, untagged. Risk: high impact. Mitigate with a fixture containing an artifact tagged by the "previous version" format.
- **Tag survival through per-tool rendering** — Placeholder substitution, frontmatter rewriting (`upsertModelInFrontmatter`), and skill-directory copying could strip or corrupt the tag in some target format (e.g. copilot frontmatter rules). Test each write site per profile.
- **Workspace-root detection** — `easyspec-config.yaml` must be found at the true workspace root; nested directories, monorepo-style layouts, and running the CLI from a subdirectory could cause the resolver to miss or misplace the config.
- **Symlinks and unusual paths** — Docs folder configured with trailing slash, relative path, or path crossing a symlink; path joining must remain normalized.
- **Docs folder colliding with reserved names** — User configures the docs folder as `docs/` itself, or as a name that already exists as a file (not a directory).
- **Non-interactive/CI environments** — All prompts (docs folder, deletion confirmations) must have defined non-TTY behavior; a prompt waiting forever is a CI-blocking bug.
- **Partially corrupted prior state** — Manifest exists but files were hand-deleted, or tagged files exist without manifest entries; cleanup must not error or over-delete.
- **Config file hand-edited between installs** — Docs folder renamed by the user after init; upgrade must resolve paths from the current config, and old-location artifacts may be missed (acceptable, but must not crash).
- **`collectPromptFiles` pattern gap** — If the sync glob is not widened beyond `es-change-*`, `es-init` silently disappears on sync; add an explicit regression assertion.
- **Stale `docs/config.yaml` inside this repo** — The easyspec repo itself still carries the legacy `docs/` layout; tests must not depend on this repo's own config state, and the repo's own re-init is manual.
- **Risk: deletion is irreversible** — Any bug in tag detection or manifest comparison risks destroying user work. Prioritize negative tests (untagged lookalikes, missing manifest) over happy paths.

---

## 5. Acceptance Criteria Checklist

Maps to PRD acceptance criteria (AC numbering follows PRD order):

[x] **AC1** — Fresh-project init creates root `easyspec-config.yaml` and default docs folder `easyspec-docs` unless the user chooses otherwise. *(Scenario: Config scaffolding)*
[x] **AC2** — Docs-folder choice is shown and confirmed during init with default `easyspec-docs`; confirmed value stored in `easyspec-config.yaml`. *(Scenarios: scaffolding, non-TTY)*
[x] **AC3** — All easyspec project content lives under the configured docs folder; nothing is written to a hardcoded `docs/` path. *(Scenario: custom docs folder; template-content assertions)*
[x] **AC4** — All prompts, agents, skills, and internal tooling resolve the docs folder from `easyspec-config.yaml`; no template or CLI code references a hardcoded `docs/` project path. *(Scenario: rename completeness / path hygiene; unit tests on `src/config.mjs`)*
[x] **AC5** — `es-change-init` replaced by `es-init` with equivalent-plus-new behavior (config creation, docs-folder confirmation, master-doc generation, tagging). *(Scenario: rename completeness)*
[x] **AC6** — Init generates master docs for all standard areas describing the project's actual current state. *(Scenario: master-doc generation)*
[x] **AC7** — Existing documentation is used as input context; on conflict, generated docs follow the code. *(Scenario: docs-vs-code conflict)*
[x] **AC8** — With no usable documentation, init scans the codebase to produce master docs. *(Scenario: codebase-only scan)*
[x] **AC9** — Every user-facing artifact (master docs, change docs, root config, installed prompts/agents/skills) embeds a programmatically identifiable ownership marker. *(Scenario: ownership tagging per write site and profile)*
[x] **AC10** — Upgrade from an `es-change-init`-installing version removes old artifacts; only tagged files are deletion candidates. *(Scenario: upgrade cleanup, untagged lookalike)*
[x] **AC11** — Each deletion candidate is presented for confirmation; per-file/batched "keep" honored; declined deletions skipped without error. *(Scenario: keep choice, non-interactive no-op)*
[x] **AC12** — No file lacking the ownership tag is ever deleted or overwritten by init or upgrade, including identically named user files. *(Scenarios: non-destructive guarantee, name-colliding user file)*

---

## 6. Test File References

**Note on layers**: This project is a Node CLI whose entire test layer is the single Node built-in test-runner suite (`npm test`, `tests/`). There is no pytest/vitest/Playwright in this repo, so the "three layers" requirement maps as follows: the unit-level assertions on `src/config.mjs` / `src/ownership.mjs` / `src/upgrade.mjs` cover the would-be backend layer; the CLI e2e and per-profile install tests (driving `bin/easyspec-init.js` against temp workspaces with the `tests/.fakehome/` HOME fixture) cover the would-be integration layer; and the manual sandbox checks below cover E2E.

All test paths per the repo's own config (`source.tests` = `tests/`):

- `tests/template.test.js` — Template/installer suite: rename assertions (`es-init` body present and renders per profile, `es-change-init` absent from all template content, lines 27/234/328), hardcoded-`docs/`-path absence (line 315), docs-folder-from-config resolution rule in agents and the lifecycle skill (line 338), ownership-tag/frontmatter integrity, `es-` prefix and kebab-case cross-reference consistency, per-profile rendering (copilot/opencode/claude-code), model selection, global vs. project scope install locations, `--force`/`--dry-run` semantics, help/error CLI behavior, and the sync command.
- `tests/config.test.js` — Unit tests for `src/config.mjs`: flat-config parsing (scalars, maps, lists), missing-config-as-fresh-install state, docs-folder + derived `master/` / `changes/` path resolution, default-folder fallback, trailing-slash handling, malformed-config degradation (parses to `{}`, falls back to default — documented behavior), `scaffoldConfig` creation + no-clobber + dry-run.
- `tests/ownership.test.js` — Unit tests for `src/ownership.mjs`: embed/detect round-trip, idempotent embedding, tag placed after frontmatter so it survives per-tool rendering, detection across target-tool text formats, `fileHasTag` on disk with missing files treated as untagged.
- `tests/upgrade.test.js` — Install tagging + upgrade cleanup: opencode install tags every file, scaffolds the root config, writes the manifest, and leaves a pre-existing `docs/` folder untouched; all three profiles produce only tagged files; dry-run writes nothing and re-install refreshes the manifest; global scope creates no project config; custom `docs_folder` honored at CLI level with no `easyspec-docs` created and existing config not clobbered; malformed config does not crash init; install renders `es-init` and leaves no `es-change-init` artifact for every profile; cleanup candidate classification (retired + old-manifest entries, tagged-only), untagged same-named files never candidates, non-interactive keep (nothing deleted, `kept` populated), dry-run no-op.
- `tests/.fakehome/` — Fixture HOME for global-scope installs; used by the CLI e2e tests.

### Critical-scenario → test mapping (PRD ACs)

| AC | Covered by |
|----|------------|
| AC1 fresh init scaffolds config + default folder | `upgrade.test.js` "opencode project install tags every file..." (non-TTY run accepts default) |
| AC2 docs-folder confirmed/stored | same, plus `cli.mjs` `confirmDocsFolder` non-TTY path (tests run non-TTY → default without hanging) |
| AC3 content under configured folder | `upgrade.test.js` custom-docs-folder test; `template.test.js` line 315 (no hardcoded `docs/`) |
| AC4 config-resolved paths everywhere | `config.test.js` path resolution; `template.test.js` line 338 |
| AC5 es-init replaces es-change-init | `template.test.js` lines 27/234/328; `upgrade.test.js` "install renders es-init..." |
| AC6–AC8 master-doc generation (code wins, codebase-only scan, graceful degradation) | agent-prompt level only — covered by `template.test.js` body assertions (`es-init` instructs reading config + code-first rules) and manual E2E; LLM-driven generation itself is not automatable in the Node suite |
| AC9 ownership marker everywhere | `ownership.test.js`; `upgrade.test.js` tagging tests (all write sites, all profiles, incl. root config) |
| AC10 upgrade removes only tagged retired artifacts | `upgrade.test.js` candidate-classification tests |
| AC11 per-file confirmation with keep honored | `upgrade.test.js` non-interactive test (`kept` populated, nothing deleted); interactive clack prompts not TTY-testable in CI |
| AC12 untagged files never deleted/overwritten | `upgrade.test.js` untagged-lookalike tests; verified manually below |

### Manual E2E verification (recorded 2026-11-02, sandbox at temp dir)

- **Fresh install into a temp project** — `easyspec init --scope project --agent opencode --force --no-model-prompt` (non-TTY): created root `easyspec-config.yaml` with `docs_folder: easyspec-docs`, installed 16 files under `.opencode/` (commands incl. `es-init.md`, 7 agents, lifecycle skill), all 16 carry the ownership tag; manifest written; no `es-change-init` anywhere.
- **Pre-existing `docs/` untouched** — a `docs/third-party.md` created before init remained byte-for-byte identical after install and upgrade; no easyspec content written into `docs/`.
- **Upgrade cleanup with keep option** — re-running init after install produced zero cleanup candidates; a tagged retired `es-change-init.md` was correctly listed as a candidate but **not deleted** in the non-interactive run (`kept` list populated); an **untagged** `es-change-init.md` lookalike was never offered for deletion and survived untouched.
- **Untagged-file safety** — confirmed both by the sandbox run above and by `tests/upgrade.test.js` negative tests.
