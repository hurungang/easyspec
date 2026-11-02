<!-- easyspec:managed v1 -->
# Feature: Project Initialization (es-init)

`es-init` is the single entry point for bringing easyspec into a project. Its name reflects its purpose: it initializes the project for easyspec, not an individual change.

## Capability

- Running `es-init` performs the full adoption flow in one guided step:
  - Creates the root-level easyspec configuration file.
  - Confirms the docs-folder choice with the user (default `easyspec-docs`).
  - Generates the complete set of master documentation describing the project's current state.
  - Tags every created artifact as easyspec-owned.
- Master documentation is grounded in the code, not in stale prose:
  - Existing project documentation (from any source) is used as input context when present.
  - When documentation and code disagree, the generated docs follow the code.
  - When no usable documentation exists, the codebase itself is scanned to produce the docs.
- Master docs cover the standard areas (product, architecture, data model, technology, QA, deployment, operations, reference as applicable).
- When project structure cannot be reliably detected, `es-init` asks the user rather than guessing.
- Projects initialized with the legacy hardcoded layout require a one-time manual re-init; upgrade messaging states this clearly.

## Value

- First contact with easyspec is trustworthy: the entry-point command does exactly what its name says.
- Teams trust generated documentation because it describes the project as it actually is today.

## Rules

- `es-init` replaces the retired `es-change-init` command entirely.
- Generated master docs prioritize code over conflicting existing documentation.
- No user-owned file is overwritten during initialization.
