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
  "es-quick-fix",
];

const TOOL_EXT = {
  copilot: { agentExt: ".agent.md", promptExt: ".prompt.md", promptTmpl: "_template.prompt.md", agentTmpl: "_template.agent.md" },
  opencode: { agentExt: ".md", promptExt: ".md", promptTmpl: "_template.md", agentTmpl: "_template.md" },
};

function readFile(...segments) {
  return fs.readFileSync(path.join(...segments), "utf8");
}

function fileExists(...segments) {
  return fs.existsSync(path.join(...segments));
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }
  const closeIdx = content.indexOf("\n---\n", 4);
  if (closeIdx === -1) {
    return { frontmatter: {}, body: content };
  }
  const fmBlock = content.slice(4, closeIdx);
  const body = content.slice(closeIdx + 5);
  const frontmatter = {};
  for (const line of fmBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body };
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

// ——— Generic Template Integrity ———

describe("generic template integrity", () => {
  const tools = ["copilot", "opencode"];

  for (const tool of tools) {
    it(`${tool} has generic agent template`, () => {
      const tmplName = TOOL_EXT[tool].agentTmpl;
      assert.ok(
        fileExists(templatesDir, tool, "agents", tmplName),
        `${tool}: missing generic agent template (${tmplName})`
      );
    });

    it(`${tool} has generic prompt template`, () => {
      const tmplName = TOOL_EXT[tool].promptTmpl;
      assert.ok(
        fileExists(templatesDir, tool, "prompts", tmplName),
        `${tool}: missing generic prompt template (${tmplName})`
      );
    });

    it(`${tool} generic templates have {{body}} marker`, () => {
      const agentTmplPath = path.join(templatesDir, tool, "agents", TOOL_EXT[tool].agentTmpl);
      const promptTmplPath = path.join(templatesDir, tool, "prompts", TOOL_EXT[tool].promptTmpl);
      const agentTmpl = fs.readFileSync(agentTmplPath, "utf8");
      const promptTmpl = fs.readFileSync(promptTmplPath, "utf8");
      assert.ok(agentTmpl.includes("{{body}}"), `${tool} agent template missing {{body}}`);
      assert.ok(promptTmpl.includes("{{body}}"), `${tool} prompt template missing {{body}}`);
    });
  }

  it("opencode templates have name and description placeholders", () => {
    const agentTmpl = readFile(templatesDir, "opencode", "agents", "_template.md");
    const promptTmpl = readFile(templatesDir, "opencode", "prompts", "_template.md");
    assert.ok(agentTmpl.includes("{{name}}"), "opencode agent template missing {{name}}");
    assert.ok(agentTmpl.includes("{{description}}"), "opencode agent template missing {{description}}");
    assert.ok(promptTmpl.includes("{{name}}"), "opencode prompt template missing {{name}}");
    assert.ok(promptTmpl.includes("{{description}}"), "opencode prompt template missing {{description}}");
  });

  it("copilot templates have description model tools placeholders", () => {
    const agentTmpl = readFile(templatesDir, "copilot", "agents", "_template.agent.md");
    const promptTmpl = readFile(templatesDir, "copilot", "prompts", "_template.prompt.md");
    assert.ok(agentTmpl.includes("{{description}}"), "copilot agent template missing {{description}}");
    assert.ok(agentTmpl.includes("{{model}}"), "copilot agent template missing {{model}}");
    assert.ok(agentTmpl.includes("{{tools}}"), "copilot agent template missing {{tools}}");
    assert.ok(promptTmpl.includes("{{description}}"), "copilot prompt template missing {{description}}");
    assert.ok(!agentTmpl.includes("{{name}}"), "copilot agent template should not have {{name}}");
    assert.ok(!promptTmpl.includes("{{name}}"), "copilot prompt template should not have {{name}}");
  });
});

// ——— Content Body Integrity ———

describe("content body integrity", () => {
  it("all prompt body files have frontmatter with name and description", () => {
    for (const prompt of PROMPTS) {
      const body = readFile(contentDir, "prompts", `${prompt}.body.md`);
      const { frontmatter } = parseFrontmatter(body);
      assert.ok(frontmatter.name, `${prompt}.body.md: missing name in frontmatter`);
      assert.strictEqual(frontmatter.name, prompt, `${prompt}.body.md: name mismatch`);
      assert.ok(frontmatter.description, `${prompt}.body.md: missing description in frontmatter`);
    }
  });

  it("all agent body files have frontmatter with name, description, model, tools", () => {
    for (const agent of AGENTS) {
      const body = readFile(contentDir, "agents", `${agent}.body.md`);
      const { frontmatter } = parseFrontmatter(body);
      assert.ok(frontmatter.name, `${agent}.body.md: missing name in frontmatter`);
      assert.strictEqual(frontmatter.name, agent, `${agent}.body.md: name mismatch`);
      assert.ok(frontmatter.description, `${agent}.body.md: missing description in frontmatter`);
      assert.ok(frontmatter.model, `${agent}.body.md: missing model in frontmatter`);
      assert.ok(frontmatter.tools, `${agent}.body.md: missing tools in frontmatter`);
    }
  });
});

