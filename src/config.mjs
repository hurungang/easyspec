import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE_NAME = "easyspec-config.yaml";
export const DEFAULT_DOCS_FOLDER = "easyspec-docs";

/**
 * Minimal dependency-free parser for the flat easyspec config shape:
 * top-level scalar keys plus two-level maps and simple lists.
 * Returns {} on unparsable content rather than throwing.
 */
export function parseConfigYaml(content) {
  const config = {};
  let currentKey = null;
  let currentList = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }

    const listMatch = line.match(/^\s+-\s*(.*)$/);
    if (listMatch && currentKey) {
      if (currentList) {
        currentList.push(stripQuotes(listMatch[1].trim()));
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
        currentList = null;
      } else {
        config[key] = parseScalar(value);
      }
      continue;
    }

    // Nested key (one level deep)
    if (currentKey && typeof config[currentKey] === "object" && config[currentKey] !== null && !Array.isArray(config[currentKey])) {
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
