import fs from "node:fs/promises";
import path from "node:path";
import { resolvePaperclipInstanceRoot } from "../home-paths.js";

const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;
const DEFAULT_TOOLCHAIN_ROOT = "/opt/myopc/toolchains";
const DEFAULT_PLATFORM_PATH = "/usr/local/bin:/opt/homebrew/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin";

const SAFE_INHERITED_ENV_KEYS = new Set([
  "PATH",
  "Path",
  "PATHEXT",
  "ComSpec",
  "SystemRoot",
  "WINDIR",
  "SHELL",
  "TERM",
  "COLORTERM",
  "LANG",
  "LANGUAGE",
  "TZ",
  "CI",
  "NODE_ENV",
]);

const BLOCKED_INHERITED_ENV_KEYS = new Set([
  "DATABASE_URL",
  "RESEND_API_KEY",
  "BETTER_AUTH_SECRET",
  "PAPERCLIP_AGENT_JWT_SECRET",
  "PAPERCLIP_SECRETS_MASTER_KEY",
  "PAPERCLIP_SECRETS_MASTER_KEY_FILE",
  "PAPERCLIP_SECRETS_AWS_KMS_KEY_ID",
  "PAPERCLIP_SECRETS_AWS_DEPLOYMENT_ID",
  "PAPERCLIP_SECRETS_AWS_ENDPOINT",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GITHUB_TOKEN",
  "GITLAB_TOKEN",
  "SLACK_BOT_TOKEN",
]);

const BLOCKED_INHERITED_ENV_KEY_RE = /(?:^|_)(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|AUTHORIZATION|COOKIE|PRIVATE[_-]?KEY|WEBHOOK)(?:$|_)/i;

export interface SandboxContextInput {
  companyId: string;
  userId?: string | null;
  projectId?: string | null;
  workspaceId?: string | null;
  runId?: string | null;
  workspaceDir?: string | null;
}

export interface SandboxContextOptions {
  env?: NodeJS.ProcessEnv;
  tenantBaseDir?: string;
  toolchainRoot?: string;
  createDirs?: boolean;
}

export interface SandboxContext {
  version: 1;
  companyId: string;
  userId: string | null;
  projectId: string | null;
  workspaceId: string | null;
  runId: string | null;
  tenantRoot: string;
  homeDir: string;
  workspaceDir: string;
  tmpDir: string;
  logDir: string;
  runtimeDir: string;
  identity: {
    uid: number | null;
    gid: number | null;
    provider: "path_only" | "linux_user" | "container";
  };
  readonlyToolchains: {
    root: string;
    opencode: {
      root: string;
      binDir: string;
      command: string;
    };
  };
  env: Record<string, string>;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInt(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function assertPathSegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!PATH_SEGMENT_RE.test(trimmed)) {
    throw new Error(`Invalid ${label} for sandbox path: "${value}".`);
  }
  return trimmed;
}

function optionalPathSegment(value: string | null | undefined, label: string, fallback: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;
  return assertPathSegment(trimmed, label);
}

function resolveTenantBaseDir(env: NodeJS.ProcessEnv, override?: string): string {
  return path.resolve(
    override?.trim() ||
      env.MYOPC_TENANTS_ROOT?.trim() ||
      env.PAPERCLIP_TENANTS_ROOT?.trim() ||
      path.join(resolvePaperclipInstanceRoot(), "tenants"),
  );
}

function resolveToolchainRoot(env: NodeJS.ProcessEnv, override?: string): string {
  return path.resolve(
    override?.trim() ||
      env.MYOPC_TOOLCHAINS_ROOT?.trim() ||
      env.PAPERCLIP_TOOLCHAINS_ROOT?.trim() ||
      DEFAULT_TOOLCHAIN_ROOT,
  );
}

