import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asBoolean } from "@paperclipai/adapter-utils/server-utils";

type PreparedOpenCodeRuntimeConfig = {
  env: Record<string, string>;
  notes: string[];
  cleanup: () => Promise<void>;
};

const OPENCODE_RUNTIME_CONFIG_KEY = "opencodeRuntimeConfig";

function resolveXdgConfigHome(env: Record<string, string>): string {
  return (
    (typeof env.XDG_CONFIG_HOME === "string" && env.XDG_CONFIG_HOME.trim()) ||
    (typeof process.env.XDG_CONFIG_HOME === "string" && process.env.XDG_CONFIG_HOME.trim()) ||
    path.join(os.homedir(), ".config")
  );
}

function resolveTmpRoot(env: Record<string, string>): string {
  return (
    (typeof env.TMPDIR === "string" && env.TMPDIR.trim()) ||
    (typeof env.TMP === "string" && env.TMP.trim()) ||
    (typeof env.TEMP === "string" && env.TEMP.trim()) ||
    os.tmpdir()
  );
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

async function readJsonObject(filepath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(filepath, "utf8");
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function prepareOpenCodeRuntimeConfig(input: {
  env: Record<string, string>;
  config: Record<string, unknown>;
  targetIsRemote?: boolean;
}): Promise<PreparedOpenCodeRuntimeConfig> {
  const skipPermissions = asBoolean(input.config.dangerouslySkipPermissions, true);
  const runtimeConfigPatch = isPlainObject(input.config[OPENCODE_RUNTIME_CONFIG_KEY])
    ? (input.config[OPENCODE_RUNTIME_CONFIG_KEY] as Record<string, unknown>)
    : {};
  const hasRuntimeConfigPatch = Object.keys(runtimeConfigPatch).length > 0;
  if (!skipPermissions && !hasRuntimeConfigPatch) {
    return {
      env: input.env,
      notes: [],
      cleanup: async () => {},
    };
  }

  // For remote execution targets the host XDG_CONFIG_HOME path is meaningless
  // (and actively harmful — it leaks a macOS-only path into the remote Linux
  // env). Callers that need to ship a runtime opencode config to the remote
  // box do that via prepareAdapterExecutionTargetRuntime in execute.ts; this
  // host-fs helper is local-only.
  if (input.targetIsRemote && !hasRuntimeConfigPatch) {
    return {
      env: input.env,
      notes: [],
      cleanup: async () => {},
    };
  }

  const sourceConfigDir = path.join(resolveXdgConfigHome(input.env), "opencode");
  const tmpRoot = resolveTmpRoot(input.env);
  await fs.mkdir(tmpRoot, { recursive: true });
  const runtimeConfigHome = await fs.mkdtemp(path.join(tmpRoot, "paperclip-opencode-config-"));
  const runtimeConfigDir = path.join(runtimeConfigHome, "opencode");
  const runtimeConfigPath = path.join(runtimeConfigDir, "opencode.json");

  await fs.mkdir(runtimeConfigDir, { recursive: true });
  try {
    await fs.cp(sourceConfigDir, runtimeConfigDir, {
      recursive: true,
      force: true,
      errorOnExist: false,
      dereference: false,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException | null)?.code !== "ENOENT") {
      throw err;
    }
  }

  const existingConfig = await readJsonObject(runtimeConfigPath);
  const existingPermission = isPlainObject(existingConfig.permission)
    ? existingConfig.permission
    : {};
  const permissionConfig = skipPermissions
    ? {
        permission: {
          ...existingPermission,
          external_directory: "allow",
        },
      }
    : {};
  const nextConfig = deepMergeObjects(
    deepMergeObjects(existingConfig, runtimeConfigPatch),
    permissionConfig,
  );
  await fs.writeFile(runtimeConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");

  const notes = [];
  if (skipPermissions) {
    notes.push(
      "Injected runtime OpenCode config with permission.external_directory=allow to avoid headless approval prompts.",
    );
  }
  if (hasRuntimeConfigPatch) {
    notes.push("Injected runtime OpenCode provider config from the MyOPC AI gateway.");
  }

  return {
    env: {
      ...input.env,
      XDG_CONFIG_HOME: runtimeConfigHome,
    },
    notes,
    cleanup: async () => {
      await fs.rm(runtimeConfigHome, { recursive: true, force: true });
    },
  };
}
