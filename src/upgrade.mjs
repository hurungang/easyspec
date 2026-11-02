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
 * Safety rule: untagged files are never deleted. A file is a deletion
 * candidate only when it is (a) in the old manifest or matches a retired
 * artifact name, (b) no longer produced by the new version, and (c) verified
 * to carry the ownership tag on disk — and even then only after the user
 * confirms.
 */

export const MANIFEST_DIR = ".easyspec";
export const MANIFEST_FILE = "manifest.json";

/** Artifact name patterns retired from the kit (candidates for upgrade cleanup). */
export const RETIRED_ARTIFACT_PATTERNS = [/^es-change-init\./];

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
 * Compute deletion candidates: files present on disk, not part of the new
 * artifact set, retired or listed in the old manifest, and verified tagged.
 */
export function computeCleanupCandidates(rootPath, newRelPaths) {
  const newSet = new Set(newRelPaths);
  const oldManifest = readManifest(rootPath);
  const oldPaths = new Set((oldManifest?.files || []).map((f) => f.path));

  const candidates = [];
  const seen = new Set();
  for (const abs of walkFiles(rootPath)) {
    const rel = path.relative(rootPath, abs);
    if (seen.has(rel) || newSet.has(rel)) {
      continue;
    }
    seen.add(rel);
    const inOldManifest = oldPaths.has(rel);
    const retired = isRetiredName(rel);
    if (!inOldManifest && !retired) {
      continue;
    }
    if (fileHasTag(abs)) {
      candidates.push(rel);
    }
  }
  return { manifestFound: oldManifest !== null, candidates: candidates.sort() };
}

/**
 * Run upgrade cleanup for an install root.
 * - Non-interactive or --dry-run: lists candidates without deleting.
 * - Interactive: batch confirm, then per-file confirm with keep option.
 * Returns { manifestFound, candidates, deleted, kept }.
 */
export async function runUpgradeCleanup(rootPath, newRelPaths, { dryRun = false } = {}) {
  const { manifestFound, candidates } = computeCleanupCandidates(rootPath, newRelPaths);
  const result = { manifestFound, candidates, deleted: [], kept: [] };

  if (candidates.length === 0) {
    return result;
  }

  const interactive = process.stdin.isTTY && !dryRun;

  if (!interactive) {
    const verb = dryRun ? "would delete" : "found (non-interactive run — nothing deleted)";
    console.log(`[easyspec-init] upgrade cleanup: ${verb} ${candidates.length} obsolete tagged file(s) under ${rootPath}:`);
    for (const rel of candidates) {
      console.log(`  - ${rel}`);
    }
    if (!dryRun) {
      result.kept = candidates.slice();
    }
    return result;
  }

  console.log(`[easyspec-init] upgrade cleanup: ${candidates.length} obsolete tagged easyspec file(s) no longer installed:`);
  for (const rel of candidates) {
    console.log(`  - ${rel}`);
  }

  const deleteAll = await confirm({
    message: `Delete all ${candidates.length} obsolete tagged easyspec file(s)? (untagged files are never touched)`,
    initialValue: false,
  });
  if (!isCancel(deleteAll) && deleteAll) {
    for (const rel of candidates) {
      fs.rmSync(path.join(rootPath, rel));
      result.deleted.push(rel);
    }
    return result;
  }

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

  return result;
}
