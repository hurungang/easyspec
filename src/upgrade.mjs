import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { confirm } from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { fileHasTag } from "./ownership.mjs";

/**
 * Install manifest + tag-verified upgrade cleanup.
 *
 * Manifest location: `.easyspec/manifest.json` inside the installed tool
 * directory (e.g. `<workspace>/.github/.easyspec/manifest.json`).
 *
 * Cleanup is conservative:
 * - Retired artifacts (specific, known names in `RETIRED_ARTIFACT_PATTERNS` such
 *   as `es-change-init` / `es-change-review`), tag-verified obsolete files
 *   (tagged, listed in the old manifest, no longer produced), and broad untagged
 *   `es-*` artifacts from pre-manifest installs are all surfaced for deletion
 *   and removed only after interactive confirmation (with a keep option).
 * - Non-interactive runs list these candidates without deleting; `--dry-run`
 *   lists everything and deletes nothing.
 * - Anything else — including user files that share an easyspec name — is never
 *   deleted or overwritten.
 */

export const MANIFEST_DIR = ".easyspec";
export const MANIFEST_FILE = "manifest.json";

/** Artifact name patterns retired from the kit (candidates for upgrade cleanup). */
export const RETIRED_ARTIFACT_PATTERNS = [/^es-change-init\./, /^es-change-review\./];

const LEGACY_ARTIFACT_DIRS = new Set(["agents", "prompts", "commands", "skills"]);

/**
 * A pre-manifest easyspec artifact: uses the `es-` prefix and lives in an
 * install directory. Two layouts are recognized:
 * - "tool": the install root has `agents/`, `prompts/`, `commands/`, `skills/`
 *   subdirectories (e.g. a project `.github`, or a home `~/.copilot` root).
 * - "flat": the install root *is* a prompt/command directory, so artifacts sit
 *   directly at the top level (e.g. Copilot's global user prompts directory).
 */
function isLegacyEasyspecArtifact(relPath, layout) {
  if (!/^es-.*\.md$/.test(path.basename(relPath))) {
    return false;
  }
  if (layout === "flat") {
    return true;
  }
  return LEGACY_ARTIFACT_DIRS.has(relPath.split(path.sep)[0]);
}

export function manifestPath(rootPath) {
  return path.join(rootPath, MANIFEST_DIR, MANIFEST_FILE);
}

