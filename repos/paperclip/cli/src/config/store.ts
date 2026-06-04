import fs from "node:fs";
import path from "node:path";
import { paperclipConfigSchema, type PaperclipConfig } from "./schema.js";
import {
  resolveDefaultConfigPath,
  resolvePaperclipInstanceId,
} from "./home.js";

const DEFAULT_CONFIG_BASENAME = "config.json";

function findConfigFileFromAncestors(startDir: string): string | null {
  const absoluteStartDir = path.resolve(startDir);
  let currentDir = absoluteStartDir;

  while (true) {
    const candidate = path.resolve(currentDir, ".paperclip", DEFAULT_CONFIG_BASENAME);
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const nextDir = path.resolve(currentDir, "..");
    if (nextDir === currentDir) break;
    currentDir = nextDir;
  }

  return null;
}

export function resolveConfigPath(overridePath?: string): string {
  if (overridePath) return path.resolve(overridePath);
  if (process.env.PAPERCLIP_CONFIG) return path.resolve(process.env.PAPERCLIP_CONFIG);
  return findConfigFileFromAncestors(process.cwd()) ?? resolveDefaultConfigPath(resolvePaperclipInstanceId());
}

function parseJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveLegacyRuntimePaths(filePath: string) {
  const runtimeRoot = path.dirname(path.resolve(filePath));
  return {
    runtimeRoot,
    dbDir: path.resolve(runtimeRoot, "db"),
    backupDir: path.resolve(runtimeRoot, "data", "backups"),
    logDir: path.resolve(runtimeRoot, "logs"),
    storageDir: path.resolve(runtimeRoot, "data", "storage"),
    secretsKeyFilePath: path.resolve(runtimeRoot, "secrets", "master.key"),
  };
}

function migrateLegacyConfig(raw: unknown, filePath: string): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const config = { ...(raw as Record<string, unknown>) };
  const runtimePaths = resolveLegacyRuntimePaths(filePath);
  const updatedAt = fs.existsSync(filePath)
    ? fs.statSync(filePath).mtime.toISOString()
    : new Date().toISOString();

  const meta = isRecord(config.$meta) ? { ...config.$meta } : {};
  config.$meta = {
    version: meta.version === 1 ? 1 : 1,
    updatedAt: typeof meta.updatedAt === "string" ? meta.updatedAt : updatedAt,
    source:
      meta.source === "onboard" || meta.source === "configure" || meta.source === "doctor"
        ? meta.source
        : "configure",
  };

  const logging = isRecord(config.logging) ? { ...config.logging } : {};
  config.logging = {
    mode: logging.mode === "cloud" ? "cloud" : "file",
    logDir: typeof logging.logDir === "string" ? logging.logDir : runtimePaths.logDir,
  };

  const telemetry = isRecord(config.telemetry) ? { ...config.telemetry } : {};
  config.telemetry = {
    enabled: typeof telemetry.enabled === "boolean" ? telemetry.enabled : true,
  };

  const databaseRaw = config.database;
  if (typeof databaseRaw !== "object" || databaseRaw === null || Array.isArray(databaseRaw)) {
    return config;
  }

  const database = { ...(databaseRaw as Record<string, unknown>) };
  if (database.mode === "pglite") {
    database.mode = "embedded-postgres";

    if (typeof database.embeddedPostgresDataDir !== "string" && typeof database.pgliteDataDir === "string") {
      database.embeddedPostgresDataDir = database.pgliteDataDir;
    }
    if (
      typeof database.embeddedPostgresPort !== "number" &&
      typeof database.pglitePort === "number" &&
      Number.isFinite(database.pglitePort)
    ) {
      database.embeddedPostgresPort = database.pglitePort;
    }
  }

  if (database.mode === "embedded-postgres" || typeof database.mode !== "string") {
    if (typeof database.embeddedPostgresDataDir !== "string") {
      database.embeddedPostgresDataDir = runtimePaths.dbDir;
    }
    if (asFiniteNumber(database.embeddedPostgresPort) === null) {
      database.embeddedPostgresPort = 54329;
    }

    const backup = isRecord(database.backup) ? { ...database.backup } : {};
    database.backup = {
      enabled: typeof backup.enabled === "boolean" ? backup.enabled : true,
      intervalMinutes: asFiniteNumber(backup.intervalMinutes) ?? 60,
      retentionDays: asFiniteNumber(backup.retentionDays) ?? 7,
      dir: typeof backup.dir === "string" ? backup.dir : runtimePaths.backupDir,
    };
  }

  config.database = database;

  const auth = isRecord(config.auth) ? { ...config.auth } : {};
  config.auth = {
    ...auth,
    disableSignUp: typeof auth.disableSignUp === "boolean" ? auth.disableSignUp : false,
  };

  const storage = isRecord(config.storage) ? { ...config.storage } : {};
  const localDisk = isRecord(storage.localDisk) ? { ...storage.localDisk } : {};
  config.storage = {
    ...storage,
    provider: storage.provider === "s3" ? "s3" : "local_disk",
    localDisk: {
      ...localDisk,
      baseDir: typeof localDisk.baseDir === "string" ? localDisk.baseDir : runtimePaths.storageDir,
    },
  };

  const secrets = isRecord(config.secrets) ? { ...config.secrets } : {};
  const localEncrypted = isRecord(secrets.localEncrypted) ? { ...secrets.localEncrypted } : {};
  config.secrets = {
    ...secrets,
    provider: "local_encrypted",
    strictMode: typeof secrets.strictMode === "boolean" ? secrets.strictMode : false,
    localEncrypted: {
      ...localEncrypted,
      keyFilePath:
        typeof localEncrypted.keyFilePath === "string"
          ? localEncrypted.keyFilePath
          : runtimePaths.secretsKeyFilePath,
    },
  };

  return config;
}

function formatValidationError(err: unknown): string {
  const issues = (err as { issues?: Array<{ path?: unknown; message?: unknown }> })?.issues;
  if (Array.isArray(issues) && issues.length > 0) {
    return issues
      .map((issue) => {
        const pathParts = Array.isArray(issue.path) ? issue.path.map(String) : [];
        const issuePath = pathParts.length > 0 ? pathParts.join(".") : "config";
        const message = typeof issue.message === "string" ? issue.message : "Invalid value";
        return `${issuePath}: ${message}`;
      })
      .join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

export function readConfig(configPath?: string): PaperclipConfig | null {
  const filePath = resolveConfigPath(configPath);
  if (!fs.existsSync(filePath)) return null;
  const raw = parseJson(filePath);
  const migrated = migrateLegacyConfig(raw, filePath);
  const parsed = paperclipConfigSchema.safeParse(migrated);
  if (!parsed.success) {
    throw new Error(`Invalid config at ${filePath}: ${formatValidationError(parsed.error)}`);
  }
  return parsed.data;
}

export function writeConfig(
  config: PaperclipConfig,
  configPath?: string,
): void {
  const filePath = resolveConfigPath(configPath);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  // Backup existing config before overwriting
  if (fs.existsSync(filePath)) {
    const backupPath = filePath + ".backup";
    fs.copyFileSync(filePath, backupPath);
    fs.chmodSync(backupPath, 0o600);
  }

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}

export function configExists(configPath?: string): boolean {
  return fs.existsSync(resolveConfigPath(configPath));
}
