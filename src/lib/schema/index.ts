export const defaultConfigSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Configuration name",
    },
    version: {
      type: "string",
      description: "Configuration version",
    },
    description: {
      type: "string",
      description: "Configuration description",
    },
    enabled: {
      type: "boolean",
      default: true,
      description: "Enable or disable this configuration",
    },
    debug: {
      type: "boolean",
      default: false,
      description: "Enable debug mode",
    },
    logLevel: {
      type: "string",
      enum: ["trace", "debug", "info", "warn", "error"],
      default: "info",
      description: "Logging verbosity level",
    },
    port: {
      type: "integer",
      minimum: 1,
      maximum: 65535,
      default: 3000,
      description: "Service port number",
    },
    host: {
      type: "string",
      default: "localhost",
      description: "Service host address",
    },
    apiKey: {
      type: "string",
      description: "API key (masked in UI)",
      format: "password",
    },
    basePath: {
      type: "string",
      description: "Base directory path",
      format: "directory",
    },
    providers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string", format: "uri" },
          apiKey: { type: "string", format: "password" },
          enabled: { type: "boolean", default: true },
        },
        required: ["name"],
      },
      description: "List of providers",
    },
    plugins: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          enabled: { type: "boolean", default: true },
          config: { type: "object" },
        },
        required: ["name"],
      },
      description: "List of plugins",
    },
    profiles: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          description: { type: "string" },
          settings: { type: "object" },
        },
      },
      description: "Named configuration profiles",
    },
    advanced: {
      type: "object",
      properties: {
        timeout: {
          type: "integer",
          default: 30000,
          description: "Request timeout in milliseconds",
        },
        retries: {
          type: "integer",
          default: 3,
          description: "Number of retry attempts",
        },
        cacheEnabled: {
          type: "boolean",
          default: true,
          description: "Enable caching",
        },
      },
      description: "Advanced settings",
    },
  },
};

export const defaultUiSchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Group",
      label: "General",
      elements: [
        { type: "Control", scope: "#/properties/name" },
        { type: "Control", scope: "#/properties/version" },
        { type: "Control", scope: "#/properties/description" },
        { type: "Control", scope: "#/properties/enabled" },
        { type: "Control", scope: "#/properties/debug" },
        { type: "Control", scope: "#/properties/logLevel" },
      ],
    },
    {
      type: "Group",
      label: "Network",
      elements: [
        { type: "Control", scope: "#/properties/port" },
        { type: "Control", scope: "#/properties/host" },
        { type: "Control", scope: "#/properties/timeout", options: { hide: true } },
      ],
    },
    {
      type: "Group",
      label: "Security",
      elements: [
        { type: "Control", scope: "#/properties/apiKey" },
        { type: "Control", scope: "#/properties/basePath" },
      ],
    },
    {
      type: "Group",
      label: "Providers",
      elements: [{ type: "Control", scope: "#/properties/providers" }],
    },
    {
      type: "Group",
      label: "Plugins",
      elements: [{ type: "Control", scope: "#/properties/plugins" }],
    },
    {
      type: "Group",
      label: "Profiles",
      elements: [{ type: "Control", scope: "#/properties/profiles" }],
    },
    {
      type: "Group",
      label: "Advanced",
      elements: [
        { type: "Control", scope: "#/properties/advanced/properties/timeout" },
        { type: "Control", scope: "#/properties/advanced/properties/retries" },
        { type: "Control", scope: "#/properties/advanced/properties/cacheEnabled" },
      ],
    },
  ],
};
