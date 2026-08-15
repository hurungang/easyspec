import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const SUPPORTED_IDES = ["vscode", "vscode-insiders", "cursor", "windsurf"];
const SUPPORTED_AGENTS = ["copilot", "opencode", "cursor", "windsurf", "claude-code", "claude", "codex"];

const TOOL_PROFILES = {
  copilot: {
    configDir: ".copilot",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".github/skills",
  },
  opencode: {
    configDir: ".opencode",
    homeConfigDir: ".config/opencode",
    agentExt: ".md",
    promptExt: ".md",
    commandDir: "commands",
    skillDir: "skills",
  },
  cursor: {
    configDir: ".cursor",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".cursor/skills",
  },
  windsurf: {
    configDir: ".windsurf",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".windsurf/skills",
  },
  "claude-code": {
    configDir: ".claude",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".claude/skills",
  },
  claude: {
    configDir: ".claude",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".claude/skills",
  },
  codex: {
    configDir: ".codex",
    agentExt: ".agent.md",
    promptExt: ".prompt.md",
    skillDir: ".codex/skills",
  },
};

const TEMPLATE_PROFILE_BY_AGENT = {
  copilot: "copilot",
  opencode: "opencode",
  cursor: "copilot",
  windsurf: "copilot",
  "claude-code": "opencode",
  claude: "opencode",
  codex: "copilot",
};

const TECHNICAL_AGENT_NAMES = new Set(["es-architect", "es-database-designer", "es-developer", "es-tester"]);
const MODEL_PRESETS = {
  balanced: {
    technicalModel: "GPT-5 (copilot)",
    nonTechnicalModel: "Claude Sonnet 4.5 (copilot)",
  },
  speed: {
    technicalModel: "Claude Sonnet 4.5 (copilot)",
    nonTechnicalModel: "Claude Sonnet 4.5 (copilot)",
  },
  quality: {
    technicalModel: "GPT-5 (copilot)",
    nonTechnicalModel: "GPT-5 (copilot)",
  },
};

function defaultPromptSourcePath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) {
      return null;
    }
    return path.join(appData, "Code - Insiders", "User", "prompts");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Code - Insiders", "User", "prompts");
  }

  return path.join(os.homedir(), ".config", "Code - Insiders", "User", "prompts");
}

function defaultAgentSourcePath() {
  return path.join(os.homedir(), ".copilot", "agents");
}

function printHelp() {
  console.log(`easyspec-init

Usage:
  easyspec init [options]
  easyspec sync [options]
  easyspec-init init [options]
  easyspec-init sync [options]
  easyspec-init --help

Options:
  --agent <copilot|opencode|cursor|windsurf|claude-code|claude|codex>
                                  Coding agent target (prompts interactively if omitted)
  --scope <project|global>        Install scope (prompts interactively if omitted)
  --ide <auto|vscode|vscode-insiders|cursor|windsurf>
                                  IDE target for user-level install (default: auto)
  --workspace <path>              Project folder for --scope project (default: cwd)
  --force                         Overwrite existing files
  --dry-run                       Show what would be copied
  --no-ide-user-sync              For global install, skip IDE user folder sync
  --source-prompts <path>         Source prompt directory for sync command
  --source-agents <path>          Source agent directory for sync command
  --template-profile <name>       Template profile to refresh (default: copilot)
  --include-agents <a,b,c>        Optional explicit agent list for sync
  --tech-model <name>             Model for technical agents (default: auto)
  --non-tech-model <name>         Model for non-technical agents (default: auto)
  --model-preset <balanced|speed|quality>
                                  Apply preset model pair before explicit overrides
  --help                          Show this help

Examples:
  easyspec init
  easyspec init --scope project --agent copilot
  easyspec init --scope project --agent opencode
  easyspec init --scope global --agent cursor --ide cursor
  easyspec init --scope project --model-preset balanced
  easyspec init --scope project --tech-model "GPT-5 (copilot)" --non-tech-model "Claude Sonnet 4.5 (copilot)"
  easyspec sync --template-profile core
`);
}

