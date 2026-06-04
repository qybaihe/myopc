import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertRealPathInside,
  assertSandboxPathAllowed,
  resolveSandboxContext,
  sanitizeInheritedAgentEnv,
} from "../services/sandbox-context.js";

const cleanupDirs = new Set<string>();

async function makeTempRoot(prefix: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupDirs.add(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    [...cleanupDirs].map(async (dir) => {
      cleanupDirs.delete(dir);
      await fs.rm(dir, { recursive: true, force: true });
    }),
  );
});

describe("sandbox-context", () => {
  it("resolves tenant-scoped paths and OpenCode runtime env", async () => {
    const root = await makeTempRoot("paperclip-sandbox-context-");
    const toolchains = path.join(root, "toolchains");
    const ctx = await resolveSandboxContext(
      {
        companyId: "company-a",
        userId: "user-a",
        projectId: "project-a",
        workspaceId: "workspace-a",
        runId: "run-a",
      },
      {
        tenantBaseDir: path.join(root, "tenants"),
        toolchainRoot: toolchains,
        createDirs: true,
        env: {
          PATH: "/usr/bin:/bin",
          DATABASE_URL: "postgres://server-secret",
          RESEND_API_KEY: "resend-secret",
          BETTER_AUTH_SECRET: "auth-secret",
          PAPERCLIP_AGENT_JWT_SECRET: "jwt-secret",
          OPENAI_API_KEY: "sk-server-secret",
          STRIPE_SECRET_KEY: "stripe-secret",
          LANG: "C.UTF-8",
        },
      },
    );

    expect(ctx.tenantRoot).toBe(path.join(root, "tenants", "company-a"));
    expect(ctx.homeDir).toBe(path.join(ctx.tenantRoot, "home"));
    expect(ctx.workspaceDir).toBe(path.join(ctx.tenantRoot, "workspaces", "project-a", "workspace-a"));
    expect(ctx.tmpDir).toBe(path.join(ctx.tenantRoot, "tmp"));
    expect(ctx.readonlyToolchains.opencode.command).toBe(
      path.join(toolchains, "opencode", "current", "bin", "opencode"),
    );
    expect(ctx.env.HOME).toBe(ctx.homeDir);
    expect(ctx.env.XDG_CONFIG_HOME).toBe(path.join(ctx.homeDir, ".config"));
    expect(ctx.env.XDG_CACHE_HOME).toBe(path.join(ctx.homeDir, ".cache"));
    expect(ctx.env.TMPDIR).toBe(ctx.tmpDir);
    expect(ctx.env.OPENCODE_DISABLE_PROJECT_CONFIG).toBe("true");
    expect(ctx.env.PAPERCLIP_WORKSPACE_CWD).toBe(ctx.workspaceDir);
    expect(ctx.env.DATABASE_URL).toBeUndefined();
    expect(ctx.env.RESEND_API_KEY).toBeUndefined();
    expect(ctx.env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(ctx.env.PAPERCLIP_AGENT_JWT_SECRET).toBeUndefined();
    expect(ctx.env.OPENAI_API_KEY).toBeUndefined();
    expect(ctx.env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(ctx.env.LANG).toBe("C.UTF-8");
    expect(ctx.env.PATH).toContain(path.join(toolchains, "opencode", "current", "bin"));
    await expect(fs.access(ctx.homeDir)).resolves.toBeUndefined();
    await expect(fs.access(ctx.workspaceDir)).resolves.toBeUndefined();
  });

  it("scrubs inherited server secrets with a strict allowlist", () => {
    const sanitized = sanitizeInheritedAgentEnv({
      PATH: "/usr/bin:/bin",
      HOME: "/Users/server",
      HOST: "0.0.0.0",
      DATABASE_URL: "postgres://server-secret",
      RESEND_API_KEY: "resend-secret",
      BETTER_AUTH_SECRET: "auth-secret",
      PAPERCLIP_AGENT_JWT_SECRET: "jwt-secret",
      OPENAI_API_KEY: "sk-server-secret",
      WEBHOOK_SECRET: "webhook-secret",
      AWS_SECRET_ACCESS_KEY: "aws-secret",
      LANG: "C.UTF-8",
      LC_ALL: "C",
    });

    expect(sanitized).toEqual({
      PATH: "/usr/bin:/bin",
      LANG: "C.UTF-8",
      LC_ALL: "C",
    });
  });

  it("rejects realpath escapes through symlinks", async () => {
    const root = await makeTempRoot("paperclip-sandbox-realpath-");
    const tenantRoot = path.join(root, "tenants", "company-a");
    const outsideRoot = path.join(root, "outside");
    await fs.mkdir(tenantRoot, { recursive: true });
    await fs.mkdir(outsideRoot, { recursive: true });
    const outsideFile = path.join(outsideRoot, "secret.txt");
    await fs.writeFile(outsideFile, "secret", "utf8");
    const linkPath = path.join(tenantRoot, "linked-secret.txt");
    await fs.symlink(outsideFile, linkPath);

    await expect(
      assertRealPathInside({ root: tenantRoot, candidate: linkPath, label: "linked secret" }),
    ).rejects.toThrow(/escapes sandbox root/);
  });

  it("rejects cross-tenant file access", async () => {
    const root = await makeTempRoot("paperclip-sandbox-cross-tenant-");
    const ctxA = await resolveSandboxContext(
      { companyId: "company-a", projectId: "project-a", workspaceId: "workspace-a" },
      { tenantBaseDir: path.join(root, "tenants"), toolchainRoot: path.join(root, "toolchains"), createDirs: true },
    );
    const ctxB = await resolveSandboxContext(
      { companyId: "company-b", projectId: "project-b", workspaceId: "workspace-b" },
      { tenantBaseDir: path.join(root, "tenants"), toolchainRoot: path.join(root, "toolchains"), createDirs: true },
    );
    const bSecret = path.join(ctxB.homeDir, "secret.txt");
    await fs.writeFile(bSecret, "company-b-secret", "utf8");

    await expect(
      assertSandboxPathAllowed({ sandbox: ctxA, candidate: bSecret, access: "write" }),
    ).rejects.toThrow(/outside allowed sandbox roots/);
  });
});
