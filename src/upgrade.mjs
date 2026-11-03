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
 * - Tag-verified candidates: files that carry the ownership tag and are either
 *   listed in the old manifest or match a retired artifact name, and are no
 *   longer produced by the new version. Deleted only after user confirmation.
 * - Untagged easyspec artifacts: files without the tag that match a retired
 *   name (surfaced regardless of manifest, since they can linger from installs
 *   that predate ownership tagging), or — for installs that predate the
 *   manifest — any `es-*.md` artifact in an install directory. Surfaced
 *   separately with an explicit warning and confirmation, never mixed with
 *   tag-verified candidates.
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
 * artifact set, split into tag-verified candidates and untagged legacy
 * candidates (see the module header for the safety rules).
 */
export function computeCleanupCandidates(rootPath, newRelPaths, { layout = "tool" } = {}) {
  const newSet = new Set(newRelPaths);
  const oldManifest = readManifest(rootPath);
  const oldPaths = new Set((oldManifest?.files || []).map((f) => f.path));

  const candidates = [];
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

    if ((inOldManifest || retired) && tagged) {
      candidates.push(rel);
      continue;
    }

    // Untagged easyspec artifacts are never auto-deleted, but are surfaced for
    // explicitly confirmed cleanup. Two cases:
    // - a known retired name (specific easyspec names, offered regardless of
    //   manifest — these can linger from installs that predate ownership tags);
    // - a broad `es-*` scan for installs that predate the manifest entirely.
    const retiredUntagged = retired && !tagged;
    const legacyUntagged = !oldManifest && !tagged && isLegacyEasyspecArtifact(rel, layout);
    if (retiredUntagged || legacyUntagged) {
      legacyCandidates.push(rel);
    }
  }
  return {
    manifestFound: oldManifest !== null,
    candidates: candidates.sort(),
    legacyCandidates: legacyCandidates.sort(),
  };
}

/**
 * Run upgrade cleanup for an install root.
 * - Non-interactive or --dry-run: lists candidates without deleting.
 * - Interactive: batch confirm, then per-file confirm with keep option.
 * Tag-verified candidates are handled first; untagged easyspec artifacts
 * (retired names and pre-manifest `es-*` files) are handled separately with an
 * explicit warning.
 * Returns { manifestFound, candidates, legacyCandidates, deleted, kept }.
 */
export async function runUpgradeCleanup(rootPath, newRelPaths, { dryRun = false, layout = "tool" } = {}) {
  const { manifestFound, candidates, legacyCandidates } = computeCleanupCandidates(rootPath, newRelPaths, { layout });
  const result = { manifestFound, candidates, legacyCandidates, deleted: [], kept: [] };

  if (candidates.length === 0 && legacyCandidates.length === 0) {
    return result;
  }

  const interactive = process.stdin.isTTY && !dryRun;

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
    if (legacyCandidates.length > 0) {
      const verb = dryRun ? "would offer for deletion" : "found (non-interactive run — nothing deleted)";
      console.log(
        `[easyspec-init] upgrade cleanup: ${verb} ${legacyCandidates.length} untagged easyspec file(s) under ${rootPath}:`
      );
      for (const rel of legacyCandidates) {
        console.log(`  - ${rel}`);
      }
      if (!dryRun) {
        result.kept.push(...legacyCandidates);
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

  if (legacyCandidates.length > 0) {
    console.log(
      `[easyspec-init] upgrade cleanup: ${legacyCandidates.length} untagged easyspec file(s) have no ownership tag:`
    );
    for (const rel of legacyCandidates) {
      console.log(`  - ${rel}`);
    }

    const deleteAllLegacy = await confirm({
      message: `Delete all ${legacyCandidates.length} untagged easyspec file(s)? They match easyspec's naming and are not part of the current install.`,
      initialValue: false,
    });
    if (!isCancel(deleteAllLegacy) && deleteAllLegacy) {
      for (const rel of legacyCandidates) {
        fs.rmSync(path.join(rootPath, rel));
        result.deleted.push(rel);
      }
    } else {
      for (const rel of legacyCandidates) {
        const answer = await confirm({
          message: `Delete untagged easyspec file ${rel}?`,
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