export function readManifest(rootPath) {
  const filePath = manifestPath(rootPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || !Array.isArray(parsed.files)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hashFile(filePath) {
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  } catch {
    return null;
  }
}

/** Write the manifest for the given installed paths (relative to rootPath). */
export function writeManifest(rootPath, relPaths, { dryRun = false } = {}) {
  if (dryRun) {
    return null;
  }
  const files = relPaths
    .slice()
    .sort()
    .map((rel) => ({ path: rel, hash: hashFile(path.join(rootPath, rel)) }))
    .filter((entry) => entry.hash !== null);

  const manifest = {
    version: 1,
    installedAt: new Date().toISOString(),
    files,
  };

  const dir = path.join(rootPath, MANIFEST_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(manifestPath(rootPath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function walkFiles(dirPath, skipNames = new Set([MANIFEST_DIR, "node_modules"])) {
  const out = [];
  if (!fs.existsSync(dirPath)) {
    return out;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (skipNames.has(entry.name)) {
      continue;
    }
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, skipNames));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

function isRetiredName(relPath) {
  const base = path.basename(relPath);
  return RETIRED_ARTIFACT_PATTERNS.some((re) => re.test(base));
}

/**
 * Compute deletion candidates: files present on disk and not part of the new
 * artifact set, split into three buckets (see the module header):
 * - `retiredCandidates`: known retired names (offered for confirmation).
 * - `candidates`: tag-verified obsolete files listed in the old manifest.
 * - `legacyCandidates`: untagged `es-*` artifacts from pre-manifest installs.
 */
export function computeCleanupCandidates(rootPath, newRelPaths, { layout = "tool" } = {}) {
  const newSet = new Set(newRelPaths);
  const oldManifest = readManifest(rootPath);
  const oldPaths = new Set((oldManifest?.files || []).map((f) => f.path));

  const candidates = [];
  const retiredCandidates = [];
  const legacyCandidates = [];
  const seen = new Set();
  for (const abs of walkFiles(rootPath)) {
    const rel = path.relative(rootPath, abs);
    if (seen.has(rel) || newSet.has(rel)) {
      continue;
    }
    seen.add(rel);
    const tagged = fileHasTag(abs);
    const inOldManifest = oldPaths.has(rel);
    const retired = isRetiredName(rel);

    if (retired) {
      // A known retired name (e.g. es-change-init, es-change-review) is an
      // unambiguous easyspec artifact — surfaced for confirmation regardless of tag.
      retiredCandidates.push(rel);
    } else if (inOldManifest && tagged) {
      candidates.push(rel);
    } else if (!oldManifest && !tagged && isLegacyEasyspecArtifact(rel, layout)) {
      legacyCandidates.push(rel);
    }
  }
  return {
    manifestFound: oldManifest !== null,
    candidates: candidates.sort(),
    retiredCandidates: retiredCandidates.sort(),
    legacyCandidates: legacyCandidates.sort(),
  };
}

/**
 * Run upgrade cleanup for an install root.
 * - Interactive: every candidate (retired names, tag-verified obsolete files,
 *   and broad `es-*` legacy files) is offered for deletion, one confirmation per
 *   file with a keep option.
 * - Non-interactive: candidates are listed but never deleted.
 * - `--dry-run` lists every candidate and deletes nothing.
 * Returns { manifestFound, candidates, retiredCandidates, legacyCandidates, deleted, kept }.
 */
export async function runUpgradeCleanup(rootPath, newRelPaths, { dryRun = false, layout = "tool" } = {}) {
  const { manifestFound, candidates, retiredCandidates, legacyCandidates } = computeCleanupCandidates(rootPath, newRelPaths, { layout });
  const result = { manifestFound, candidates, retiredCandidates, legacyCandidates, deleted: [], kept: [] };

  if (candidates.length === 0 && retiredCandidates.length === 0 && legacyCandidates.length === 0) {
    return result;
  }

  const interactive = process.stdin.isTTY && !dryRun;

  // Untagged easyspec artifacts (retired names + broad es-* scan) are grouped
  // into a single explicit confirmation.
  const untagged = [...retiredCandidates, ...legacyCandidates];

  if (!interactive) {
    if (candidates.length > 0) {
      const verb = dryRun ? "would delete" : "found (non-interactive run — nothing deleted)";
      console.log(`[easyspec-init] upgrade cleanup: ${verb} ${candidates.length} obsolete tagged file(s) under ${rootPath}:`);
      for (const rel of candidates) {
        console.log(`  - ${rel}`);
      }
      if (!dryRun) {
        result.kept.push(...candidates);
      }
    }
    if (untagged.length > 0) {
      const verb = dryRun ? "would offer for deletion" : "found (non-interactive run — nothing deleted)";
      console.log(
        `[easyspec-init] upgrade cleanup: ${verb} ${untagged.length} easyspec file(s) under ${rootPath}:`
      );
      for (const rel of untagged) {
        console.log(`  - ${rel}`);
      }
      if (!dryRun) {
        result.kept.push(...untagged);
      }
    }
    return result;
  }

  if (candidates.length > 0) {
    console.log(`[easyspec-init] upgrade cleanup: ${candidates.length} obsolete tagged easyspec file(s) no longer installed:`);
    for (const rel of candidates) {
      console.log(`  - ${rel}`);
    }

    const deleteAll = await confirm({
      message: `Delete all ${candidates.length} obsolete tagged easyspec file(s)?`,
      initialValue: false,
    });
    if (!isCancel(deleteAll) && deleteAll) {
      for (const rel of candidates) {
        fs.rmSync(path.join(rootPath, rel));
        result.deleted.push(rel);
      }
    } else {
      for (const rel of candidates) {
        const answer = await confirm({
          message: `Delete obsolete tagged file ${rel}?`,
          initialValue: false,
        });
        if (!isCancel(answer) && answer) {
          fs.rmSync(path.join(rootPath, rel));
          result.deleted.push(rel);
        } else {
          result.kept.push(rel);
        }
      }
    }
  }

  if (untagged.length > 0) {
    console.log(
      `[easyspec-init] upgrade cleanup: ${untagged.length} easyspec file(s) from previous versions are no longer installed:`
    );
    for (const rel of untagged) {
      console.log(`  - ${rel}`);
    }

    const deleteAllUntagged = await confirm({
      message: `Delete all ${untagged.length} easyspec file(s)? They are no longer part of the current install.`,
      initialValue: false,
    });
    if (!isCancel(deleteAllUntagged) && deleteAllUntagged) {
      for (const rel of untagged) {
        fs.rmSync(path.join(rootPath, rel));
        result.deleted.push(rel);
      }
    } else {
      for (const rel of untagged) {
        const answer = await confirm({
          message: `Delete easyspec file ${rel}?`,
          initialValue: false,
        });
        if (!isCancel(answer) && answer) {
          fs.rmSync(path.join(rootPath, rel));
          result.deleted.push(rel);
        } else {
          result.kept.push(rel);
        }
      }
    }
  }

  return result;
}