function parseArgs(argv) {
  const args = {
    command: null,
    agent: "copilot",
    scope: "project",
    ide: "auto",
    workspace: process.cwd(),
    force: false,
    dryRun: false,
    ideUserSync: true,
    sourcePrompts: defaultPromptSourcePath(),
    sourceAgents: defaultAgentSourcePath(),
    templateProfile: "core",
    includeAgents: null,
    techModel: null,
    nonTechModel: null,
    modelPreset: null,
    modelPrompt: true,
    agentExplicit: false,
    scopeExplicit: false,
    help: false,
  };

  if (argv.length === 0) {
    args.help = true;
    return args;
  }

  if (argv[0] === "--help" || argv[0] === "-h") {
    args.help = true;
    return args;
  }

  args.command = argv[0];

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--force") {
      args.force = true;
    } else if (token === "--dry-run") {
      args.dryRun = true;
    } else if (token === "--no-ide-user-sync") {
      args.ideUserSync = false;
    } else if (token === "--scope") {
      args.scope = argv[i + 1];
      args.scopeExplicit = true;
      i += 1;
    } else if (token === "--agent") {
      args.agent = argv[i + 1];
      args.agentExplicit = true;
      i += 1;
    } else if (token === "--ide") {
      args.ide = argv[i + 1];
      i += 1;
    } else if (token === "--workspace") {
      args.workspace = path.resolve(argv[i + 1]);
      i += 1;
    } else if (token === "--source-prompts") {
      args.sourcePrompts = path.resolve(argv[i + 1]);
      i += 1;
    } else if (token === "--source-agents") {
      args.sourceAgents = path.resolve(argv[i + 1]);
      i += 1;
    } else if (token === "--template-profile") {
      args.templateProfile = argv[i + 1];
      i += 1;
    } else if (token === "--include-agents") {
      args.includeAgents = argv[i + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      i += 1;
    } else if (token === "--tech-model") {
      args.techModel = argv[i + 1];
      i += 1;
    } else if (token === "--non-tech-model") {
      args.nonTechModel = argv[i + 1];
      i += 1;
    } else if (token === "--model-preset") {
      args.modelPreset = argv[i + 1];
      i += 1;
    } else if (token === "--no-model-prompt") {
      args.modelPrompt = false;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function getIdeUserPath(ide) {
  const platform = process.platform;
  if (platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) {
      return null;
    }
    const map = {
      vscode: path.join(appData, "Code", "User"),
      "vscode-insiders": path.join(appData, "Code - Insiders", "User"),
      cursor: path.join(appData, "Cursor", "User"),
      windsurf: path.join(appData, "Windsurf", "User"),
    };
    return map[ide] || null;
  }

  if (platform === "darwin") {
    const base = path.join(os.homedir(), "Library", "Application Support");
    const map = {
      vscode: path.join(base, "Code", "User"),
      "vscode-insiders": path.join(base, "Code - Insiders", "User"),
      cursor: path.join(base, "Cursor", "User"),
      windsurf: path.join(base, "Windsurf", "User"),
    };
    return map[ide] || null;
  }

  const base = path.join(os.homedir(), ".config");
  const map = {
    vscode: path.join(base, "Code", "User"),
    "vscode-insiders": path.join(base, "Code - Insiders", "User"),
    cursor: path.join(base, "Cursor", "User"),
    windsurf: path.join(base, "Windsurf", "User"),
  };
  return map[ide] || null;
}

function detectIde(preferred) {
  if (preferred && preferred !== "auto") {
    if (!SUPPORTED_IDES.includes(preferred)) {
      throw new Error(`Unsupported IDE '${preferred}'.`);
    }
    return preferred;
  }

  for (const ide of SUPPORTED_IDES) {
    const idePath = getIdeUserPath(ide);
    if (idePath && fs.existsSync(idePath)) {
      return ide;
    }
  }
  return null;
}

function getAgentRootInWorkspace(agent, workspace) {
  const profile = TOOL_PROFILES[agent];
  if (!profile) {
    throw new Error(`Unsupported agent '${agent}'.`);
  }
  return path.resolve(workspace, profile.configDir);
}

function getAgentRootInHome(agent) {
  const profile = TOOL_PROFILES[agent];
  if (!profile) {
    throw new Error(`Unsupported agent '${agent}'.`);
  }
  const dir = profile.homeConfigDir || profile.configDir;
  return path.join(os.homedir(), dir);
}

function getSkillRoot(rootPath, agent) {
  const profile = TOOL_PROFILES[agent];
  if (!profile) {
    throw new Error(`Unsupported agent '${agent}'.`);
  }
  if (profile.skillDir.startsWith(".")) {
    return path.resolve(path.dirname(rootPath), profile.skillDir);
  }
  return path.resolve(rootPath, profile.skillDir);
}

function ensureDir(dirPath, dryRun) {
  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileWithPolicy(src, dest, options) {
  const { force, dryRun } = options;
  const exists = fs.existsSync(dest);
  if (exists && !force) {
    return "skipped";
  }

  if (!dryRun) {
    fs.copyFileSync(src, dest);
  }
  return exists ? "overwritten" : "copied";
}

function copyDirectoryContents(srcDir, destDir, options) {
  const summary = {
    copied: 0,
    overwritten: 0,
    skipped: 0,
  };
  ensureDir(destDir, options.dryRun);

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    const result = copyFileWithPolicy(src, dest, options);
    summary[result] += 1;
  }

  return summary;
}

function mergeSummary(target, partial) {
  target.copied += partial.copied;
  target.overwritten += partial.overwritten;
  target.skipped += partial.skipped;
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

function findGenericTemplate(templateDir) {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith("_template")) {
      return path.join(templateDir, entry.name);
    }
  }
  return null;
}

