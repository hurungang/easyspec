import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CONFIG_FILE_NAME,
  DEFAULT_DOCS_FOLDER,
  LEGACY_CONFIG_RELATIVE_PATH,
  getDocsFolder,
  migrateLegacyConfig,
  parseConfigYaml,
  readConfig,
  readLegacyConfig,
  renderMigratedConfigYaml,
  resolveDocsPaths,
  scaffoldConfig,
} from "../src/config.mjs";

function tmpWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "easyspec-config-"));
}

describe("config module", () => {
  it("parses the flat config shape (scalars, nested maps, lists)", () => {
    const config = parseConfigYaml(`docs_folder: my-docs

project:
  name: "sample"
  description: 'A project'

source:
  frontend: null
  backend: src/
  tests:
    - tests/
    - e2e/
`);
    assert.strictEqual(config.docs_folder, "my-docs");
    assert.strictEqual(config.project.name, "sample");
    assert.strictEqual(config.source.frontend, null);
    assert.strictEqual(config.source.backend, "src/");
    assert.deepStrictEqual(config.source.tests, ["tests/", "e2e/"]);
  });

  it("missing config is detectable as a fresh-install state", () => {
    const ws = tmpWorkspace();
    const result = readConfig(ws);
    assert.strictEqual(result.exists, false);
    assert.deepStrictEqual(result.config, {});
  });

  it("reads an existing config and resolves docs folder + paths", () => {
    const ws = tmpWorkspace();
    fs.writeFileSync(
      path.join(ws, CONFIG_FILE_NAME),
      "docs_folder: custom-docs\nproject:\n  name: x\n",
      "utf8"
    );
    const { exists, config } = readConfig(ws);
    assert.strictEqual(exists, true);
    assert.strictEqual(getDocsFolder(config), "custom-docs");

    const paths = resolveDocsPaths(ws, "custom-docs");
    assert.strictEqual(paths.masterDir, path.resolve(ws, "custom-docs", "master"));
    assert.strictEqual(paths.changesDir, path.resolve(ws, "custom-docs", "changes"));
  });

  it("falls back to the default docs folder", () => {
    assert.strictEqual(getDocsFolder({}), DEFAULT_DOCS_FOLDER);
    assert.strictEqual(getDocsFolder({ docs_folder: null }), DEFAULT_DOCS_FOLDER);
    assert.strictEqual(getDocsFolder({ docs_folder: "  " }), DEFAULT_DOCS_FOLDER);
  });

  it("scaffoldConfig creates the config with the docs folder when absent", () => {
    const ws = tmpWorkspace();
    const result = scaffoldConfig(ws, "docs-here");
    assert.strictEqual(result, "created");
    const content = fs.readFileSync(path.join(ws, CONFIG_FILE_NAME), "utf8");
    assert.ok(content.includes("docs_folder: docs-here"));

    // Second run does not clobber
    fs.writeFileSync(path.join(ws, CONFIG_FILE_NAME), "docs_folder: keep-me\n", "utf8");
    assert.strictEqual(scaffoldConfig(ws, "other"), "exists");
    assert.ok(fs.readFileSync(path.join(ws, CONFIG_FILE_NAME), "utf8").includes("keep-me"));
  });

  it("malformed config degrades to the default docs folder without throwing", () => {
    const ws = tmpWorkspace();
    fs.writeFileSync(path.join(ws, CONFIG_FILE_NAME), "::: not: valid: yaml [[[\n\x00\n", "utf8");
    const { exists, config } = readConfig(ws);
    assert.strictEqual(exists, true);
    // Documented behavior: unparsable content parses to {} and falls back to the
    // default docs folder rather than crashing (see test-plan edge-case note).
    assert.strictEqual(getDocsFolder(config), DEFAULT_DOCS_FOLDER);
    assert.strictEqual(resolveDocsPaths(ws, getDocsFolder(config)).docsFolder, DEFAULT_DOCS_FOLDER);
  });

  it("resolveDocsPaths handles a trailing slash in the docs folder (paths stay correct)", () => {
    const ws = tmpWorkspace();
    const paths = resolveDocsPaths(ws, "my-docs/");
    // Documented behavior: the folder string is trimmed at the ends but an
    // interior/inner trailing slash is kept; path.resolve still yields correct dirs.
    assert.strictEqual(paths.masterDir, path.resolve(ws, "my-docs/", "master"));
    assert.strictEqual(paths.changesDir, path.resolve(ws, "my-docs/", "changes"));
    assert.ok(paths.masterDir.endsWith(path.join("my-docs", "master")));
  });

  it("scaffoldConfig respects dry-run (writes nothing)", () => {
    const ws = tmpWorkspace();
    const result = scaffoldConfig(ws, DEFAULT_DOCS_FOLDER, { dryRun: true });
    assert.strictEqual(result, "dry-run");
    assert.strictEqual(fs.existsSync(path.join(ws, CONFIG_FILE_NAME)), false);
  });
});

