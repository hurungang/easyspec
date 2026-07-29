import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const templatesDir = path.join(rootDir, "templates");
const contentDir = path.join(templatesDir, "content");
const cliPath = path.join(rootDir, "bin", "easyspec-init.js");

const AGENTS = [
  "es-architect",
  "es-database-designer",
  "es-developer",
  "es-document-reviewer",
  "es-product-owner",
  "es-tester",
  "es-ux-specialist",
];

const PROMPTS = [
  "es-change-apply",
  "es-change-fix",
  "es-change-init",
  "es-change-propose",
  "es-change-refinement",
  "es-change-review",
  "es-change-update-master",
];

function readFile(...segments) {
  return fs.readFileSync(path.join(...segments), "utf8");
}

function fileExists(...segments) {
  return fs.existsSync(path.join(...segments));
}

// ——— Template Structure Tests ———

describe("template structure", () => {
  it("content directory exists with agents, prompts, skills", () => {
    assert.ok(fileExists(contentDir, "agents"));
    assert.ok(fileExists(contentDir, "prompts"));
    assert.ok(fileExists(contentDir, "skills"));
  });

  it("all content agent body files exist", () => {
    for (const agent of AGENTS) {
      assert.ok(
        fileExists(contentDir, "agents", `${agent}.body.md`),
        `missing ${agent}.body.md`
      );
    }
  });

  it("all content prompt body files exist", () => {
    for (const prompt of PROMPTS) {
      assert.ok(
        fileExists(contentDir, "prompts", `${prompt}.body.md`),
        `missing ${prompt}.body.md`
      );
    }
  });

  it("skill body and template exist", () => {
    assert.ok(fileExists(contentDir, "skills", "es-change-lifecycle", "SKILL.body.md"));
    assert.ok(fileExists(contentDir, "skills", "es-change-lifecycle", "SKILL.md"));
  });
});

// ——— Template Integrity ———

describe("template integrity", () => {
  const tools = ["copilot", "opencode"];

  for (const tool of tools) {
    it(`${tool} has all agent templates`, () => {
      for (const agent of AGENTS) {
        assert.ok(
          fileExists(templatesDir, tool, "agents", `${agent}.agent.md`),
          `${tool}: missing ${agent}.agent.md`
        );
      }
    });

    it(`${tool} has all prompt templates`, () => {
      for (const prompt of PROMPTS) {
        assert.ok(
          fileExists(templatesDir, tool, "prompts", `${prompt}.prompt.md`),
          `${tool}: missing ${prompt}.prompt.md`
        );
      }
    });

    it(`${tool} templates have {{body}} marker`, () => {
      for (const agent of AGENTS) {
        const tmpl = readFile(templatesDir, tool, "agents", `${agent}.agent.md`);
        assert.ok(
          tmpl.includes("{{body}}"),
          `${tool}/${agent}.agent.md missing {{body}} marker`
        );
      }
      for (const prompt of PROMPTS) {
        const tmpl = readFile(templatesDir, tool, "prompts", `${prompt}.prompt.md`);
        assert.ok(
          tmpl.includes("{{body}}"),
          `${tool}/${prompt}.prompt.md missing {{body}} marker`
        );
      }
    });
  }
});

// ——— Template Rendering ———

