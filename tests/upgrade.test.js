import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { CONFIG_FILE_NAME, DEFAULT_DOCS_FOLDER } from "../src/config.mjs";
import { OWNERSHIP_MARKER } from "../src/ownership.mjs";
import {
  computeCleanupCandidates,
  manifestPath,
  readManifest,
  runUpgradeCleanup,
} from "../src/upgrade.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cliPath = path.join(rootDir, "bin", "easyspec-init.js");
const tmpDir = path.join(rootDir, "tests", ".tmp-upgrade");
const fakeHome = path.join(rootDir, "tests", ".fakehome");

function runCli(args) {
  return execSync(`node "${cliPath}" ${args}`, {
    cwd: tmpDir,
    encoding: "utf8",
    env: { ...process.env, HOME: fakeHome },
  });
}

function setupTmp() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
}

function* filesUnder(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      yield* filesUnder(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

const AGENT_COUNT = 7;
const PROMPT_COUNT = 8;
const INSTALLED_COUNT = AGENT_COUNT + PROMPT_COUNT + 1; // + skill

describe("install tagging, config scaffolding, and manifest", () => {
  it("opencode project install tags every file, scaffolds config, writes manifest", () => {
    setupTmp();
    // Pre-existing third-party docs folder must stay untouched.
    const docsDir = path.join(tmpDir, "docs");
    fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, "user-notes.md"), "user content, no tag\n", "utf8");

    const output = runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");
    assert.ok(output.includes(`created ${CONFIG_FILE_NAME}`), "config scaffolded");
    assert.ok(output.includes(`docs folder: ${DEFAULT_DOCS_FOLDER}`));

    const config = fs.readFileSync(path.join(tmpDir, CONFIG_FILE_NAME), "utf8");
    assert.ok(config.includes(`docs_folder: ${DEFAULT_DOCS_FOLDER}`));
    assert.ok(config.includes(OWNERSHIP_MARKER), "config carries ownership tag");

    const toolRoot = path.join(tmpDir, ".opencode");
    let tagged = 0;
    let total = 0;
    for (const file of filesUnder(toolRoot)) {
      if (file.includes(".easyspec")) continue;
      total += 1;
      if (fs.readFileSync(file, "utf8").includes(OWNERSHIP_MARKER)) {
        tagged += 1;
      }
    }
    assert.strictEqual(total, INSTALLED_COUNT, `expected ${INSTALLED_COUNT} installed files`);
    assert.strictEqual(tagged, INSTALLED_COUNT, "every installed file carries the ownership tag");

    const manifest = readManifest(toolRoot);
    assert.ok(manifest, "manifest written");
    assert.strictEqual(manifest.files.length, INSTALLED_COUNT);

    const userNotes = fs.readFileSync(path.join(docsDir, "user-notes.md"), "utf8");
    assert.strictEqual(userNotes, "user content, no tag\n", "pre-existing docs/ folder untouched");
  });

  it("all three tool profiles produce only tagged files", () => {
    setupTmp();
    for (const agent of ["copilot", "opencode", "claude-code"]) {
      runCli(`init --scope project --agent ${agent} --force --no-model-prompt 2>/dev/null`);
    }
    for (const toolDir of [".github", ".opencode", ".claude"]) {
      for (const file of filesUnder(path.join(tmpDir, toolDir))) {
        if (file.includes(".easyspec")) continue;
        const content = fs.readFileSync(file, "utf8");
        assert.ok(
          content.includes(OWNERSHIP_MARKER),
          `untagged installed file: ${path.relative(tmpDir, file)}`
        );
      }
    }
  });

  it("dry-run writes nothing; re-install refreshes the manifest", () => {
    setupTmp();
    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");
    const toolRoot = path.join(tmpDir, ".opencode");
    const manifestFile = manifestPath(toolRoot);
    const before = fs.readFileSync(manifestFile, "utf8");

    runCli("init --scope project --agent opencode --dry-run --no-model-prompt");
    assert.strictEqual(fs.readFileSync(manifestFile, "utf8"), before, "dry-run left manifest untouched");

    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    assert.strictEqual(manifest.files.length, INSTALLED_COUNT, "re-install updated the manifest");
  });

  it("global scope does not create a project config", () => {
    setupTmp();
    runCli("init --scope global --agent opencode --force --no-model-prompt 2>/dev/null");
    assert.strictEqual(fs.existsSync(path.join(tmpDir, CONFIG_FILE_NAME)), false);
  });

  it("pre-existing config with a custom docs folder is honored; no easyspec-docs is created", () => {
    setupTmp();
    fs.writeFileSync(
      path.join(tmpDir, CONFIG_FILE_NAME),
      "docs_folder: my-docs\nproject:\n  name: x\n",
      "utf8"
    );
    const output = runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");
    assert.ok(output.includes("docs folder: my-docs"), `expected custom docs folder in output, got: ${output}`);
    assert.strictEqual(fs.existsSync(path.join(tmpDir, "easyspec-docs")), false, "default folder must not be created");
    const config = fs.readFileSync(path.join(tmpDir, CONFIG_FILE_NAME), "utf8");
    assert.ok(config.includes("docs_folder: my-docs"), "existing config not clobbered");
  });

  it("malformed config does not crash init and falls back to the default docs folder", () => {
    setupTmp();
    fs.writeFileSync(path.join(tmpDir, CONFIG_FILE_NAME), "::: not: valid: yaml [[[\n", "utf8");
    const output = runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");
    assert.ok(output.includes(`docs folder: ${DEFAULT_DOCS_FOLDER}`));
  });

  it("install renders es-init and leaves no es-change-init artifact for every profile", () => {
    setupTmp();
    const roots = { copilot: ".github", opencode: ".opencode", "claude-code": ".claude" };
    for (const agent of Object.keys(roots)) {
      runCli(`init --scope project --agent ${agent} --force --no-model-prompt 2>/dev/null`);
    }
    for (const [agent, toolDir] of Object.entries(roots)) {
      const toolRoot = path.join(tmpDir, toolDir);
      const esInit = [];
      const esChangeInit = [];
      for (const file of filesUnder(toolRoot)) {
        const base = path.basename(file);
        if (base.startsWith("es-init")) esInit.push(file);
        if (base.startsWith("es-change-init")) esChangeInit.push(file);
      }
      assert.ok(esInit.length > 0, `${agent}: no es-init artifact installed`);
      assert.deepStrictEqual(esChangeInit, [], `${agent}: es-change-init artifacts remain`);
    }
  });
});