function renderEntitiesFromContent(templateDir, destDir, contentDir, entityType, entityExt, options) {
  const summary = { copied: 0, overwritten: 0, skipped: 0 };

  const genericTemplatePath = findGenericTemplate(templateDir);
  if (!genericTemplatePath) {
    return summary;
  }

  const genericTemplate = fs.readFileSync(genericTemplatePath, "utf8");
  const contentEntityDir = path.join(contentDir, entityType);
  if (!fs.existsSync(contentEntityDir)) {
    return summary;
  }

  const bodyFiles = fs.readdirSync(contentEntityDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".body.md"));

  for (const bodyFile of bodyFiles) {
    const bodyPath = path.join(contentEntityDir, bodyFile.name);
    const bodyContent = fs.readFileSync(bodyPath, "utf8");
    const { frontmatter, body } = parseFrontmatter(bodyContent);

    const entityName = frontmatter.name || bodyFile.name.replace(".body.md", "");
    const destName = `${entityName}${entityExt}`;
    const destPath = path.join(destDir, destName);
    const exists = fs.existsSync(destPath);

    if (exists && !options.force) {
      summary.skipped += 1;
      continue;
    }

    let rendered = genericTemplate
      .replace(/{{name}}/g, frontmatter.name || "")
      .replace(/{{description}}/g, frontmatter.description || "")
      .replace(/{{model}}/g, frontmatter.model || "")
      .replace(/{{tools}}/g, frontmatter.tools || "")
      .replace(/{{body}}/g, body.trimEnd());

    if (!options.dryRun) {
      ensureDir(destDir, false);
      fs.writeFileSync(destPath, rendered, "utf8");
    }
    summary[exists ? "overwritten" : "copied"] += 1;
  }

  return summary;
}

function copySkillDirectory(srcSkillDir, destSkillDir, contentDir, options) {
  const summary = { copied: 0, overwritten: 0, skipped: 0 };
  if (!fs.existsSync(srcSkillDir)) {
    return summary;
  }

  ensureDir(destSkillDir, options.dryRun);

  const entries = fs.readdirSync(srcSkillDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillSrc = path.join(srcSkillDir, entry.name);
    const skillDest = path.join(destSkillDir, entry.name);
    const skillFiles = fs.readdirSync(skillSrc, { withFileTypes: true });
    ensureDir(skillDest, options.dryRun);
    for (const skillFile of skillFiles) {
      if (!skillFile.isFile() || skillFile.name.endsWith(".body.md")) {
        continue;
      }
      const sfSrc = path.join(skillSrc, skillFile.name);
      const sfDest = path.join(skillDest, skillFile.name);
      const exists = fs.existsSync(sfDest);

      if (exists && !options.force) {
        summary.skipped += 1;
        continue;
      }

      const rendered = renderTemplate(sfSrc, contentDir, options, `skills/${entry.name}`);
      if (rendered === null) {
        summary.skipped += 1;
        continue;
      }

      if (!options.dryRun) {
        fs.writeFileSync(sfDest, rendered, "utf8");
      }
      summary[exists ? "overwritten" : "copied"] += 1;
    }
  }

  return summary;
}