function resolveOpenCodeCommand(env: NodeJS.ProcessEnv, toolchainRoot: string): string {
  const configured =
    readNonEmptyString(env.MYOPC_OPENCODE_COMMAND) ??
    readNonEmptyString(env.PAPERCLIP_OPENCODE_TOOLCHAIN_COMMAND);
  return configured ? path.resolve(configured) : path.join(toolchainRoot, "opencode", "current", "bin", "opencode");
}

function shouldKeepInheritedEnvKey(key: string): boolean {
  if (key.startsWith("LC_")) return true;
  return SAFE_INHERITED_ENV_KEYS.has(key);
}

function isBlockedInheritedEnvKey(key: string): boolean {
  const normalized = key.toUpperCase();
  return BLOCKED_INHERITED_ENV_KEYS.has(normalized) || BLOCKED_INHERITED_ENV_KEY_RE.test(key);
}

export function sanitizeInheritedAgentEnv(baseEnv: NodeJS.ProcessEnv): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (typeof value !== "string") continue;
    if (isBlockedInheritedEnvKey(key)) continue;
    if (!shouldKeepInheritedEnvKey(key)) continue;
    sanitized[key] = value;
  }
  if (!sanitized.PATH && !sanitized.Path) {
    sanitized.PATH = DEFAULT_PLATFORM_PATH;
  }
  return sanitized;
}

function prependPathSegment(env: Record<string, string>, dir: string) {
  const key = env.Path && !env.PATH ? "Path" : "PATH";
  const current = env[key] ?? "";
  const entries = current.split(path.delimiter).filter(Boolean);
  if (!entries.includes(dir)) entries.unshift(dir);
  env[key] = entries.length > 0 ? entries.join(path.delimiter) : dir;
}

export function buildSandboxedAgentEnv(input: {
  sandbox: Omit<SandboxContext, "env">;
  inheritedEnv?: NodeJS.ProcessEnv;
  explicitEnv?: Record<string, string>;
}): Record<string, string> {
  const env: Record<string, string> = {
    ...sanitizeInheritedAgentEnv(input.inheritedEnv ?? process.env),
    ...(input.explicitEnv ?? {}),
  };
  env.HOME = input.sandbox.homeDir;
  env.XDG_CONFIG_HOME = path.join(input.sandbox.homeDir, ".config");
  env.XDG_CACHE_HOME = path.join(input.sandbox.homeDir, ".cache");
  env.XDG_DATA_HOME = path.join(input.sandbox.homeDir, ".local", "share");
  env.XDG_STATE_HOME = path.join(input.sandbox.homeDir, ".local", "state");
  env.TMPDIR = input.sandbox.tmpDir;
  env.TMP = input.sandbox.tmpDir;
  env.TEMP = input.sandbox.tmpDir;
  env.OPENCODE_DISABLE_PROJECT_CONFIG = "true";
  env.PAPERCLIP_WORKSPACE_CWD = input.sandbox.workspaceDir;
  env.PAPERCLIP_TENANT_ROOT = input.sandbox.tenantRoot;
  env.PAPERCLIP_SANDBOX_HOME = input.sandbox.homeDir;
  env.PAPERCLIP_SANDBOX_TMPDIR = input.sandbox.tmpDir;
  prependPathSegment(env, input.sandbox.readonlyToolchains.opencode.binDir);
  return env;
}

