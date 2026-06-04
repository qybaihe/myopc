import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readConfig } from "../config/store.js";

describe("config store legacy migration", () => {
  it("reads legacy configs without $meta/logging and fills runtime-relative defaults", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-config-store-"));
    const configPath = path.join(root, ".paperclip", "config.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          server: {
            deploymentMode: "authenticated",
            exposure: "public",
            host: "0.0.0.0",
            port: 3100,
            allowedHostnames: ["myopc.me"],
            serveUi: true,
          },
          database: {
            mode: "embedded-postgres",
          },
          auth: {
            baseUrlMode: "explicit",
            publicBaseUrl: "http://myopc.me/",
          },
          secrets: {
            provider: "local_encrypted",
          },
          storage: {
            provider: "local_disk",
          },
        },
        null,
        2,
      ),
    );

    const config = readConfig(configPath);
    const runtimeRoot = path.dirname(configPath);

    expect(config).not.toBeNull();
    expect(config?.$meta.version).toBe(1);
    expect(config?.logging).toEqual({
      mode: "file",
      logDir: path.join(runtimeRoot, "logs"),
    });
    expect(config?.database.embeddedPostgresDataDir).toBe(path.join(runtimeRoot, "db"));
    expect(config?.database.backup.dir).toBe(path.join(runtimeRoot, "data", "backups"));
    expect(config?.storage.localDisk.baseDir).toBe(path.join(runtimeRoot, "data", "storage"));
    expect(config?.secrets.localEncrypted.keyFilePath).toBe(path.join(runtimeRoot, "secrets", "master.key"));
    expect(config?.telemetry.enabled).toBe(true);
  });
});
