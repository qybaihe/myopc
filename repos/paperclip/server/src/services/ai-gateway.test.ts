import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adapterSupportsAiGateway,
  buildAiGatewayAnthropicEnv,
  buildAiGatewayOpenCodeRuntimeConfig,
  buildAiGatewayOpenAiEnv,
  mergeAiGatewayIntoAdapterConfig,
  normalizeAiGatewayBaseUrl,
} from "./ai-gateway.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ai gateway service", () => {
  it("normalizes Anthropic-compatible message endpoints back to the provider root", () => {
    expect(normalizeAiGatewayBaseUrl("https://api.minimaxi.com/anthropic/v1/messages")).toBe(
      "https://api.minimaxi.com/anthropic",
    );
  });

  it("builds MiniMax Anthropic-compatible env without using OpenAI env keys", () => {
    vi.stubEnv("MINIMAX_API_KEY", "sk-minimax-env");

    const env = buildAiGatewayAnthropicEnv({
      enabled: true,
      provider: "anthropic_compatible",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "",
      defaultModel: "MiniMax-M3",
    });

    expect(env).toEqual({
      ANTHROPIC_API_KEY: "sk-minimax-env",
      MINIMAX_API_KEY: "sk-minimax-env",
      ANTHROPIC_BASE_URL: "https://api.minimaxi.com/anthropic",
    });
    expect(buildAiGatewayOpenAiEnv({
      enabled: true,
      provider: "anthropic_compatible",
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-minimax",
      defaultModel: "MiniMax-M3",
    })).toEqual({});
  });

  it("injects MiniMax M3 runtime config into OpenCode only", () => {
    const aiGateway = {
      enabled: true,
      provider: "anthropic_compatible" as const,
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "sk-minimax",
      defaultModel: "MiniMax-M3",
    };

    expect(adapterSupportsAiGateway("opencode_local", aiGateway.provider)).toBe(true);
    expect(adapterSupportsAiGateway("codex_local", aiGateway.provider)).toBe(false);

    const { adapterConfig, injectedSecretKeys } = mergeAiGatewayIntoAdapterConfig({
      adapterType: "opencode_local",
      adapterConfig: {},
      aiGateway,
    });

    expect(injectedSecretKeys).toEqual(["ANTHROPIC_API_KEY", "MINIMAX_API_KEY"]);
    expect(adapterConfig).toMatchObject({
      model: "anthropic/MiniMax-M3",
      env: {
        ANTHROPIC_API_KEY: "sk-minimax",
        MINIMAX_API_KEY: "sk-minimax",
        ANTHROPIC_BASE_URL: "https://api.minimaxi.com/anthropic",
      },
      opencodeRuntimeConfig: {
        model: "anthropic/MiniMax-M3",
        small_model: "anthropic/MiniMax-M3",
        provider: {
          anthropic: {
            models: {
              "MiniMax-M3": {},
            },
            options: {
              baseURL: "https://api.minimaxi.com/anthropic/v1",
              apiKey: "{env:ANTHROPIC_API_KEY}",
            },
          },
        },
      },
    });

    expect(buildAiGatewayOpenCodeRuntimeConfig(aiGateway, {
      ANTHROPIC_API_KEY: "sk-minimax",
    })).toMatchObject({
      model: "anthropic/MiniMax-M3",
      provider: {
        anthropic: {
          options: {
            baseURL: "https://api.minimaxi.com/anthropic/v1",
          },
        },
      },
    });
  });
});
