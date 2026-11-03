import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE_NAME = "easyspec-config.yaml";
export const DEFAULT_DOCS_FOLDER = "easyspec-docs";
export const LEGACY_CONFIG_RELATIVE_PATH = "docs/config.yaml";
export const LEGACY_DOCS_FOLDER = "docs";

/**
 * Minimal dependency-free parser for the flat easyspec config shape:
 * top-level scalar keys plus two-level maps and simple lists.
 * Returns {} on unparsable content rather than throwing.
 */
export function parseConfigYaml(content) {
  const config = {};
  let currentKey = null;
  let currentList = null;
  let pendingBlockKey = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const listMatch = line.match(/^\s+-\s*(.*)$/);
    if (listMatch && currentKey) {
      if (currentList) {
        currentList.push(stripQuotes(listMatch[1].trim()));
      } else if (pendingBlockKey === currentKey && !Array.isArray(config[currentKey])) {
        // Top-level list (e.g. `conventions:` followed by `- item`)
        config[currentKey] = [stripQuotes(listMatch[1].trim())];
        currentList = config[currentKey];
      }
      continue;
    }

    const kvMatch = line.match(/^(\s*)([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }

    const indent = kvMatch[1].length;
    const key = kvMatch[2];
    const value = kvMatch[3].trim();

    if (indent === 0) {
      currentKey = key;
      currentList = null;
      if (value === "") {
        config[key] = {};
        pendingBlockKey = key;
      } else {
        config[key] = parseScalar(value);
        pendingBlockKey = null;
      }
      continue;
    }

    // Nested key (one level deep)
    if (currentKey && typeof config[currentKey] === "object" && config[currentKey] !== null && !Array.isArray(config[currentKey])) {
      pendingBlockKey = null;
      if (value === "") {
        config[currentKey][key] = [];
        currentList = config[currentKey][key];
      } else {
        config[currentKey][key] = parseScalar(value);
        currentList = null;
      }
    }
  }

  return config;
}

function parseScalar(value) {
  if (value === "null" || value === "~") {
    return null;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return stripQuotes(value);
}

function stripQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/** Parse a list value like `[a, b]` into an array. */
export function parseListValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const inner = value.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
}

export function configPath(workspace) {
  return path.resolve(workspace, CONFIG_FILE_NAME);
}

/**
 * Read the root config for a workspace.
 * Returns { exists, path, config }. A missing config is a detectable fresh-install
 * state (exists: false), not an error.
 */
export function readConfig(workspace) {
  const filePath = configPath(workspace);
  if (!fs.existsSync(filePath)) {
    return { exists: false, path: filePath, config: {} };
  }
  let config = {};
  try {
    config = parseConfigYaml(fs.readFileSync(filePath, "utf8"));
  } catch {
    config = {};
  }
  return { exists: true, path: filePath, config };
}

/** Extract the docs folder from a parsed config, falling back to the default. */
export function getDocsFolder(config) {
  const value = config && config.docs_folder;
  return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_DOCS_FOLDER;
}

export function legacyConfigPath(workspace) {
  return path.resolve(workspace, LEGACY_CONFIG_RELATIVE_PATH);
}

/**
 * Heuristic: does this look like an easyspec config rather than another tool's
 * file that happens to live at docs/config.yaml?
 */
export function looksLikeLegacyEasyspecConfig(config, content) {
  if (typeof content === "string" && /^#\s*Change Lifecycle Configuration/m.test(content)) {
    return true;
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }
  return ["project", "source", "tech_stack", "conventions", "domain"].some((key) =>
    Object.prototype.hasOwnProperty.call(config, key)
  );
}

/**
 * Read the legacy `docs/config.yaml` (pre-configurable-layout projects).
 * Returns { exists, path, config, content, isEasyspecConfig }. A missing legacy
 * config is a normal state, not an error.
 */
export function readLegacyConfig(workspace) {
  const filePath = legacyConfigPath(workspace);
  if (!fs.existsSync(filePath)) {
    return { exists: false, path: filePath, config: {}, content: null, isEasyspecConfig: false };
  }
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const config = parseConfigYaml(content);
    return {
      exists: true,
      path: filePath,
      config,
      content,
      isEasyspecConfig: looksLikeLegacyEasyspecConfig(config, content),
    };
  } catch {
    return { exists: true, path: filePath, config: {}, content: null, isEasyspecConfig: false };
  }
}

/**
 * Render a root config from a legacy `docs/config.yaml`, preserving its YAML
 * body and adding the docs-folder setting. The legacy header comments are
 * replaced with the easyspec-managed header.
 */
