import type { ConfigRootKind, FileFormat, JsonFormatPreferences } from "@/types";

interface ParseResult {
  data: Record<string, unknown> | null;
  error: string | null;
  rootKind: ConfigRootKind | null;
}

export function supportsStructuredEditing(format: FileFormat): boolean {
  return format === "json" || format === "jsonc";
}

export function supportsVisualEditing(format: FileFormat): boolean {
  return supportsStructuredEditing(format);
}

export function detectFormat(filePath: string): FileFormat {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jsonc")) return "jsonc";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return "yaml";
  if (lower.endsWith(".toml")) return "toml";
  return "json";
}

export function parseJson(content: string): ParseResult {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return {
        data: parsed as Record<string, unknown>,
        error: null,
        rootKind: "object",
      };
    }
    if (Array.isArray(parsed)) {
      return {
        data: { _root: parsed } as Record<string, unknown>,
        error: null,
        rootKind: "array",
      };
    }
    return { data: null, error: "Root value is not an object or array", rootKind: null };
  } catch (e) {
    return { data: null, error: (e as Error).message, rootKind: null };
  }
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)])
    );
  }

  return value;
}

export function serializeJson(
  data: Record<string, unknown>,
  rootKind: ConfigRootKind = "object",
  options?: Partial<JsonFormatPreferences>
): string {
  const output = rootKind === "array" ? data._root : data;
  const normalized = options?.sortKeys ? sortJsonValue(output) : output;
  const indentSize = options?.indentSize === 4 ? 4 : 2;

  return JSON.stringify(normalized, null, indentSize);
}

function analyzeJsoncContent(content: string): { stripped: string; hasComments: boolean } {
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let hasComments = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        result += char;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i++;
        continue;
      }

      if (char === "\n" || char === "\r") {
        result += char;
      }
      continue;
    }

    if (inString) {
      result += char;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      hasComments = true;
      inLineComment = true;
      i++;
      continue;
    }

    if (char === "/" && next === "*") {
      hasComments = true;
      inBlockComment = true;
      i++;
      continue;
    }

    result += char;
  }

  return { stripped: result.trim(), hasComments };
}

export function stripJsoncComments(content: string): string {
  return analyzeJsoncContent(content).stripped;
}

export function hasJsoncComments(content: string): boolean {
  return analyzeJsoncContent(content).hasComments;
}

export function parseContent(content: string, format: FileFormat): ParseResult {
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
        error: null,
        rootKind: null,
      };
    default:
      return parseJson(content);
  }
}

export function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}
