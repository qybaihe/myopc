import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const {
  ensureOpenCodeModelConfiguredAndAvailable,
  ensureAdapterExecutionTargetCommandResolvable,
  ensureAdapterExecutionTargetRuntimeCommandInstalled,
  resolveAdapterExecutionTargetCommandForLogs,
  runAdapterExecutionTargetProcess,
} = vi.hoisted(() => ({
  ensureOpenCodeModelConfiguredAndAvailable: vi.fn(async () => undefined),
  ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => undefined),
  ensureAdapterExecutionTargetRuntimeCommandInstalled: vi.fn(async () => undefined),
  resolveAdapterExecutionTargetCommandForLogs: vi.fn(async () => "opencode"),
  runAdapterExecutionTargetProcess: vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: [
      JSON.stringify({ type: "step_start", sessionID: "session-tenant" }),
      JSON.stringify({ type: "text", sessionID: "session-tenant", part: { text: "hello" } }),
      JSON.stringify({
        type: "step_finish",
        sessionID: "session-tenant",
        part: { cost: 0.001, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } },
      }),
    ].join("\n"),
    stderr: "",
    pid: 123,
    startedAt: new Date().toISOString(),
  })),
}));

vi.mock("./models.js", async () => {
  const actual = await vi.importActual<typeof import("./models.js")>("./models.js");
  return {
    ...actual,
    ensureOpenCodeModelConfiguredAndAvailable,
  };
});

vi.mock("@paperclipai/adapter-utils/execution-target", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/execution-target")>(
    "@paperclipai/adapter-utils/execution-target",
  );
  return {
    ...actual,
    ensureAdapterExecutionTargetCommandResolvable,
    ensureAdapterExecutionTargetRuntimeCommandInstalled,
    resolveAdapterExecutionTargetCommandForLogs,
    runAdapterExecutionTargetProcess,
  };
});

import { execute } from "./execute.js";

describe("opencode sandbox context", () => {
  const cleanupDirs: string[] = [];
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalResendApiKey = process.env.RESEND_API_KEY;

  afterEach(async () => {
    vi.clearAllMocks();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalResendApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalResendApiKey;
    while (cleanupDirs.length > 0) {
      const dir = cleanupDirs.pop();
      if (dir) await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  it("uses tenant HOME, tmp, workspace env, and does not forward host secrets", async () => {
    process.env.DATABASE_URL = "postgres://server-secret";
    process.env.RESEND_API_KEY = "resend-secret";
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-opencode-sandbox-"));
    cleanupDirs.push(root);
    const tenantRoot = path.join(root, "tenants", "company-a");
    const homeDir = path.join(tenantRoot, "home");
    const workspaceDir = path.join(tenantRoot, "workspaces", "project-a", "workspace-a");
    const tmpDir = path.join(tenantRoot, "tmp");
    const opencodeBinDir = path.join(root, "toolchains", "opencode", "current", "bin");
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.mkdir(tmpDir, { recursive: true });

    await execute({
      runId: "run-sandbox",
      agent: {
        id: "agent-1",
        companyId: "company-a",
        name: "OpenCode Builder",
        adapterType: "opencode_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        command: "opencode",
        model: "openai/gpt-5.4",
      },
      context: {
        paperclipWorkspace: {
          cwd: workspaceDir,
          source: "project_primary",
          workspaceId: "workspace-a",
        },
        paperclipSandbox: {
          version: 1,
          tenantRoot,
          homeDir,
          workspaceDir,
          tmpDir,
          env: {
            PATH: "/usr/bin:/bin",
            HOME: homeDir,
            XDG_CONFIG_HOME: path.join(homeDir, ".config"),
            XDG_CACHE_HOME: path.join(homeDir, ".cache"),
            TMPDIR: tmpDir,
            OPENCODE_DISABLE_PROJECT_CONFIG: "true",
            PAPERCLIP_WORKSPACE_CWD: workspaceDir,
          },
          readonlyToolchains: {
            opencode: {
              binDir: opencodeBinDir,
              command: path.join(opencodeBinDir, "opencode"),
            },
          },
        },
      },
      onLog: async () => {},
    });

    expect(ensureOpenCodeModelConfiguredAndAvailable).toHaveBeenCalledTimes(1);
    const modelProbeCalls = (ensureOpenCodeModelConfiguredAndAvailable as unknown as {
      mock: { calls: Array<[{ env: Record<string, string> }]> };
    }).mock.calls;
    const modelProbeEnv = modelProbeCalls[0]![0].env;
    expect(modelProbeEnv.HOME).toBe(homeDir);
    expect(modelProbeEnv.XDG_CACHE_HOME).toBe(path.join(homeDir, ".cache"));
    expect(modelProbeEnv.TMPDIR).toBe(tmpDir);
    expect(modelProbeEnv.PATH).toContain(opencodeBinDir);
    expect(modelProbeEnv.DATABASE_URL).toBeUndefined();
    expect(modelProbeEnv.RESEND_API_KEY).toBeUndefined();

    const runCalls = (runAdapterExecutionTargetProcess as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    const runCall = runCalls.find((entry) =>
      Array.isArray(entry[3]) && entry[3].includes("run")
    ) as
      | [string, unknown, string, string[], { env: Record<string, string> }]
      | undefined;
    expect(runCall?.[4].env.HOME).toBe(homeDir);
    expect(runCall?.[4].env.TMPDIR).toBe(tmpDir);
    expect(runCall?.[4].env.PAPERCLIP_WORKSPACE_CWD).toBe(workspaceDir);
    expect(runCall?.[4].env.OPENCODE_DISABLE_PROJECT_CONFIG).toBe("true");
    expect(runCall?.[4].env.DATABASE_URL).toBeUndefined();
    expect(runCall?.[4].env.RESEND_API_KEY).toBeUndefined();
    expect(runCall?.[4].env.XDG_CONFIG_HOME.startsWith(tmpDir)).toBe(true);
  });
});