export function renderMigratedConfigYaml(legacyContent, docsFolder = LEGACY_DOCS_FOLDER) {
  const folder = docsFolder && docsFolder.trim() ? docsFolder.trim() : LEGACY_DOCS_FOLDER;
  const lines = String(legacyContent || "").replace(/\r\n/g, "\n").split("\n");

  let start = 0;
  while (start < lines.length && (lines[start].trim() === "" || lines[start].trim().startsWith("#"))) {
    start += 1;
  }

  const body = lines
    .slice(start)
    .filter((line) => !/^docs_folder\s*:/.test(line))
    .join("\n")
    .replace(/\s+$/g, "");

  const header = [
    "# easyspec:managed v1",
    "# Easyspec configuration — resolved by every es- agent, prompt, and skill.",
    `# Docs folder: all easyspec content lives under ./${folder}/ (master/, changes/).`,
    `# Migrated from legacy ${LEGACY_CONFIG_RELATIVE_PATH}.`,
  ].join("\n");

  return body ? `${header}\n\n${`docs_folder: ${folder}`}\n\n${body}\n` : `${header}\n\n${`docs_folder: ${folder}`}\n`;
}

/**
 * One-step legacy migration: move `docs/config.yaml` to the root config and
 * keep the existing `docs/` folder as the easyspec docs folder.
 * Never overwrites an existing root config and never runs without an explicit
 * caller decision.
 */
export function migrateLegacyConfig(workspace, { docsFolder = LEGACY_DOCS_FOLDER, dryRun = false } = {}) {
  const legacy = readLegacyConfig(workspace);
  if (!legacy.exists) {
    return { migrated: false, reason: "no-legacy-config" };
  }
  if (!legacy.isEasyspecConfig) {
    return { migrated: false, reason: "not-easyspec-config" };
  }

  const rootPath = configPath(workspace);
  if (fs.existsSync(rootPath)) {
    return { migrated: false, reason: "root-config-exists" };
  }

  const folder = docsFolder && docsFolder.trim() ? docsFolder.trim() : LEGACY_DOCS_FOLDER;

  if (!dryRun) {
    fs.mkdirSync(path.dirname(rootPath), { recursive: true });
    fs.writeFileSync(rootPath, renderMigratedConfigYaml(legacy.content, folder), "utf8");
    fs.rmSync(legacy.path);
  }

  return {
    migrated: true,
    reason: "migrated",
    from: legacy.path,
    to: rootPath,
    docsFolder: folder,
  };
}

/** Derive all easyspec project paths from the confirmed docs folder. */
export function resolveDocsPaths(workspace, docsFolder) {
  const folder = docsFolder && docsFolder.trim() ? docsFolder.trim() : DEFAULT_DOCS_FOLDER;
  return {
    docsFolder: folder,
    configPath: configPath(workspace),
    masterDir: path.resolve(workspace, folder, "master"),
    changesDir: path.resolve(workspace, folder, "changes"),
  };
}

export function renderConfigYaml(docsFolder, context) {
  const ctx = context || {};
  const project = ctx.project || {};
  const lines = [
    "# easyspec:managed v1",
    "# Easyspec configuration — resolved by every es- agent, prompt, and skill.",
    `# Docs folder: all easyspec content lives under ./${docsFolder}/ (master/, changes/).`,
    "",
    `docs_folder: ${docsFolder}`,
    "",
    "project:",
    `  name: ${project.name || "<project name>"}`,
    `  description: ${project.description || "<one-sentence description>"}`,
    "",
    "# Source code locations — used by agents to resolve code references",
    "source:",
    "  frontend: null",
    "  backend: null",
    "  schema: null",
    "  tests: []",
    "",
    "# Technology stack — context for agents, not prescriptive",
    "tech_stack:",
    "  frontend: null",
    "  backend: null",
    "  database: null",
    "  auth: null",
    "  infra: null",
    "",
    "# Key project conventions — agents follow these when making decisions",
    "conventions: []",
    "",
    "# Domain knowledge — business rules agents must always know",
    "domain: []",
    "",
  ];
  return lines.join("\n");
}

/**
 * Scaffold the root config when absent. Never clobbers an existing config.
 * Returns "created" | "exists" | "dry-run".
 */
export function scaffoldConfig(workspace, docsFolder, { dryRun = false } = {}) {
  const filePath = configPath(workspace);
  if (fs.existsSync(filePath)) {
    return "exists";
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, renderConfigYaml(docsFolder), "utf8");
    return "created";
  }
  return "dry-run";
}