describe("upgrade cleanup", () => {
  function seedRetired(tagged) {
    setupTmp();
    const commandsDir = path.join(tmpDir, ".opencode", "commands");
    fs.mkdirSync(commandsDir, { recursive: true });
    const content = tagged
      ? `---\nname: es-change-init\n---\n\nold prompt\n\n<!-- ${OWNERSHIP_MARKER} -->\n`
      : "---\nname: es-change-init\n---\n\nuser-renamed file, never delete\n";
    fs.writeFileSync(path.join(commandsDir, "es-change-init.md"), content, "utf8");
  }

  it("detects retired tagged artifacts as candidates and skips untagged same-named files", () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const { candidates } = computeCleanupCandidates(toolRoot, []);
    assert.deepStrictEqual(candidates, ["commands/es-change-init.md"]);
  });

  it("never treats untagged same-named files as candidates", () => {
    seedRetired(false);
    const toolRoot = path.join(tmpDir, ".opencode");
    const { candidates } = computeCleanupCandidates(toolRoot, []);
    assert.deepStrictEqual(candidates, []);
  });

  it("old-manifest entries that vanish from the new version become candidates when tagged", () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const legacyRel = "agents/es-legacy.md";
    fs.mkdirSync(path.join(toolRoot, "agents"), { recursive: true });
    fs.writeFileSync(
      path.join(toolRoot, legacyRel),
      `old agent\n\n<!-- ${OWNERSHIP_MARKER} -->\n`,
      "utf8"
    );
    fs.mkdirSync(path.join(toolRoot, ".easyspec"), { recursive: true });
    fs.writeFileSync(
      manifestPath(toolRoot),
      JSON.stringify({ version: 1, installedAt: "2020-01-01T00:00:00Z", files: [{ path: legacyRel, hash: "x" }] }),
      "utf8"
    );
    const { candidates } = computeCleanupCandidates(toolRoot, []);
    assert.ok(candidates.includes(legacyRel), "manifest-listed tagged file is a candidate");
    assert.ok(candidates.includes("commands/es-change-init.md"), "retired tagged file is a candidate");
  });

  it("non-interactive cleanup lists candidates without deleting", async () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const target = path.join(toolRoot, "commands", "es-change-init.md");
    const result = await runUpgradeCleanup(toolRoot, []);
    assert.deepStrictEqual(result.candidates, ["commands/es-change-init.md"]);
    assert.deepStrictEqual(result.deleted, []);
    assert.deepStrictEqual(result.kept, ["commands/es-change-init.md"], "non-interactive run keeps the file (keep option)");
    assert.strictEqual(fs.existsSync(target), true, "non-interactive run deletes nothing");
  });

  it("dry-run cleanup deletes nothing", async () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const target = path.join(toolRoot, "commands", "es-change-init.md");
    const result = await runUpgradeCleanup(toolRoot, [], { dryRun: true });
    assert.strictEqual(result.candidates.length, 1);
    assert.strictEqual(fs.existsSync(target), true);
  });
});