function renderTemplate(templatePath, contentDir, options, bodySubPath) {
  const template = fs.readFileSync(templatePath, "utf8");
  if (!template.includes("{{body}}")) {
    return template;
  }

  const entType = bodySubPath || path.basename(path.dirname(templatePath));
  const templateName = path.basename(templatePath);
  const bodyName = templateName.replace(/\.(agent|prompt)\.md$/, ".body.md");
  const finalBodyName = bodyName === templateName ? templateName.replace(/\.md$/, ".body.md") : bodyName;
  const bodyPath = path.join(contentDir, entType, finalBodyName);

  if (!fs.existsSync(bodyPath)) {
    if (!options.silent) {
      console.warn(`[easyspec-init] no body content found for ${templateName}, skipping`);
    }
    return null;
  }

  const body = fs.readFileSync(bodyPath, "utf8").trimEnd();
  return template.replace("{{body}}", body);
}

function renderDirectoryContents(templateDir, destDir, contentDir, options) {
  const summary = {
    copied: 0,
    overwritten: 0,
    skipped: 0,
  };
  ensureDir(destDir, options.dryRun);

  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const src = path.join(templateDir, entry.name);
    const dest = path.join(destDir, entry.name);
    const exists = fs.existsSync(dest);

    if (exists && !options.force) {
      summary.skipped += 1;
      continue;
    }

    const rendered = renderTemplate(src, contentDir, options);
    if (rendered === null) {
      summary.skipped += 1;
      continue;
    }

    if (!options.dryRun) {
      ensureDir(destDir, false);
      fs.writeFileSync(dest, rendered, "utf8");
    }
    summary[exists ? "overwritten" : "copied"] += 1;
  }

  return summary;
}

function installToRoot(rootPath, sourceRoot, contentRoot, agent, options, skipSkills) {
  const profile = TOOL_PROFILES[agent];
  const promptsSrc = path.join(sourceRoot, "prompts");
  const agentsSrc = path.join(sourceRoot, "agents");
  const commandDir = profile.commandDir || "prompts";
  const promptsDest = path.join(rootPath, commandDir);
  const agentsDest = path.join(rootPath, "agents");

  const summary = {
    copied: 0,
    overwritten: 0,
    skipped: 0,
  };

  mergeSummary(summary, renderEntitiesFromContent(promptsSrc, promptsDest, contentRoot, "prompts", profile.promptExt, options));
  mergeSummary(summary, renderEntitiesFromContent(agentsSrc, agentsDest, contentRoot, "agents", profile.agentExt, options));

  if (!skipSkills) {
    const contentSkillsDir = path.join(contentRoot, "skills");
    const skillDest = getSkillRoot(rootPath, agent);
    mergeSummary(summary, copySkillDirectory(contentSkillsDir, skillDest, contentRoot, options));
  }

  return {
    rootPath,
    ...summary,
  };
}

function resolveSourceRoot(baseTemplatesDir, agent) {
  const profile = TEMPLATE_PROFILE_BY_AGENT[agent];
  if (!profile) {
    throw new Error(`No template profile mapped for agent '${agent}'.`);
  }
  return path.join(baseTemplatesDir, profile);
}

function resolveContentRoot(baseTemplatesDir) {
  return path.join(baseTemplatesDir, "content");
}

function collectPromptFiles(promptDir) {
  if (!promptDir || !fs.existsSync(promptDir)) {
    throw new Error(`Prompt source directory does not exist: ${promptDir}`);
  }
  return fs
    .readdirSync(promptDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^es-change-.*\.prompt\.md$/i.test(entry.name))
    .map((entry) => path.join(promptDir, entry.name));
}

