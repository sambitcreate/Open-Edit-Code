import { describe, expect, it } from "vitest";
import { buildSchemaFromData, buildUiSchemaFromData, getDataSections } from "./index";

describe("buildSchemaFromData", () => {
  it("builds an object schema from nested JSON data", () => {
    expect(
      buildSchemaFromData({
        model: "ollama/qwen3.5:cloud",
        enabled: true,
        provider: {
          ollama: {
            options: {
              baseURL: "http://127.0.0.1:11434/v1",
            },
          },
        },
      })
    ).toEqual({
      type: "object",
      properties: {
        model: { type: "string" },
        enabled: { type: "boolean" },
        provider: {
          type: "object",
          properties: {
            ollama: {
              type: "object",
              properties: {
                options: {
                  type: "object",
                  properties: {
                    baseURL: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    });
  });

  it("builds array item schemas from array contents", () => {
    expect(buildSchemaFromData([{ name: "exa" }, { name: "pencil" }])).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        additionalProperties: false,
      },
    });
  });

  it("derives top-level sections from real JSON keys", () => {
    expect(
      getDataSections({
        $schema: "https://opencode.ai/config.json",
        mcp: { exa: { enabled: true } },
        plugin: [],
      })
    ).toEqual([
      { id: "$schema", label: "$schema", kind: "value", tone: "peach" },
      { id: "mcp", label: "mcp", kind: "object", tone: "mint" },
      { id: "plugin", label: "plugin", kind: "array", tone: "blue" },
    ]);
  });

  it("builds a UI schema for the selected top-level section", () => {
    expect(
      buildUiSchemaFromData(
        {
          $schema: "https://opencode.ai/config.json",
          mcp: { exa: { enabled: true } },
        },
        "mcp"
      )
    ).toEqual({
      type: "VerticalLayout",
      elements: [
        {
          type: "Group",
          label: "mcp",
          elements: [
            {
              type: "Control",
              scope: "#/properties/mcp",
            },
          ],
        },
      ],
    });
  });
});