export async function resolveSandboxContext(
  input: SandboxContextInput,
  options: SandboxContextOptions = {},
): Promise<SandboxContext> {
  const env = options.env ?? process.env;
  const companyId = assertPathSegment(input.companyId, "companyId");
  const userId = readNonEmptyString(input.userId);
  const projectId = readNonEmptyString(input.projectId);
  const workspaceId = readNonEmptyString(input.workspaceId);
  const runId = readNonEmptyString(input.runId);
  const tenantBaseDir = resolveTenantBaseDir(env, options.tenantBaseDir);
  const tenantRoot = path.join(tenantBaseDir, companyId);
  const homeDir = path.join(tenantRoot, "home");
  const projectSegment = optionalPathSegment(projectId, "projectId", "_no_project");
  const workspaceSegment = optionalPathSegment(workspaceId ?? runId, "workspaceId", "_default");
  const workspaceDir = input.workspaceDir?.trim()
    ? path.resolve(input.workspaceDir)
    : path.join(tenantRoot, "workspaces", projectSegment, workspaceSegment);
  const tmpDir = path.join(tenantRoot, "tmp");
  const logDir = path.join(tenantRoot, "logs");
  const runtimeDir = path.join(tenantRoot, "runtime", "opencode");
  const toolchainRoot = resolveToolchainRoot(env, options.toolchainRoot);
  const opencodeCommand = resolveOpenCodeCommand(env, toolchainRoot);
  const sandboxWithoutEnv: Omit<SandboxContext, "env"> = {
    version: 1,
    companyId,
    userId,
    projectId,
    workspaceId,
    runId,
    tenantRoot,
    homeDir,
    workspaceDir,
    tmpDir,
    logDir,
    runtimeDir,
    identity: {
      uid: parseOptionalInt(env.MYOPC_SANDBOX_UID),
      gid: parseOptionalInt(env.MYOPC_SANDBOX_GID),
      provider: parseOptionalInt(env.MYOPC_SANDBOX_UID) !== null ? "linux_user" : "path_only",
    },
    readonlyToolchains: {
      root: toolchainRoot,
      opencode: {
        root: path.join(toolchainRoot, "opencode"),
        binDir: path.dirname(opencodeCommand),
        command: opencodeCommand,
      },
    },
  };

  if (options.createDirs) {
    await Promise.all([
      fs.mkdir(homeDir, { recursive: true }),
      fs.mkdir(path.join(homeDir, ".config"), { recursive: true }),
      fs.mkdir(path.join(homeDir, ".cache"), { recursive: true }),
      fs.mkdir(path.join(homeDir, ".local", "share"), { recursive: true }),
      fs.mkdir(path.join(homeDir, ".local", "state"), { recursive: true }),
      fs.mkdir(workspaceDir, { recursive: true }),
      fs.mkdir(tmpDir, { recursive: true }),
      fs.mkdir(logDir, { recursive: true }),
      fs.mkdir(runtimeDir, { recursive: true }),
    ]);
  }

  return {
    ...sandboxWithoutEnv,
    env: buildSandboxedAgentEnv({
      sandbox: sandboxWithoutEnv,
      inheritedEnv: env,
    }),
  };
}

function pathIsInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function assertRealPathInside(input: {
  root: string;
  candidate: string;
  label?: string;
}): Promise<string> {
  const rootReal = await fs.realpath(input.root);
  const candidateReal = await fs.realpath(input.candidate);
  if (!pathIsInside(rootReal, candidateReal)) {
    throw new Error(
      `${input.label ?? "path"} escapes sandbox root: ${candidateReal} is not inside ${rootReal}`,
    );
  }
  return candidateReal;
}

export async function assertSandboxPathAllowed(input: {
  sandbox: Pick<SandboxContext, "tenantRoot" | "readonlyToolchains">;
  candidate: string;
  access?: "read" | "write";
}): Promise<string> {
  const candidateReal = await fs.realpath(input.candidate);
  const allowedRoots = [input.sandbox.tenantRoot];
  if (input.access === "read") {
    allowedRoots.push(input.sandbox.readonlyToolchains.root);
  }

  for (const root of allowedRoots) {
    try {
      const rootReal = await fs.realpath(root);
      if (pathIsInside(rootReal, candidateReal)) return candidateReal;
    } catch (err) {
      if ((err as NodeJS.ErrnoException | null)?.code !== "ENOENT") throw err;
    }
  }

  throw new Error(`Path is outside allowed sandbox roots: ${candidateReal}`);
}