describe("template rendering", () => {
  function renderTemplate(tool, type, name) {
    const ext = type === "agents" ? ".agent.md" : ".prompt.md";
    const template = readFile(templatesDir, tool, type, `${name}${ext}`);
    const body = readFile(contentDir, type, `${name}.body.md`).trimEnd();
    return template.replace("{{body}}", body);
  }

  it("renders copilot agent with all frontmatter fields", () => {
    const rendered = renderTemplate("copilot", "agents", "es-architect");
    assert.ok(rendered.startsWith("---\n"));
    assert.ok(rendered.includes("model:"));
    assert.ok(rendered.includes("tools:"));
    assert.ok(rendered.includes("description:"));
    assert.ok(rendered.includes("es-Architect Agent"));
  });

  it("renders opencode agent without model or tools fields", () => {
    const rendered = renderTemplate("opencode", "agents", "es-architect");
    assert.ok(rendered.startsWith("---\nname: es-architect"));
    assert.ok(!rendered.includes("model:"));
    assert.ok(!rendered.includes("tools:"));
    assert.ok(rendered.includes("description:"));
    assert.ok(rendered.includes("es-Architect Agent"));
  });

  it("renders opencode prompt without model or tools", () => {
    const rendered = renderTemplate("opencode", "prompts", "es-change-init");
    assert.ok(rendered.startsWith("---\nname: es-change-init"));
    assert.ok(!rendered.includes("model:"));
    assert.ok(!rendered.includes("tools:"));
  });

  it("copilot agent body content equals opencode agent body content", () => {
    for (const agent of AGENTS) {
      const cBody = readFile(contentDir, "agents", `${agent}.body.md`);
      const oBody = readFile(contentDir, "agents", `${agent}.body.md`);
      assert.strictEqual(cBody, oBody, `${agent}: body content differs between tools`);
    }
  });

  it("all agent body files contain non-empty instruction content", () => {
    for (const agent of AGENTS) {
      const body = readFile(contentDir, "agents", `${agent}.body.md`);
      assert.ok(body.length > 100, `${agent}: body too short (${body.length} chars)`);
    }
  });

  it("all prompt body files contain non-empty instruction content", () => {
    for (const prompt of PROMPTS) {
      const body = readFile(contentDir, "prompts", `${prompt}.body.md`);
      assert.ok(body.length > 100, `${prompt}: body too short (${body.length} chars)`);
    }
  });
});

// ——— Cross-Reference Consistency ———

describe("cross-reference consistency", () => {
  it("all agent references in body content use es- prefix (kebab-case)", () => {
    const bodyFiles = [
      ...AGENTS.map((a) => path.join(contentDir, "agents", `${a}.body.md`)),
      ...PROMPTS.map((p) => path.join(contentDir, "prompts", `${p}.body.md`)),
      path.join(contentDir, "skills", "es-change-lifecycle", "SKILL.body.md"),
    ];

    const unprefixed = /\*\*(architect|database-designer|developer|document-reviewer|product-owner|tester|ux-specialist)\s+agent\*\*/gi;

    for (const file of bodyFiles) {
      const content = readFile(file);
      const matches = [...content.matchAll(unprefixed)];
      assert.strictEqual(
        matches.length,
        0,
        `${path.basename(file)}: found ${matches.length} unprefixed agent reference(s): ${matches.map((m) => m[0]).join(", ")}`
      );
    }
  });

  it("all command references use kebab-case es-change- prefix (not colon)", () => {
    const bodyFiles = PROMPTS.map((p) => path.join(contentDir, "prompts", `${p}.body.md`));

    for (const file of bodyFiles) {
      const content = readFile(file);
      const colonRefs = content.match(/\/es-change:/g);
      assert.strictEqual(
        colonRefs?.length ?? 0,
        0,
        `${path.basename(file)}: found colon-based command reference(s)`
      );
    }
  });

  it("YAML agents_complete uses es- prefixed kebab-case names", () => {
    const skillBody = readFile(contentDir, "skills", "es-change-lifecycle", "SKILL.body.md");
    const badYaml = /(?<!es-)architect:|(?<!es-)product.owner:|(?<!es-)database.designer:|(?<!es-)document.reviewer:|(?<!es-)developer:|(?<!es-)tester:|(?<!es-)ux.specialist:/gi;
    const matches = [...skillBody.matchAll(badYaml)];
    assert.strictEqual(matches.length, 0,
      `SKILL.body.md: unprefixed agent in YAML: ${matches.map((m) => m[0]).join(", ")}`);
  });
});

// ——— CLI End-to-End Tests ———

