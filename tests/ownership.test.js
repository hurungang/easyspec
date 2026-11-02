import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  OWNERSHIP_MARKER,
  OWNERSHIP_TAG,
  OWNERSHIP_TAG_YAML,
  embedTag,
  fileHasTag,
  hasTag,
} from "../src/ownership.mjs";

function tmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "easyspec-own-"));
  const filePath = path.join(dir, "artifact.md");
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

describe("ownership tag helpers", () => {
  it("round-trips embed then detect on sample markdown", () => {
    const content = "# Title\n\nSome body text.\n";
    const tagged = embedTag(content);
    assert.ok(hasTag(tagged), "tagged content should be detected");
    assert.ok(tagged.includes(OWNERSHIP_TAG));
    assert.strictEqual(hasTag(content), false, "untagged content stays untagged");
  });

  it("embedding is idempotent", () => {
    const once = embedTag("# Doc\n");
    const twice = embedTag(once);
    assert.strictEqual(once, twice);
    assert.strictEqual((once.match(new RegExp(OWNERSHIP_MARKER, "g")) || []).length, 1);
  });

  it("embeds after frontmatter so the tag survives rendering", () => {
    const content = "---\nname: es-x\ndescription: y\n---\n\nBody here.\n";
    const tagged = embedTag(content);
    assert.ok(tagged.startsWith("---\nname: es-x"));
    assert.ok(tagged.indexOf(OWNERSHIP_TAG) > tagged.indexOf("\n---\n"));
  });

  it("detects the tag in any target-tool text format", () => {
    for (const content of [
      `# comment\n${OWNERSHIP_TAG}\nbody`,
      `---\nname: x\n---\n${OWNERSHIP_TAG}\nbody`,
      `text ${OWNERSHIP_TAG_YAML}\n`,
    ]) {
      assert.ok(hasTag(content));
    }
    assert.strictEqual(hasTag("plain user file, no marker"), false);
  });

  it("fileHasTag works on disk and treats missing files as untagged", () => {
    const taggedPath = tmpFile(`doc\n\n${OWNERSHIP_TAG}\n`);
    const untaggedPath = tmpFile("user content\n");
    assert.strictEqual(fileHasTag(taggedPath), true);
    assert.strictEqual(fileHasTag(untaggedPath), false);
    assert.strictEqual(fileHasTag(path.join(os.tmpdir(), "easyspec-does-not-exist.md")), false);
  });
});
