import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareOpenCodeRuntimeConfig } from "./runtime-config.js";

const cleanupPaths = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...cleanupPaths].map(async (filepath) => {
      await fs.rm(filepath, { recursive: true, force: true });
      cleanupPaths.delete(filepath);
    }),
  );
});

async function makeConfigHome(initialConfig?: Record<string, unknown>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-opencode-test-"));
  cleanupPaths.add(root);
  const configDir = path.join(root, "opencode");
  await fs.mkdir(configDir, { recursive: true });
  if (initialConfig) {
    await fs.writeFile(
      path.join(configDir, "opencode.json"),
      `${JSON.stringify(initialConfig, null, 2)}\n`,
      "utf8",
    );
  }
  return root;
}

describe("prepareOpenCodeRuntimeConfig", () => {
  it("injects an external_directory allow rule by default", async () => {
    const configHome = await makeConfigHome({
      permission: {
        read: "allow",
      },
      theme: "system",
    });

    const prepared = await prepareOpenCodeRuntimeConfig({
      env: { XDG_CONFIG_HOME: configHome },
      config: {},
    });
    cleanupPaths.add(prepared.env.XDG_CONFIG_HOME);

    expect(prepared.env.XDG_CONFIG_HOME).not.toBe(configHome);
    const runtimeConfig = JSON.parse(
      await fs.readFile(
        path.join(prepared.env.XDG_CONFIG_HOME, "opencode", "opencode.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    expect(runtimeConfig).toMatchObject({
      theme: "system",
      permission: {
        read: "allow",
        external_directory: "allow",
      },
    });

    await prepared.cleanup();
    cleanupPaths.delete(prepared.env.XDG_CONFIG_HOME);
    await expect(fs.access(prepared.env.XDG_CONFIG_HOME)).rejects.toThrow();
  });

  it("respects explicit opt-out", async () => {
    const configHome = await makeConfigHome();
    const prepared = await prepareOpenCodeRuntimeConfig({
      env: { XDG_CONFIG_HOME: configHome },
      config: { dangerouslySkipPermissions: false },
    });

    expect(prepared.env).toEqual({ XDG_CONFIG_HOME: configHome });
    expect(prepared.notes).toEqual([]);
    await prepared.cleanup();
  });

  it("places temporary runtime config under TMPDIR when provided", async () => {
    const configHome = await makeConfigHome();
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-opencode-tmpdir-"));
    cleanupPaths.add(tmpRoot);
    const prepared = await prepareOpenCodeRuntimeConfig({
      env: { XDG_CONFIG_HOME: configHome, TMPDIR: tmpRoot },
      config: {},
    });
    cleanupPaths.add(prepared.env.XDG_CONFIG_HOME);

    expect(path.resolve(prepared.env.XDG_CONFIG_HOME).startsWith(path.resolve(tmpRoot))).toBe(true);

    await prepared.cleanup();
    cleanupPaths.delete(prepared.env.XDG_CONFIG_HOME);
  });

  it("merges runtime provider config without writing secrets directly", async () => {
    const configHome = await makeConfigHome({
      theme: "system",
      provider: {
        anthropic: {
          options: {
            timeout: 600000,
          },
        },
      },
    });

    const prepared = await prepareOpenCodeRuntimeConfig({
      env: {
        XDG_CONFIG_HOME: configHome,
        ANTHROPIC_API_KEY: "sk-test-secret",
      },
      config: {
        opencodeRuntimeConfig: {
          model: "anthropic/MiniMax-M3",
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
      },
    });
    cleanupPaths.add(prepared.env.XDG_CONFIG_HOME);

    const rawRuntimeConfig = await fs.readFile(
      path.join(prepared.env.XDG_CONFIG_HOME, "opencode", "opencode.json"),
      "utf8",
    );
    const runtimeConfig = JSON.parse(rawRuntimeConfig) as Record<string, unknown>;

    expect(rawRuntimeConfig).not.toContain("sk-test-secret");
    expect(runtimeConfig).toMatchObject({
      theme: "system",
      model: "anthropic/MiniMax-M3",
      provider: {
        anthropic: {
          models: {
            "MiniMax-M3": {},
          },
          options: {
            timeout: 600000,
            baseURL: "https://api.minimaxi.com/anthropic/v1",
            apiKey: "{env:ANTHROPIC_API_KEY}",
          },
        },
      },
      permission: {
        external_directory: "allow",
      },
    });

    await prepared.cleanup();
    cleanupPaths.delete(prepared.env.XDG_CONFIG_HOME);
  });
});
