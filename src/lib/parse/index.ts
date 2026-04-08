import type { FileFormat } from "@/types";

export function supportsStructuredEditing(format: FileFormat): boolean {
  return format === "json" || format === "jsonc";
}

export function supportsVisualEditing(format: FileFormat): boolean {
  return format === "json";
}

export function detectFormat(filePath: string): FileFormat {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jsonc")) return "jsonc";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  if (lower.endsWith(".toml")) return "toml";
  return "json";
}

export function parseJson(content: string): {
  data: Record<string, unknown> | null;
  error: string | null;
} {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { data: parsed as Record<string, unknown>, error: null };
    }
    if (Array.isArray(parsed)) {
      return { data: { _root: parsed } as Record<string, unknown>, error: null };
    }
    return { data: null, error: "Root value is not an object or array" };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}

export function serializeJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

export function stripJsoncComments(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

export function parseContent(content: string, format: FileFormat): {
  data: Record<string, unknown> | null;
  error: string | null;
} {
  switch (format) {
    case "json":
      return parseJson(content);
    case "jsonc": {
      const stripped = stripJsoncComments(content);
      return parseJson(stripped);
    }
    case "yaml":
    case "toml":
      return {
        data: null,
        error: `${format.toUpperCase()} structured editing is not available yet. Raw mode is still available.`,
      };
    default:
      return parseJson(content);
  }
}

export function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}