describe("legacy config migration", () => {
  const legacyYaml = `# Change Lifecycle Configuration
# SUPERSEDED: legacy header

project:
  name: legacy-project
  description: "Kept as-is"

source:
  backend: src/
  tests:
    - tests/

conventions:
  - keep existing values
`;

  function writeLegacy(ws, content = legacyYaml) {
    const legacyPath = path.join(ws, LEGACY_CONFIG_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(legacyPath, content, "utf8");
    return legacyPath;
  }

  it("readLegacyConfig detects and parses docs/config.yaml", () => {
    const ws = tmpWorkspace();
    writeLegacy(ws);
    const legacy = readLegacyConfig(ws);
    assert.strictEqual(legacy.exists, true);
    assert.strictEqual(legacy.isEasyspecConfig, true);
    assert.strictEqual(legacy.config.project.name, "legacy-project");
    assert.strictEqual(legacy.config.source.backend, "src/");
    assert.deepStrictEqual(legacy.config.source.tests, ["tests/"]);
    assert.deepStrictEqual(legacy.config.conventions, ["keep existing values"]);
  });

  it("does not treat another tool's docs/config.yaml as an easyspec config", () => {
    const ws = tmpWorkspace();
    writeLegacy(ws, "tool:\n  name: other-tool\n  output: build/\n");
    const legacy = readLegacyConfig(ws);
    assert.strictEqual(legacy.exists, true);
    assert.strictEqual(legacy.isEasyspecConfig, false);

    const result = migrateLegacyConfig(ws);
    assert.strictEqual(result.migrated, false);
    assert.strictEqual(result.reason, "not-easyspec-config");
    assert.ok(fs.existsSync(path.join(ws, LEGACY_CONFIG_RELATIVE_PATH)));
    assert.strictEqual(fs.existsSync(path.join(ws, CONFIG_FILE_NAME)), false);
  });

  it("readLegacyConfig reports a missing legacy config without throwing", () => {
    const ws = tmpWorkspace();
    const legacy = readLegacyConfig(ws);
    assert.strictEqual(legacy.exists, false);
    assert.deepStrictEqual(legacy.config, {});
    assert.strictEqual(legacy.content, null);
  });

  it("renderMigratedConfigYaml preserves the body and adds docs_folder: docs", () => {
    const rendered = renderMigratedConfigYaml(legacyYaml);
    assert.ok(rendered.startsWith("# easyspec:managed v1"));
    assert.ok(rendered.includes("docs_folder: docs"));
    assert.ok(rendered.includes("name: legacy-project"));
    assert.ok(rendered.includes("keep existing values"));
    assert.ok(!rendered.includes("SUPERSEDED"), "legacy header should be replaced");
    assert.strictEqual((rendered.match(/docs_folder:/g) || []).length, 1);
  });

  it("migrateLegacyConfig writes the root config and removes docs/config.yaml", () => {
    const ws = tmpWorkspace();
    const legacyPath = writeLegacy(ws);

    const result = migrateLegacyConfig(ws);
    assert.strictEqual(result.migrated, true);
    assert.strictEqual(result.reason, "migrated");
    assert.strictEqual(result.docsFolder, "docs");

    const rootPath = path.join(ws, CONFIG_FILE_NAME);
    assert.ok(fs.existsSync(rootPath));
    const rootConfig = readConfig(ws);
    assert.strictEqual(rootConfig.exists, true);
    assert.strictEqual(getDocsFolder(rootConfig.config), "docs");
    assert.strictEqual(rootConfig.config.project.name, "legacy-project");
    assert.strictEqual(fs.existsSync(legacyPath), false);
  });

  it("migrateLegacyConfig never overwrites an existing root config", () => {
    const ws = tmpWorkspace();
    writeLegacy(ws);
    fs.writeFileSync(path.join(ws, CONFIG_FILE_NAME), "docs_folder: keep-me\n", "utf8");

    const result = migrateLegacyConfig(ws);
    assert.strictEqual(result.migrated, false);
    assert.strictEqual(result.reason, "root-config-exists");
    assert.ok(fs.readFileSync(path.join(ws, CONFIG_FILE_NAME), "utf8").includes("keep-me"));
    assert.ok(fs.existsSync(path.join(ws, LEGACY_CONFIG_RELATIVE_PATH)));
  });

  it("migrateLegacyConfig dry-run writes and deletes nothing", () => {
    const ws = tmpWorkspace();
    writeLegacy(ws);

    const result = migrateLegacyConfig(ws, { dryRun: true });
    assert.strictEqual(result.migrated, true);
    assert.strictEqual(fs.existsSync(path.join(ws, CONFIG_FILE_NAME)), false);
    assert.ok(fs.existsSync(path.join(ws, LEGACY_CONFIG_RELATIVE_PATH)));
  });

  it("migrateLegacyConfig reports no-legacy-config when nothing exists", () => {
    const ws = tmpWorkspace();
    const result = migrateLegacyConfig(ws);
    assert.strictEqual(result.migrated, false);
    assert.strictEqual(result.reason, "no-legacy-config");
  });
});
