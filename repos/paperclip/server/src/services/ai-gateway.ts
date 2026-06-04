import type {
  InstanceAiGatewaySettings,
  InstanceGeneralSettings,
} from "@paperclipai/shared";
import {
  DEFAULT_INSTANCE_AI_GATEWAY,
  DEFAULT_INSTANCE_AI_GATEWAY_BASE_URL,
  DEFAULT_INSTANCE_AI_GATEWAY_MODEL,
  type InstanceAiGatewayProvider,
} from "@paperclipai/shared";

const OPENAI_COMPATIBLE_GATEWAY_ADAPTER_TYPES = new Set([
  "cursor",
  "opencode_local",
]);
const ANTHROPIC_COMPATIBLE_GATEWAY_ADAPTER_TYPES = new Set(["opencode_local"]);
const OPENCODE_RUNTIME_CONFIG_KEY = "opencodeRuntimeConfig";

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const env: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") env[key] = entry;
  }
  return env;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMergeObjects(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = next[key];
    next[key] = isPlainObject(existing) && isPlainObject(value)
      ? deepMergeObjects(existing, value)
      : value;
  }
  return next;
}

function resolveGatewayProvider(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): InstanceAiGatewayProvider {
  return aiGateway?.provider ?? DEFAULT_INSTANCE_AI_GATEWAY.provider;
}

function resolveGatewayApiKey(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
  envKeys: string[],
): string | null {
  const configured = asNonEmptyString(aiGateway?.apiKey);
  if (configured) return configured;
  for (const key of envKeys) {
    const value = asNonEmptyString(process.env[key]);
    if (value) return value;
  }
  return null;
}

function resolveGatewayBaseUrl(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
  fallback: string,
): string {
  return normalizeAiGatewayBaseUrl(asNonEmptyString(aiGateway?.baseUrl) ?? fallback);
}

