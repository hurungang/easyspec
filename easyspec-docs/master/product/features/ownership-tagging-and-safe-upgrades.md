<!-- easyspec:managed v1 -->
# Feature: Ownership Tagging & Safe Upgrades

Every artifact easyspec creates is explicitly marked as easyspec-owned, making the kit safe to upgrade and safe to remove — without ever endangering user files.

## Capability

- Every user-facing artifact easyspec creates — master docs, change docs, the root config file, and installed prompts/agents/skills — carries a machine-readable easyspec ownership marker.
- The marker is stable across versions so future upgrades can identify artifacts created by this and earlier releases.
- On version upgrade, the installer:
  - Identifies obsolete easyspec-owned files from previous versions (e.g., retired commands) as deletion candidates — only tagged files qualify.
  - For installs that predate the manifest and ownership tag, separately identifies untagged files matching easyspec's `es-` artifact naming and offers them for deletion with an explicit warning.
  - Presents each deletion candidate for user confirmation, with a per-file or batched option to keep any old file.
  - Skips declined deletions without error.
- Files without the easyspec ownership tag are never deleted or overwritten automatically — including user files that happen to share a name with an easyspec artifact — except that files matching a known retired artifact name (`es-change-init`, `es-change-review`) are removed on upgrade.

## Value

- Upgrades become a single guided step with zero risk to user-authored content: stale kit files are cleaned up, user files are untouchable.
- The kit is self-describing: automated lifecycle operations (cleanup, migration, upgrade) need no user bookkeeping about which files easyspec owns.

## Rules

- Ownership tagging is mandatory for every easyspec-created artifact, in every target tool's format.
- Untagged files are categorically excluded from automatic deletion; pre-manifest easyspec artifacts are only offered for deletion after an explicit warning and confirmation.
- All deletions are confirm-by-default; unattended automatic upgrades are out of scope.