function inferAgentNamesFromPrompts(promptFiles) {
  const names = new Set();
  const re = /\*\*(?<name>[A-Za-z0-9_-]+)\s+agent\*\*/gi;

  for (const filePath of promptFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    let match = re.exec(content);
    while (match) {
      names.add(match.groups.name);
      match = re.exec(content);
    }
    re.lastIndex = 0;
  }

  return Array.from(names).sort();
}

function syncTemplates(args, templatesDir, dryRun, force) {
  const profileDir = path.join(templatesDir, args.templateProfile);
  const promptDestDir = path.join(profileDir, "prompts");
  const agentDestDir = path.join(profileDir, "agents");
  const skillDestDir = path.join(profileDir, "skills");

  if (!dryRun) {
    fs.mkdirSync(promptDestDir, { recursive: true });
    fs.mkdirSync(agentDestDir, { recursive: true });
    fs.mkdirSync(skillDestDir, { recursive: true });
  }

  const promptFiles = collectPromptFiles(args.sourcePrompts);
  const agentNames = args.includeAgents || inferAgentNamesFromPrompts(promptFiles);
  const summary = {
    prompts: { copied: 0, overwritten: 0, skipped: 0 },
    agents: { copied: 0, overwritten: 0, skipped: 0, missing: [] },
    skills: { copied: 0, overwritten: 0, skipped: 0 },
  };

  for (const srcPromptFile of promptFiles) {
    const destPromptFile = path.join(promptDestDir, path.basename(srcPromptFile));
    const result = copyFileWithPolicy(srcPromptFile, destPromptFile, { force, dryRun });
    summary.prompts[result] += 1;
  }

  for (const agentName of agentNames) {
    const srcAgentFile = path.join(args.sourceAgents, `${agentName}.agent.md`);
    if (!fs.existsSync(srcAgentFile)) {
      summary.agents.missing.push(agentName);
      continue;
    }
    const destAgentFile = path.join(agentDestDir, `${agentName}.agent.md`);
    const result = copyFileWithPolicy(srcAgentFile, destAgentFile, { force, dryRun });
    summary.agents[result] += 1;
  }

  if (args.sourceSkills && fs.existsSync(args.sourceSkills)) {
    mergeSummary(summary.skills, copySkillDirectory(args.sourceSkills, skillDestDir, { force, dryRun }));
  }

  return {
    profileDir,
    sourcePrompts: args.sourcePrompts,
    sourceAgents: args.sourceAgents,
    agentNames,
    summary,
  };
}

function chooseModelKind(agentFileName) {
  const bare = agentFileName.replace(/\.agent\.md$/i, "");
  return TECHNICAL_AGENT_NAMES.has(bare) ? "technical" : "non-technical";
}

function upsertModelInFrontmatter(content, model) {
  if (!content.startsWith("---\n")) {
    return content;
  }

  const closeIdx = content.indexOf("\n---\n", 4);
  if (closeIdx === -1) {
    return content;
  }

  const frontmatterBlock = content.slice(0, closeIdx + 5);
  const rest = content.slice(closeIdx + 5);
  const modelRe = /^model:\s*.*$/m;

  if (modelRe.test(frontmatterBlock)) {
    return `${frontmatterBlock.replace(modelRe, `model: "${model}"`)}${rest}`;
  }

  return content;
}

function applyModelSelectionsToRoot(rootPath, selection, dryRun) {
  const agentsDir = path.join(rootPath, "agents");
  const summary = {
    updated: 0,
    skipped: 0,
  };

  if (!fs.existsSync(agentsDir)) {
    return summary;
  }

  const files = fs.readdirSync(agentsDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".agent.md"));
  for (const entry of files) {
    const modelKind = chooseModelKind(entry.name);
    const chosenModel = modelKind === "technical" ? selection.technicalModel : selection.nonTechnicalModel;
    if (!chosenModel || chosenModel === "auto") {
      summary.skipped += 1;
      continue;
    }

    const filePath = path.join(agentsDir, entry.name);
    const current = fs.readFileSync(filePath, "utf8");
    const updated = upsertModelInFrontmatter(current, chosenModel);
    if (updated === current) {
      summary.skipped += 1;
      continue;
    }

    if (!dryRun) {
      fs.writeFileSync(filePath, updated, "utf8");
    }
    summary.updated += 1;
  }

  return summary;
}