// ——— Template Rendering ———

describe("template rendering", () => {
  function renderFromBody(tool, type, name) {
    const bodyContent = readFile(contentDir, type, `${name}.body.md`);
    const { frontmatter, body } = parseFrontmatter(bodyContent);
    const ext = type === "agents" ? TOOL_EXT[tool].agentTmpl : TOOL_EXT[tool].promptTmpl;
    const template = readFile(templatesDir, tool, type, ext);
    return template
      .replace(/{{name}}/g, frontmatter.name || "")
      .replace(/{{description}}/g, frontmatter.description || "")
      .replace(/{{model}}/g, frontmatter.model || "")
      .replace(/{{tools}}/g, frontmatter.tools || "")
      .replace(/{{body}}/g, body.trimEnd());
  }

  it("renders copilot agent with all frontmatter fields", () => {
    const rendered = renderFromBody("copilot", "agents", "es-architect");
    assert.ok(rendered.startsWith("---\n"));
    assert.ok(rendered.includes("model:"));
    assert.ok(rendered.includes("tools:"));
    assert.ok(rendered.includes("description:"));
    assert.ok(rendered.includes("es-Architect Agent"));
  });

  it("renders opencode agent without model or tools fields", () => {
    const rendered = renderFromBody("opencode", "agents", "es-architect");
    assert.ok(rendered.startsWith("---\nname: es-architect"));
    assert.ok(!rendered.includes("model:"));
    assert.ok(!rendered.includes("tools:"));
    assert.ok(rendered.includes("description:"));
    assert.ok(rendered.includes("es-Architect Agent"));
  });

  it("renders opencode prompt without model or tools", () => {
    const rendered = renderFromBody("opencode", "prompts", "es-change-init");
    assert.ok(rendered.startsWith("---\nname: es-change-init"));
    assert.ok(!rendered.includes("model:"));
    assert.ok(!rendered.includes("tools:"));
  });

  it("all agent body files contain non-empty instruction content", () => {
    for (const agent of AGENTS) {
      const { body } = parseFrontmatter(readFile(contentDir, "agents", `${agent}.body.md`));
      assert.ok(body.length > 100, `${agent}: body too short (${body.length} chars)`);
    }
  });

  it("all prompt body files contain non-empty instruction content", () => {
    for (const prompt of PROMPTS) {
      const { body } = parseFrontmatter(readFile(contentDir, "prompts", `${prompt}.body.md`));
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
    assert.ok(output.includes("copied=16"), "should copy 16 files (7 agents + 8 prompts + 1 skill)");
    assert.ok(output.includes("agent target: copilot"));
    assert.ok(output.includes("template profile: copilot"));
  });

  it("opencode dry-run install succeeds and reports correct counts", () => {
    setupTmp();
    const output = runCli("init --scope project --agent opencode --dry-run --no-model-prompt");
    assert.ok(output.includes("copied=16"), "should copy 16 files");
    assert.ok(output.includes("agent target: opencode"));
    assert.ok(output.includes("template profile: opencode"));
  });

  it("opencode installed agents have no model or tools fields", () => {
    setupTmp();
    runCli("init --scope project --agent opencode --force --no-model-prompt 2>/dev/null");

    for (const agent of AGENTS) {
      const filePath = path.join(tmpDir, ".opencode", "agents", `${agent}${TOOL_EXT.opencode.agentExt}`);
      assert.ok(fs.existsSync(filePath), `missing ${agent}${TOOL_EXT.opencode.agentExt}`);
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
      const filePath = path.join(tmpDir, ".copilot", "agents", `${agent}${TOOL_EXT.copilot.agentExt}`);
      assert.ok(fs.existsSync(filePath), `missing ${agent}${TOOL_EXT.copilot.agentExt}`);
      const content = readFile(filePath);
      assert.ok(content.includes("model:"), `${agent}: should have model field`);
      assert.ok(content.includes("tools:"), `${agent}: should have tools field`);
    }
  });

  it("defaults models to auto without overriding template value", () => {
    setupTmp();
    runCli("init --scope project --agent copilot --force 2>/dev/null");

    for (const agent of AGENTS) {
      const filePath = path.join(tmpDir, ".copilot", "agents", `${agent}${TOOL_EXT.copilot.agentExt}`);
      const content = readFile(filePath);
      assert.ok(
        content.includes("model: Auto (copilot)"),
        `${agent}: should keep template default auto model`
      );
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
      const cBody = readFile(path.join(tmpDir, ".copilot", "agents", `${agent}${TOOL_EXT.copilot.agentExt}`))
        .replace(/^---[\s\S]*?---\n?/m, "");
      const oBody = readFile(path.join(tmpDir, ".opencode", "agents", `${agent}${TOOL_EXT.opencode.agentExt}`))
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
