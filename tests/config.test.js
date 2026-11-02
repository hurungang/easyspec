import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CONFIG_FILE_NAME,
  DEFAULT_DOCS_FOLDER,
  getDocsFolder,
  parseConfigYaml,
  readConfig,
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