const AGENT_LABELS = {
  copilot: "GitHub Copilot (VS Code)",
  opencode: "OpenCode",
  cursor: "Cursor",
  windsurf: "Windsurf",
  "claude-code": "Claude Code",
  claude: "Claude",
  codex: "Codex",
};

async function promptForAgent() {
  const rl = createInterface({ input, output });
  try {
    console.log("[easyspec-init] select target harness (coding agent):");
    SUPPORTED_AGENTS.forEach((agent, idx) => {
      console.log(`  ${idx + 1}. ${agent}${AGENT_LABELS[agent] ? ` (${AGENT_LABELS[agent]})` : ""}`);
    });
    const choiceRaw = await rl.question(`[easyspec-init] Enter choice 1-${SUPPORTED_AGENTS.length} (default: copilot): `);
    const normalized = choiceRaw.trim() === "" ? "1" : choiceRaw;
    const choice = Number.parseInt(normalized, 10);
    if (Number.isNaN(choice) || choice < 1 || choice > SUPPORTED_AGENTS.length) {
      throw new Error("Invalid harness selection.");
    }
    return SUPPORTED_AGENTS[choice - 1];
  } finally {
    rl.close();
  }
}

async function promptForScope(agent, workspace) {
  const rl = createInterface({ input, output });
  try {
    const projectPath = getAgentRootInWorkspace(agent, workspace);
    const globalPath = getAgentRootInHome(agent);
    console.log("[easyspec-init] select install scope (level):");
    console.log(`  1. project — install into current project (${projectPath})`);
    console.log(`  2. global  — install into your user profile (${globalPath})`);
    const choiceRaw = await rl.question("[easyspec-init] Enter choice 1-2 (default: project): ");
    const normalized = choiceRaw.trim() === "" ? "1" : choiceRaw;
    const choice = Number.parseInt(normalized, 10);
    if (choice === 1) return "project";
    if (choice === 2) return "global";
    throw new Error("Invalid scope selection.");
  } finally {
    rl.close();
  }
}