describe("CLI e2e", () => {
  const tmpDir = path.join(rootDir, "tests", ".tmp");

  function runCli(args) {
    return execSync(`node "${cliPath}" ${args}`, {
      cwd: tmpDir,
      encoding: "utf8",
      env: { ...process.env, HOME: path.join(rootDir, "tests", ".fakehome") },
    });
  }

  function setupTmp() {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, "tests", ".fakehome"), { recursive: true });
  }

  it("copilot dry-run install succeeds and reports correct counts", () => {
    setupTmp();
    const output = runCli("init --scope project --agent copilot --dry-run --no-model-prompt");
    assert.ok(output.includes("copied=15"), "should copy 15 files (7 agents + 7 prompts + 1 skill)");
    assert.ok(output.includes("agent target: copilot"));
    assert.ok(output.includes("template profile: copilot"));
  });

  it("opencode dry-run install succeeds and reports correct counts", () => {
    setupTmp();
    const output = runCli("init --scope project --agent opencode --dry-run --no-model-prompt");
    assert.ok(output.includes("copied=15"), "should copy 15 files");
    assert.ok(output.includes("agent target: opencode"));
    assert.ok(output.includes("template profile: opencode"));
  });

  it("opencode installed agents have no model or tools fields", () => {
    setupTmp();
    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");

    for (const agent of AGENTS) {
      const filePath = path.join(tmpDir, ".opencode", "agents", `${agent}.agent.md`);
      assert.ok(fs.existsSync(filePath), `missing ${agent}.agent.md`);
      const content = readFile(filePath);
      assert.ok(!content.includes("model:"), `${agent}: should not have model field`);
      assert.ok(!content.includes("tools:"), `${agent}: should not have tools field`);
      assert.ok(content.includes("name:"), `${agent}: should have name field`);
      assert.ok(content.includes("description:"), `${agent}: should have description field`);
    }
  });

  it("copilot installed agents have model and tools fields", () => {
    setupTmp();
    runCli("init --scope project --agent copilot --force --no-model-prompt 2>/dev/null");

    for (const agent of AGENTS) {
      const filePath = path.join(tmpDir, ".copilot", "agents", `${agent}.agent.md`);
      assert.ok(fs.existsSync(filePath), `missing ${agent}.agent.md`);
      const content = readFile(filePath);
      assert.ok(content.includes("model:"), `${agent}: should have model field`);
      assert.ok(content.includes("tools:"), `${agent}: should have tools field`);
    }
  });

  it("installed skill exists and has correct frontmatter", () => {
    setupTmp();
    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");

    const skillPath = path.join(tmpDir, ".opencode", "skills", "es-change-lifecycle", "SKILL.md");
    assert.ok(fs.existsSync(skillPath), "skill not installed");

    const content = readFile(skillPath);
    assert.ok(content.includes("name: es-change-lifecycle"));
    assert.ok(content.includes("description:"));
    assert.ok(content.includes("license: MIT"));
    assert.ok(!content.includes("{{body}}"), "should not contain unreplaced {{body}} marker");
    assert.ok(content.includes("## Change Directory Structure"), "should contain body content");
  });

  it("installed content is identical between copilot and opencode except frontmatter", () => {
    setupTmp();
    runCli("init --scope project --agent copilot --force --no-model-prompt 2>/dev/null");
    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");

    for (const agent of AGENTS) {
      const cBody = readFile(path.join(tmpDir, ".copilot", "agents", `${agent}.agent.md`))
        .replace(/^---[\s\S]*?---\n?/m, "");
      const oBody = readFile(path.join(tmpDir, ".opencode", "agents", `${agent}.agent.md`))
        .replace(/^---[\s\S]*?---\n?/m, "");
      assert.strictEqual(cBody, oBody, `${agent}: body content differs between tools`);
    }
  });

  it("help command runs without error", () => {
    const output = execSync(`node "${cliPath}" --help`, { encoding: "utf8" });
    assert.ok(output.includes("easyspec init"));
    assert.ok(output.includes("opencode"));
  });

  it("unknown command shows error", () => {
    try {
      execSync(`node "${cliPath}" nonexistent --no-model-prompt`, {
        encoding: "utf8",
        stdio: "pipe",
        timeout: 5000,
      });
      assert.fail("should have thrown");
    } catch (err) {
      const output = (err.stderr || "") + (err.stdout || "") + (err.message || "");
      assert.ok(
        output.includes("Unknown command") || err.status !== 0,
        `expected error about unknown command, got: ${output.slice(0, 300)}`
      );
    }
  });
});

// ——— Sync Command ———

describe("sync command", () => {
  it("sync dry-run works", () => {
    const output = execSync(
      `node "${cliPath}" sync --template-profile copilot --dry-run --source-prompts "${path.join(templatesDir, 'copilot', 'prompts')}" --source-agents "${path.join(templatesDir, 'copilot', 'agents')}"`,
      { encoding: "utf8" }
    );
    assert.ok(output.includes("template profile: copilot"));
  });
});
