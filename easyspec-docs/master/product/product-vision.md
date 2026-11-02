<!-- easyspec:managed v1 -->
# Product Vision

## What easyspec is

Easyspec is a spec-driven development kit for agentic coding tools. It brings a disciplined specification-and-change lifecycle to AI-assisted development: a distributed team of specialized agents (`es-product-owner`, `es-developer`, and peers) maintains living product documentation and drives changes through a structured, reviewable workflow.

## Why it exists

AI-assisted coding is fast but unmoored: without trustworthy specs, agents drift from intent, documentation goes stale, and teams lose confidence in both. Easyspec makes the specification the shared source of truth between humans and agents — docs grounded in the real state of the code, changes proposed and reviewed through an explicit lifecycle.

## Adoption principles

- **Non-destructive adoption.** Easyspec fits into existing projects — including those already using other documentation tooling — without touching anything it does not own. The docs location is a per-project choice, and existing documentation is preserved and used as input.
- **Trustworthy by default.** Generated documentation describes the project as the code actually is today; when docs and code disagree, code wins.
- **Safe to upgrade.** Every easyspec artifact is explicitly owned and machine-identifiable. Upgrades clean up obsolete kit files with user confirmation and can never delete user-authored files.
- **Self-describing.** One root configuration tells every agent, prompt, and installer where documentation lives and what easyspec owns — no hardcoded conventions, no user bookkeeping.

## Success looks like

- Teams adopt easyspec in live codebases in one guided step, with zero risk to existing content.
- Master documentation remains trusted over time because it is regenerated from code reality.
- Version upgrades are uneventful: stale kit artifacts are removed with confirmation; user files are never at risk.
- Humans and the agent team share one authoritative, code-grounded specification of the product.