function resolveModelSelection(args) {
  let preset = null;
  const presetName = args.modelPreset || null;
  if (presetName) {
    preset = MODEL_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Invalid --model-preset value '${presetName}'. Use one of: ${Object.keys(MODEL_PRESETS).join(", ")}.`);
    }
  }

  return {
    technicalModel: args.techModel || preset?.technicalModel || "auto",
    nonTechnicalModel: args.nonTechModel || preset?.nonTechnicalModel || "auto",
    prompted: false,
    preset: presetName,
  };
}

export async function runCli(argv) {
  const args = parseArgs(argv);

  if (args.help || !args.command) {
    printHelp();
    return;
  }

  const currentFile = fileURLToPath(import.meta.url);
  const templatesDir = path.resolve(path.dirname(currentFile), "..", "templates");

  if (args.command === "sync") {
    const report = syncTemplates(args, templatesDir, args.dryRun, args.force);
    console.log(`[easyspec-init] ${args.dryRun ? "would refresh" : "refreshed"} template profile: ${args.templateProfile}`);
    console.log(`[easyspec-init] source prompts: ${report.sourcePrompts}`);
    console.log(`[easyspec-init] source agents: ${report.sourceAgents}`);
    console.log(`[easyspec-init] prompts -> copied=${report.summary.prompts.copied} overwritten=${report.summary.prompts.overwritten} skipped=${report.summary.prompts.skipped}`);
    console.log(`[easyspec-init] agents  -> copied=${report.summary.agents.copied} overwritten=${report.summary.agents.overwritten} skipped=${report.summary.agents.skipped}`);
    if (report.summary.skills) {
      console.log(`[easyspec-init] skills  -> copied=${report.summary.skills.copied} overwritten=${report.summary.skills.overwritten} skipped=${report.summary.skills.skipped}`);
    }
    if (report.summary.agents.missing.length > 0) {
      console.warn(`[easyspec-init] missing agent files: ${report.summary.agents.missing.join(", ")}`);
    }
    return;
  }

  if (args.command !== "init") {
    throw new Error(`Unknown command '${args.command}'. Supported: init, sync.`);
  }

  if (process.stdin.isTTY) {
    if (!args.agentExplicit) {
      args.agent = await promptForAgent();
    }
    if (!args.scopeExplicit) {
      args.scope = await promptForScope(args.agent, args.workspace);
    }
  }

  if (!["project", "global"].includes(args.scope)) {
    throw new Error(`Invalid --scope value '${args.scope}'. Use project or global.`);
  }

  if (!SUPPORTED_AGENTS.includes(args.agent)) {
    throw new Error(`Unsupported --agent value '${args.agent}'. Currently supported: ${SUPPORTED_AGENTS.join(", ")}.`);
  }

  const sourceRoot = resolveSourceRoot(templatesDir, args.agent);
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Template directory not found: ${sourceRoot}`);
  }

  const contentRoot = resolveContentRoot(templatesDir);
  if (!fs.existsSync(contentRoot)) {
    throw new Error(`Content directory not found: ${contentRoot}`);
  }

  const ide = detectIde(args.ide);
  if (args.ide !== "auto" && !ide) {
    throw new Error(`Could not resolve IDE path for '${args.ide}'.`);
  }

  const options = {
    force: args.force,
    dryRun: args.dryRun,
    workspace: args.workspace,
  };
  const modelSelection = resolveModelSelection(args);

  const installReports = [];

  if (args.scope === "project") {
    const projectRoot = getAgentRootInWorkspace(args.agent, args.workspace);
    installReports.push(installToRoot(projectRoot, sourceRoot, contentRoot, args.agent, options));
  } else {
    const userAgentRoot = getAgentRootInHome(args.agent);
    installReports.push(installToRoot(userAgentRoot, sourceRoot, contentRoot, args.agent, options));

    if (args.ideUserSync && ["copilot", "cursor", "windsurf"].includes(args.agent)) {
      const resolvedIde = ide || detectIde("auto");
      if (resolvedIde) {
        const ideUserRoot = getIdeUserPath(resolvedIde);
        if (ideUserRoot) {
          installReports.push(installToRoot(ideUserRoot, sourceRoot, contentRoot, args.agent, options, true));
        }
      } else {
        console.warn("[easyspec-init] No supported IDE user folder detected. Skipping IDE user sync.");
      }
    }
  }

  console.log(`[easyspec-init] agent target: ${args.agent}`);
  console.log(`[easyspec-init] template profile: ${TEMPLATE_PROFILE_BY_AGENT[args.agent]}`);
  console.log(`[easyspec-init] IDE target: ${ide || "not-detected"}`);
  const agentDirs = new Set();
  for (const report of installReports) {
    console.log(`[easyspec-init] ${args.dryRun ? "would update" : "updated"}: ${report.rootPath}`);
    console.log(`  copied=${report.copied} overwritten=${report.overwritten} skipped=${report.skipped}`);
    agentDirs.add(path.join(report.rootPath, "agents"));
  }

  let modelUpdates = 0;
  for (const report of installReports) {
    const result = applyModelSelectionsToRoot(report.rootPath, modelSelection, args.dryRun);
    modelUpdates += result.updated;
  }

  console.log(`[easyspec-init] model selection: technical='${modelSelection.technicalModel}' non-technical='${modelSelection.nonTechnicalModel}'`);
  if (modelSelection.preset) {
    console.log(`[easyspec-init] model preset applied: ${modelSelection.preset}`);
  }
  console.log(`[easyspec-init] ${args.dryRun ? "would update" : "updated"} model settings in ${modelUpdates} agent file(s).`);

  console.log("[easyspec-init] reminder: models default to auto — review installed *.agent.md model values if you want per-agent overrides.");
  for (const agentDir of agentDirs) {
    console.log(`[easyspec-init] model settings location: ${agentDir}`);
  }
}
