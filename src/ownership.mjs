import fs from "node:fs";

/**
 * Ownership tag contract — see
 * easyspec-docs/changes/archive/2026-11-02-easyspec-config-and-init-rework/ownership-and-config.md
 *
 * Safety rule: untagged files are never deleted. Detection is a plain substring
 * match on the marker core so it works in any target-tool format.
 */

export const OWNERSHIP_MARKER = "easyspec:managed v1";
export const OWNERSHIP_TAG = `<!-- ${OWNERSHIP_MARKER} -->`;
export const OWNERSHIP_TAG_YAML = `# ${OWNERSHIP_MARKER}`;

/**
 * Embed the ownership tag into text content. Idempotent: content that already
 * carries the marker is returned unchanged. The tag is appended after the
 * frontmatter (if present) so it stays visible in rendered artifacts.
 */
export function embedTag(content) {
  if (hasTag(content)) {
    return content;
  }

  if (content.startsWith("---\n")) {
    const closeIdx = content.indexOf("\n---\n", 4);
    if (closeIdx !== -1) {
      const frontmatter = content.slice(0, closeIdx + 5);
      const rest = content.slice(closeIdx + 5);
      return `${frontmatter}\n${OWNERSHIP_TAG}\n${rest.replace(/^\n+/, "")}`;
    }
  }

  const trimmed = content.replace(/\s+$/, "");
  return `${trimmed}\n\n${OWNERSHIP_TAG}\n`;
}

/** Detect the ownership tag in any text content. */
export function hasTag(content) {
  return typeof content === "string" && content.includes(OWNERSHIP_MARKER);
}

/** Detect the ownership tag in a file on disk. Missing files are untagged. */
export function fileHasTag(filePath) {
  try {
    return hasTag(fs.readFileSync(filePath, "utf8"));
  } catch {
    return false;
  }
}
