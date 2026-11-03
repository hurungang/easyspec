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
      : "---\nname: es-change-init\n---\n\nold untagged file\n";
    fs.writeFileSync(path.join(commandsDir, "es-change-init.md"), content, "utf8");
  }

  it("classifies retired names as retiredCandidates regardless of tag", () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const { candidates, retiredCandidates } = computeCleanupCandidates(toolRoot, []);
    assert.deepStrictEqual(candidates, []);
    assert.deepStrictEqual(retiredCandidates, ["commands/es-change-init.md"]);
  });

  it("classifies untagged retired names as retiredCandidates too", () => {
    seedRetired(false);
    const toolRoot = path.join(tmpDir, ".opencode");
    const { candidates, retiredCandidates } = computeCleanupCandidates(toolRoot, []);
    assert.deepStrictEqual(candidates, []);
    assert.deepStrictEqual(retiredCandidates, ["commands/es-change-init.md"]);
  });

  it("old-manifest entries that vanish from the new version become tag-verified candidates", () => {
    setupTmp();
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
    assert.deepStrictEqual(candidates, [legacyRel]);
  });

  it("non-interactive run lists retired names without deleting", async () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const target = path.join(toolRoot, "commands", "es-change-init.md");
    const result = await runUpgradeCleanup(toolRoot, []);
    assert.deepStrictEqual(result.retiredCandidates, ["commands/es-change-init.md"]);
    assert.deepStrictEqual(result.deleted, []);
    assert.deepStrictEqual(result.kept, ["commands/es-change-init.md"]);
    assert.strictEqual(fs.existsSync(target), true, "non-interactive run deletes nothing");
  });

  it("dry-run cleanup deletes nothing", async () => {
    seedRetired(true);
    const toolRoot = path.join(tmpDir, ".opencode");
    const target = path.join(toolRoot, "commands", "es-change-init.md");
    const result = await runUpgradeCleanup(toolRoot, [], { dryRun: true });
    assert.strictEqual(result.retiredCandidates.length, 1);
    assert.deepStrictEqual(result.deleted, []);
    assert.strictEqual(fs.existsSync(target), true);
  });
});

describe("pre-manifest legacy cleanup", () => {
  function seedLegacy() {
    setupTmp();
    const commandsDir = path.join(tmpDir, ".opencode", "commands");
    fs.mkdirSync(commandsDir, { recursive: true });
    // Untagged files from an install that predates the manifest and ownership tags.
    fs.writeFileSync(path.join(commandsDir, "es-change-init.md"), "---\nname: es-change-init\n---\n", "utf8");
    fs.writeFileSync(path.join(commandsDir, "es-change-review.md"), "---\nname: es-change-review\n---\n", "utf8");
    fs.writeFileSync(path.join(commandsDir, "es-old-helper.md"), "---\nname: es-old-helper\n---\n", "utf8");
    fs.writeFileSync(path.join(commandsDir, "my-custom.md"), "user file\n", "utf8");
  }

  it("separates retired names from the broad es-* scan when no manifest exists", () => {
    seedLegacy();
    const toolRoot = path.join(tmpDir, ".opencode");
    const { manifestFound, candidates, retiredCandidates, legacyCandidates } = computeCleanupCandidates(toolRoot, []);

    assert.strictEqual(manifestFound, false);
    assert.deepStrictEqual(candidates, []);
    assert.deepStrictEqual(retiredCandidates, [
      "commands/es-change-init.md",
      "commands/es-change-review.md",
    ]);
    assert.deepStrictEqual(legacyCandidates, ["commands/es-old-helper.md"]);
    assert.ok(!legacyCandidates.includes("commands/my-custom.md"), "non-es user files are ignored");
  });

  it("still surfaces retired-name untagged artifacts when a manifest exists", () => {
    seedLegacy();
    const toolRoot = path.join(tmpDir, ".opencode");
    fs.mkdirSync(path.join(toolRoot, ".easyspec"), { recursive: true });
    fs.writeFileSync(
      manifestPath(toolRoot),
      JSON.stringify({ version: 1, installedAt: "2020-01-01T00:00:00Z", files: [] }),
      "utf8"
    );

    const { retiredCandidates, legacyCandidates } = computeCleanupCandidates(toolRoot, []);
    assert.deepStrictEqual(retiredCandidates, [
      "commands/es-change-init.md",
      "commands/es-change-review.md",
    ]);
    // With a manifest present, the broad es-* scan is disabled, so the
    // non-retired es-old-helper.md is not surfaced.
    assert.deepStrictEqual(legacyCandidates, []);
  });

  it("non-interactive cleanup lists retired and legacy candidates without deleting", async () => {
    seedLegacy();
    const toolRoot = path.join(tmpDir, ".opencode");
    const retiredTarget = path.join(toolRoot, "commands", "es-change-init.md");
    const helperTarget = path.join(toolRoot, "commands", "es-old-helper.md");

    const result = await runUpgradeCleanup(toolRoot, []);
    assert.deepStrictEqual(result.retiredCandidates, [
      "commands/es-change-init.md",
      "commands/es-change-review.md",
    ]);
    assert.deepStrictEqual(result.deleted, []);
    assert.deepStrictEqual(result.kept, [
      "commands/es-change-init.md",
      "commands/es-change-review.md",
      "commands/es-old-helper.md",
    ]);
    assert.strictEqual(fs.existsSync(retiredTarget), true, "non-interactive deletes nothing");
    assert.strictEqual(fs.existsSync(helperTarget), true);
  });
});

