import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { confirm } from "@clack/prompts";
import { isCancel } from "@clack/prompts";

/**
 * Install manifest + retired-artifact cleanup.
 *
 * Manifest location: `.easyspec/manifest.json` inside the installed tool
 * directory (e.g. `<workspace>/.github/.easyspec/manifest.json`).
 *
 * Cleanup is deliberately minimal: easyspec only ever offers to delete files
 * whose names match a known retired artifact (`RETIRED_ARTIFACT_PATTERNS`, e.g.
 * `es-change-init` / `es-change-review`). Nothing else is a deletion candidate —
 * current files, user files, and other untagged `es-*` files are left untouched.
 */

export const MANIFEST_DIR = ".easyspec";
export const MANIFEST_FILE = "manifest.json";

/** Artifact name patterns retired from the kit (the only cleanup candidates). */
export const RETIRED_ARTIFACT_PATTERNS = [/^es-change-init\./, /^es-change-review\./];

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
 * Find retired artifacts: files present on disk whose name matches a known
 * retired artifact name. These are the only deletion candidates.
 */
export function computeCleanupCandidates(rootPath, newRelPaths = []) {
  const newSet = new Set(newRelPaths);
  const retiredCandidates = [];
  for (const abs of walkFiles(rootPath)) {
    const rel = path.relative(rootPath, abs);
    if (newSet.has(rel)) {
      continue;
    }
    if (isRetiredName(rel)) {
      retiredCandidates.push(rel);
    }
  }
  return { retiredCandidates: retiredCandidates.sort() };
}

/**
 * Run upgrade cleanup for an install root: offer to delete retired artifacts
 * only. Interactive runs ask for confirmation (with a keep option);
 * non-interactive and `--dry-run` runs list candidates without deleting.
 * Returns { retiredCandidates, deleted, kept }.
 */
export async function runUpgradeCleanup(rootPath, newRelPaths = [], { dryRun = false } = {}) {
  const { retiredCandidates } = computeCleanupCandidates(rootPath, newRelPaths);
  const result = { retiredCandidates, deleted: [], kept: [] };

  if (retiredCandidates.length === 0) {
    return result;
  }

  const interactive = process.stdin.isTTY && !dryRun;

  if (!interactive) {
    const verb = dryRun ? "would delete" : "found (non-interactive run — nothing deleted)";
    console.log(`[easyspec-init] upgrade cleanup: ${verb} ${retiredCandidates.length} retired easyspec file(s) under ${rootPath}:`);
    for (const rel of retiredCandidates) {
      console.log(`  - ${rel}`);
    }
    if (!dryRun) {
      result.kept.push(...retiredCandidates);
    }
    return result;
  }

  console.log(`[easyspec-init] upgrade cleanup: ${retiredCandidates.length} retired easyspec file(s) are no longer installed:`);
  for (const rel of retiredCandidates) {
    console.log(`  - ${rel}`);
  }

  const deleteAll = await confirm({
    message: `Delete all ${retiredCandidates.length} retired easyspec file(s)?`,
    initialValue: false,
  });
  if (!isCancel(deleteAll) && deleteAll) {
    for (const rel of retiredCandidates) {
      fs.rmSync(path.join(rootPath, rel));
      result.deleted.push(rel);
    }
  } else {
    for (const rel of retiredCandidates) {
      const answer = await confirm({
        message: `Delete retired easyspec file ${rel}?`,
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

  return result;
}
