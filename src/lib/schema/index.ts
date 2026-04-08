type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  additionalProperties?: boolean;
};

export type JsonFormsUiSchema = {
  type: "VerticalLayout";
  elements: JsonFormsUiGroup[];
};

type JsonFormsUiGroup = {
  type: "Group";
  label: string;
  elements: JsonFormsUiControl[];
};

type JsonFormsUiControl = {
  type: "Control";
  scope: string;
};

export type DataSectionTone = "peach" | "mint" | "blue";

export type DataSection = {
  id: string;
  label: string;
  kind: "object" | "array" | "value";
  tone: DataSectionTone;
};

const sectionTones: DataSectionTone[] = ["peach", "mint", "blue"];

function getPrimitiveSchema(value: unknown): JsonSchema {
  if (value === null) return { type: "null" };
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }

  return { type: "string" };
}

function mergeSchemas(schemas: JsonSchema[]): JsonSchema {
  const unique = schemas.filter(
    (schema, index) =>
      schemas.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(schema)) === index
  );

  if (unique.length === 0) return { type: "string" };
  if (unique.length === 1) return unique[0];

  return { anyOf: unique };
}

export function buildSchemaFromData(value: unknown): JsonSchema {
  if (Array.isArray(value)) {
    return {
      type: "array",
      items: mergeSchemas(value.map((item) => buildSchemaFromData(item))),
    };
  }

  if (typeof value === "object" && value !== null) {
    const properties = Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [key, buildSchemaFromData(childValue)])
    );

    return {
      type: "object",
      properties,
      additionalProperties: false,
    };
  }

  return getPrimitiveSchema(value);
}

function escapeJsonPointerToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function getSectionKind(value: unknown): DataSection["kind"] {
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value !== null) return "object";
  return "value";
}

export function getDataSections(data: Record<string, unknown> | null): DataSection[] {
  if (!data) return [];

  return Object.entries(data).map(([key, value], index) => ({
    id: key,
    label: key,
    kind: getSectionKind(value),
    tone: sectionTones[index % sectionTones.length],
  }));
}

export function buildUiSchemaFromData(
  data: Record<string, unknown>,
  activeSection?: string
): JsonFormsUiSchema {
  const sections = getDataSections(data);
  const selectedSection = activeSection
    ? sections.find((section) => section.id === activeSection) ?? sections[0]
    : undefined;
  const visibleSections = selectedSection ? [selectedSection] : sections;

  return {
    type: "VerticalLayout",
    elements: visibleSections.map((section) => ({
      type: "Group",
      label: section.label,
      elements: [
        {
          type: "Control",
          scope: `#/properties/${escapeJsonPointerToken(section.id)}`,
        },
      ],
    })),
  };
}