function resolveOpenCodeAnthropicBaseUrl(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): string {
  const baseUrl = resolveGatewayBaseUrl(aiGateway, DEFAULT_INSTANCE_AI_GATEWAY_BASE_URL);
  if (!baseUrl) return "";
  try {
    const url = new URL(baseUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/v1")) return url.toString().replace(/\/$/, "");
    url.pathname = `${pathname === "" || pathname === "/" ? "" : pathname}/v1`;
    return url.toString().replace(/\/$/, "");
  } catch {
    return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  }
}

function opencodeModelParts(defaultModel: string | null): {
  provider: string;
  model: string;
  id: string;
} | null {
  const raw = asNonEmptyString(defaultModel) ?? DEFAULT_INSTANCE_AI_GATEWAY_MODEL;
  const slashIndex = raw.indexOf("/");
  const provider = slashIndex > 0 ? raw.slice(0, slashIndex).trim() : "anthropic";
  const model = slashIndex > 0 ? raw.slice(slashIndex + 1).trim() : raw;
  if (!provider || !model) return null;
  return {
    provider,
    model,
    id: `${provider}/${model}`,
  };
}

function resolveGatewayDefaultModelForAdapter(input: {
  adapterType: string | null | undefined;
  provider: InstanceAiGatewayProvider;
  defaultModel: string | null;
}) {
  if (!input.defaultModel) return null;
  if (input.adapterType !== "opencode_local") return input.defaultModel;
  if (input.defaultModel.includes("/")) return input.defaultModel;
  if (input.provider === "anthropic_compatible") return `anthropic/${input.defaultModel}`;
  return `openai/${input.defaultModel}`;
}

export function normalizeAiGatewayBaseUrl(value: unknown): string {
  const raw = asNonEmptyString(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    let pathname = url.pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/models")) pathname = pathname.slice(0, -"/models".length);
    if (pathname.endsWith("/chat/completions")) {
      pathname = pathname.slice(0, -"/chat/completions".length);
    }
    if (pathname.endsWith("/responses")) pathname = pathname.slice(0, -"/responses".length);
    if (pathname.endsWith("/v1/messages")) pathname = pathname.slice(0, -"/v1/messages".length);
    url.pathname = pathname === "" || pathname === "/" ? "/v1" : pathname;
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export function buildAiGatewayOpenAiEnv(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): Record<string, string> {
  if (!aiGateway || aiGateway.enabled !== true) return {};
  if (resolveGatewayProvider(aiGateway) !== "openai_compatible") return {};
  const env: Record<string, string> = {};
  const apiKey = resolveGatewayApiKey(aiGateway, [
    "PAPERCLIP_AI_GATEWAY_API_KEY",
    "MYOPC_AI_GATEWAY_API_KEY",
    "OPENAI_API_KEY",
  ]);
  const baseUrl = normalizeAiGatewayBaseUrl(aiGateway.baseUrl);
  if (apiKey) env.OPENAI_API_KEY = apiKey;
  if (baseUrl) env.OPENAI_BASE_URL = baseUrl;
  return env;
}

export function buildAiGatewayAnthropicEnv(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): Record<string, string> {
  if (!aiGateway || aiGateway.enabled !== true) return {};
  if (resolveGatewayProvider(aiGateway) !== "anthropic_compatible") return {};
  const env: Record<string, string> = {};
  const apiKey = resolveGatewayApiKey(aiGateway, [
    "PAPERCLIP_AI_GATEWAY_API_KEY",
    "MYOPC_AI_GATEWAY_API_KEY",
    "MINIMAX_API_KEY",
  ]);
  const baseUrl = resolveGatewayBaseUrl(aiGateway, DEFAULT_INSTANCE_AI_GATEWAY_BASE_URL);
  if (apiKey) {
    env.ANTHROPIC_API_KEY = apiKey;
    env.MINIMAX_API_KEY = apiKey;
  }
  if (baseUrl) env.ANTHROPIC_BASE_URL = baseUrl;
  return env;
}

export function buildAiGatewayRuntimeEnv(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): Record<string, string> {
  const provider = resolveGatewayProvider(aiGateway);
  return provider === "anthropic_compatible"
    ? buildAiGatewayAnthropicEnv(aiGateway)
    : buildAiGatewayOpenAiEnv(aiGateway);
}

export function buildAiGatewayOpenCodeRuntimeConfig(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
  env: Record<string, string> = {},
): Record<string, unknown> {
  if (!aiGateway || aiGateway.enabled !== true) return {};
  if (resolveGatewayProvider(aiGateway) !== "anthropic_compatible") return {};
  const model = opencodeModelParts(asNonEmptyString(aiGateway.defaultModel));
  if (!model || model.provider !== "anthropic") return {};
  const baseUrl = resolveOpenCodeAnthropicBaseUrl(aiGateway);
  const providerOptions: Record<string, unknown> = {
    baseURL: baseUrl,
  };
  if (asNonEmptyString(env.ANTHROPIC_API_KEY)) {
    providerOptions.apiKey = "{env:ANTHROPIC_API_KEY}";
  }
  return {
    model: model.id,
    small_model: model.id,
    provider: {
      anthropic: {
        models: {
          [model.model]: {},
        },
        options: providerOptions,
      },
    },
  };
}

export function adapterSupportsAiGateway(
  adapterType: string | null | undefined,
  provider?: InstanceAiGatewayProvider | null,
): boolean {
  if (!adapterType) return false;
  const resolvedProvider = provider ?? DEFAULT_INSTANCE_AI_GATEWAY.provider;
  if (resolvedProvider === "anthropic_compatible") {
    return ANTHROPIC_COMPATIBLE_GATEWAY_ADAPTER_TYPES.has(adapterType);
  }
  return OPENAI_COMPATIBLE_GATEWAY_ADAPTER_TYPES.has(adapterType);
}

export function mergeAiGatewayIntoAdapterConfig(input: {
  adapterType: string | null | undefined;
  adapterConfig: Record<string, unknown>;
  aiGateway: InstanceAiGatewaySettings | null | undefined;
}): {
  adapterConfig: Record<string, unknown>;
  injectedSecretKeys: string[];
} {
  const provider = resolveGatewayProvider(input.aiGateway);
  if (!adapterSupportsAiGateway(input.adapterType, provider)) {
    return {
      adapterConfig: input.adapterConfig,
      injectedSecretKeys: [],
    };
  }

  const gatewayEnv = buildAiGatewayRuntimeEnv(input.aiGateway);
  const currentEnv = asStringRecord(input.adapterConfig.env);
  const gatewayDefaultModel =
    input.aiGateway?.enabled === true ? asNonEmptyString(input.aiGateway.defaultModel) : null;
  const adapterDefaultModel = resolveGatewayDefaultModelForAdapter({
    adapterType: input.adapterType,
    provider,
    defaultModel: gatewayDefaultModel,
  });
  const openCodeRuntimeConfig = buildAiGatewayOpenCodeRuntimeConfig(input.aiGateway, {
    ...gatewayEnv,
    ...currentEnv,
  });
  if (Object.keys(gatewayEnv).length === 0 && !gatewayDefaultModel && Object.keys(openCodeRuntimeConfig).length === 0) {
    return {
      adapterConfig: input.adapterConfig,
      injectedSecretKeys: [],
    };
  }
  const nextEnv = { ...currentEnv };
  const injectedSecretKeys: string[] = [];

  if (gatewayEnv.OPENAI_API_KEY && !Object.prototype.hasOwnProperty.call(currentEnv, "OPENAI_API_KEY")) {
    nextEnv.OPENAI_API_KEY = gatewayEnv.OPENAI_API_KEY;
    injectedSecretKeys.push("OPENAI_API_KEY");
  }
  if (gatewayEnv.OPENAI_BASE_URL && !Object.prototype.hasOwnProperty.call(currentEnv, "OPENAI_BASE_URL")) {
    nextEnv.OPENAI_BASE_URL = gatewayEnv.OPENAI_BASE_URL;
  }
  if (gatewayEnv.ANTHROPIC_API_KEY && !Object.prototype.hasOwnProperty.call(currentEnv, "ANTHROPIC_API_KEY")) {
    nextEnv.ANTHROPIC_API_KEY = gatewayEnv.ANTHROPIC_API_KEY;
    injectedSecretKeys.push("ANTHROPIC_API_KEY");
  }
  if (gatewayEnv.MINIMAX_API_KEY && !Object.prototype.hasOwnProperty.call(currentEnv, "MINIMAX_API_KEY")) {
    nextEnv.MINIMAX_API_KEY = gatewayEnv.MINIMAX_API_KEY;
    injectedSecretKeys.push("MINIMAX_API_KEY");
  }
  if (gatewayEnv.ANTHROPIC_BASE_URL && !Object.prototype.hasOwnProperty.call(currentEnv, "ANTHROPIC_BASE_URL")) {
    nextEnv.ANTHROPIC_BASE_URL = gatewayEnv.ANTHROPIC_BASE_URL;
  }

  const nextConfig: Record<string, unknown> = {
    ...input.adapterConfig,
    ...(Object.keys(nextEnv).length > 0 ? { env: nextEnv } : {}),
  };

  if (!asNonEmptyString(nextConfig.model) && adapterDefaultModel) {
    nextConfig.model = adapterDefaultModel;
  }

  if (Object.keys(openCodeRuntimeConfig).length > 0 && input.adapterType === "opencode_local") {
    const existingRuntimeConfig = isPlainObject(nextConfig[OPENCODE_RUNTIME_CONFIG_KEY])
      ? (nextConfig[OPENCODE_RUNTIME_CONFIG_KEY] as Record<string, unknown>)
      : {};
    nextConfig[OPENCODE_RUNTIME_CONFIG_KEY] = deepMergeObjects(openCodeRuntimeConfig, existingRuntimeConfig);
  }

  return {
    adapterConfig: nextConfig,
    injectedSecretKeys,
  };
}

export function redactAiGatewayForLogs(
  aiGateway: InstanceAiGatewaySettings | null | undefined,
): InstanceAiGatewaySettings {
  return {
    enabled: aiGateway?.enabled === true,
    provider: aiGateway?.provider ?? DEFAULT_INSTANCE_AI_GATEWAY.provider,
    baseUrl: aiGateway?.baseUrl ?? DEFAULT_INSTANCE_AI_GATEWAY.baseUrl,
    apiKey: asNonEmptyString(aiGateway?.apiKey) ? "***REDACTED***" : "",
    defaultModel: aiGateway?.defaultModel ?? DEFAULT_INSTANCE_AI_GATEWAY.defaultModel,
  };
}

export function redactInstanceGeneralSettingsForLogs(
  general: InstanceGeneralSettings,
): InstanceGeneralSettings {
  return {
    ...general,
    aiGateway: redactAiGatewayForLogs(general.aiGateway),
  };
}

export function redactInstanceGeneralSettingsForRead(
  general: InstanceGeneralSettings,
): InstanceGeneralSettings {
  return {
    ...general,
    aiGateway: {
      ...general.aiGateway,
      apiKey: "",
    },
  };
}

export function buildOpenAiModelsEndpoint(baseUrl: string | null | undefined): string {
  const normalizedBaseUrl = normalizeAiGatewayBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return "https://api.openai.com/v1/models";
  return new URL("models", `${normalizedBaseUrl.replace(/\/$/, "")}/`).toString();
}