describe("retired names and flat-layout roots", () => {
  it("detects es-change-review as a retired name (tagged or untagged)", () => {
    setupTmp();
    const commandsDir = path.join(tmpDir, ".opencode", "commands");
    fs.mkdirSync(commandsDir, { recursive: true });
    fs.writeFileSync(
      path.join(commandsDir, "es-change-review.md"),
      `---\nname: es-change-review\n---\n\nold prompt\n\n<!-- ${OWNERSHIP_MARKER} -->\n`,
      "utf8"
    );
    const { retiredCandidates } = computeCleanupCandidates(path.join(tmpDir, ".opencode"), []);
    assert.deepStrictEqual(retiredCandidates, ["commands/es-change-review.md"]);
  });

  it("surfaces untagged es- prompts in a flat prompt directory", () => {
    setupTmp();
    const promptsDir = path.join(tmpDir, "prompts");
    fs.mkdirSync(promptsDir, { recursive: true });
    fs.writeFileSync(path.join(promptsDir, "es-old-thing.prompt.md"), "---\nname: es-old-thing\n---\n", "utf8");
    fs.writeFileSync(path.join(promptsDir, "my-prompt.prompt.md"), "user prompt\n", "utf8");

    const { candidates, legacyCandidates } = computeCleanupCandidates(promptsDir, [], { layout: "flat" });
    assert.deepStrictEqual(candidates, []);
    assert.deepStrictEqual(legacyCandidates, ["es-old-thing.prompt.md"]);
  });

  function copilotUserPromptDir(homeDir) {
    if (process.platform === "win32") {
      const appData = process.env.APPDATA;
      return appData ? path.join(appData, "Code", "User", "prompts") : null;
    }
    if (process.platform === "darwin") {
      return path.join(homeDir, "Library", "Application Support", "Code", "User", "prompts");
    }
    return path.join(homeDir, ".config", "Code", "User", "prompts");
  }

  it("copilot global install records a separate prompts manifest and keeps stale retired prompts non-interactively", { skip: process.platform === "win32" }, () => {
    setupTmp();
    const promptDir = copilotUserPromptDir(fakeHome);
    assert.ok(promptDir, "unable to resolve copilot user prompt dir");
    fs.mkdirSync(promptDir, { recursive: true });
    fs.rmSync(path.join(promptDir, ".easyspec"), { recursive: true, force: true });
    const stale = path.join(promptDir, "es-change-review.prompt.md");
    fs.writeFileSync(stale, "---\nname: es-change-review\n---\n", "utf8");

    runCli("init --scope global --agent copilot --force --no-model-prompt 2>/dev/null");

    // Non-interactive run deletes nothing; the stale retired prompt is kept but
    // the external prompts root still gets its own manifest.
    assert.strictEqual(fs.existsSync(stale), true, "non-interactive run must not delete");

    const manifest = readManifest(promptDir);
    assert.ok(manifest, "copilot global prompts dir should get its own manifest");
    assert.ok(manifest.files.some((f) => f.path === "es-init.prompt.md"), "es-init prompt recorded in prompts manifest");
    assert.ok(!manifest.files.some((f) => f.path === "es-change-review.prompt.md"), "stale prompt not in new manifest");
  });
});
