#!/usr/bin/env node
import { createRequire } from "node:module";
import path from "node:path";

function usage(exitCode = 0) {
  const text = `Paperclip Uptime Kuma helper

Usage:
  node scripts/uptime-kuma-monitor.mjs status [--json]
  node scripts/uptime-kuma-monitor.mjs list [--json]
  node scripts/uptime-kuma-monitor.mjs add-http --name NAME --url URL [--interval 60] [--json]
  node scripts/uptime-kuma-monitor.mjs add-keyword --name NAME --url URL --keyword TEXT [--interval 60] [--json]
  node scripts/uptime-kuma-monitor.mjs add-ping --name NAME --hostname HOST [--interval 60] [--json]
  node scripts/uptime-kuma-monitor.mjs add-port --name NAME --hostname HOST --port PORT [--interval 60] [--json]
  node scripts/uptime-kuma-monitor.mjs edit --id ID --set-json '{"name":"New name"}' [--json]
  node scripts/uptime-kuma-monitor.mjs pause --id ID [--json]
  node scripts/uptime-kuma-monitor.mjs resume --id ID [--json]
  node scripts/uptime-kuma-monitor.mjs delete --id ID [--json]

Environment:
  PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_COMPANY_ID
`;
  (exitCode === 0 ? console.log : console.error)(text.trim());
  process.exit(exitCode);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (["json", "help"].includes(key)) {
      out[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    out[key] = value;
    i += 1;
  }
  return out;
}

function requireValue(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}.`);
  return value.trim();
}

function config(args) {
  const apiUrl = (args["api-url"] || process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
  const apiKey = args["api-key"] || process.env.PAPERCLIP_API_KEY || "";
  const companyId = args["company-id"] || process.env.PAPERCLIP_COMPANY_ID || "";
  if (!companyId) throw new Error("Missing PAPERCLIP_COMPANY_ID or --company-id.");
  return { apiUrl, apiKey, companyId };
}

async function paperclipSnapshot(cfg) {
  const endpoint = `${cfg.apiUrl}/api/companies/${encodeURIComponent(cfg.companyId)}/monitoring/uptime-kuma`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
  });
  const body = await response.text();
  const parsed = body ? JSON.parse(body) : null;
  if (!response.ok) throw new Error(`Paperclip monitoring snapshot failed (${response.status}): ${body}`);
  return parsed;
}

async function loadSocketClient(repoPath) {
  if (!repoPath) throw new Error("Paperclip did not report a Uptime Kuma repoPath.");
  const requireFromKuma = createRequire(path.join(repoPath, "package.json"));
  try {
    return requireFromKuma("socket.io-client").io;
  } catch (error) {
    throw new Error(`Cannot load socket.io-client from ${repoPath}. Install Uptime Kuma dependencies first. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function connectKuma(snapshot) {
  if (snapshot.status !== "live" || !snapshot.baseUrl) {
    throw new Error(`Uptime Kuma is not live. status=${snapshot.status} message=${snapshot.message || ""} startCommand=${snapshot.startCommand || ""}`);
  }
  const io = await loadSocketClient(snapshot.repoPath);
  const socket = io(snapshot.baseUrl, {
    transports: ["websocket", "polling"],
    timeout: 5000,
    reconnection: false,
  });
  let latestMonitorList = null;
  socket.on("monitorList", (list) => {
    latestMonitorList = list;
  });
  await withTimeout(new Promise((resolve, reject) => {
    socket.once("autoLogin", resolve);
    socket.once("loginRequired", () => reject(new Error("Uptime Kuma requested login. Start it in Paperclip embedded mode.")));
    socket.once("connect_error", reject);
  }), 8000, "Uptime Kuma auto login");
  return { socket, get latestMonitorList() { return latestMonitorList; } };
}

function emit(socket, event, ...args) {
  return withTimeout(new Promise((resolve) => {
    socket.emit(event, ...args, (response) => resolve(response));
  }), 10000, `socket event ${event}`);
}

const monitorDefaults = {
  parent: null,
  method: "GET",
  protocol: null,
  location: "world",
  ipFamily: null,
  interval: 60,
  retryInterval: 60,
  resendInterval: 0,
  maxretries: 0,
  retryOnlyOnStatusCodeFailure: false,
  notificationIDList: {},
  ignoreTls: false,
  upsideDown: false,
  expiryNotification: false,
  domainExpiryNotification: true,
  maxredirects: 10,
  accepted_statuscodes: ["200-299"],
  saveResponse: false,
  saveErrorResponse: true,
  responseMaxLength: 1024,
  dns_resolve_type: "A",
  dns_resolve_server: "",
  docker_container: "",
  docker_host: null,
  proxyId: null,
  basic_auth_user: "",
  basic_auth_pass: "",
  mqttUsername: "",
  mqttPassword: "",
  mqttTopic: "",
  mqttWebsocketPath: "",
  mqttSuccessMessage: "",
  mqttCheckType: "keyword",
  authMethod: null,
  oauth_auth_method: "client_secret_basic",
  httpBodyEncoding: "json",
  kafkaProducerBrokers: [],
  kafkaProducerSaslOptions: { mechanism: "None" },
  cacheBust: false,
  kafkaProducerSsl: false,
  kafkaProducerAllowAutoTopicCreation: false,
  gamedigGivenPortOnly: true,
  remote_browser: null,
  screenshot_delay: 0,
  rabbitmqNodes: [],
  rabbitmqUsername: "",
  rabbitmqPassword: "",
  conditions: [],
  system_service_name: "",
};

function interval(args) {
  const value = Number(args.interval ?? 60);
  if (!Number.isFinite(value) || value < 20) throw new Error("--interval must be a number >= 20 seconds.");
  return value;
}

function buildMonitor(command, args) {
  const base = {
    ...monitorDefaults,
    name: requireValue(args.name, "--name"),
    interval: interval(args),
    retryInterval: Number(args["retry-interval"] ?? args.interval ?? 60),
    active: args.active === "false" ? false : true,
  };
  if (command === "add-http") {
    return { ...base, type: "http", url: requireValue(args.url, "--url") };
  }
  if (command === "add-keyword") {
    return { ...base, type: "keyword", url: requireValue(args.url, "--url"), keyword: requireValue(args.keyword, "--keyword"), invertKeyword: args.invert === "true" };
  }
  if (command === "add-ping") {
    return { ...base, type: "ping", hostname: requireValue(args.hostname, "--hostname"), ping_count: 3, ping_numeric: true, packetSize: 56, ping_per_request_timeout: 2 };
  }
  if (command === "add-port") {
    return { ...base, type: "port", hostname: requireValue(args.hostname, "--hostname"), port: requireValue(args.port, "--port") };
  }
  throw new Error(`Unsupported add command: ${command}`);
}

function normalizeMonitorList(list) {
  return Object.values(list || {}).map((monitor) => ({
    id: monitor.id,
    name: monitor.name,
    type: monitor.type,
    active: monitor.active,
    url: monitor.url ?? null,
    hostname: monitor.hostname ?? null,
    port: monitor.port ?? null,
    interval: monitor.interval,
  })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function print(value, json) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      console.log("No monitors found.");
      return;
    }
    for (const monitor of value) {
      const target = monitor.url || [monitor.hostname, monitor.port].filter(Boolean).join(":") || "";
      console.log(`- ${monitor.id} ${monitor.active ? "active" : "paused"} ${monitor.type} ${monitor.name} ${target}`);
    }
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);
  const command = args._[0];
  if (!command) usage(1);
  const cfg = config(args);
  const snapshot = await paperclipSnapshot(cfg);

  if (command === "status") {
    print(snapshot, args.json);
    return;
  }

  const kuma = await connectKuma(snapshot);
  try {
    if (command === "list") {
      const res = await emit(kuma.socket, "getMonitorList");
      if (!res?.ok) throw new Error(res?.msg || "getMonitorList failed");
      await new Promise((resolve) => setTimeout(resolve, 100));
      print(normalizeMonitorList(kuma.latestMonitorList), args.json);
      return;
    }

    if (["add-http", "add-keyword", "add-ping", "add-port"].includes(command)) {
      const monitor = buildMonitor(command, args);
      const res = await emit(kuma.socket, "add", monitor);
      if (!res?.ok) throw new Error(res?.msg || "add monitor failed");
      print({ ok: true, monitorID: res.monitorID, monitor }, args.json);
      return;
    }

    if (command === "pause" || command === "resume" || command === "delete" || command === "edit") {
      const id = Number(requireValue(args.id, "--id"));
      if (!Number.isInteger(id) || id <= 0) throw new Error("--id must be a positive integer.");
      if (command === "pause") {
        const res = await emit(kuma.socket, "pauseMonitor", id);
        if (!res?.ok) throw new Error(res?.msg || "pause failed");
        print({ ok: true, action: "pause", id }, args.json);
        return;
      }
      if (command === "resume") {
        const res = await emit(kuma.socket, "resumeMonitor", id);
        if (!res?.ok) throw new Error(res?.msg || "resume failed");
        print({ ok: true, action: "resume", id }, args.json);
        return;
      }
      if (command === "delete") {
        const res = await emit(kuma.socket, "deleteMonitor", id, false);
        if (!res?.ok) throw new Error(res?.msg || "delete failed");
        print({ ok: true, action: "delete", id }, args.json);
        return;
      }
      if (command === "edit") {
        const patch = JSON.parse(requireValue(args["set-json"], "--set-json"));
        const got = await emit(kuma.socket, "getMonitor", id);
        if (!got?.ok || !got.monitor) throw new Error(got?.msg || "getMonitor failed");
        const res = await emit(kuma.socket, "editMonitor", { ...got.monitor, ...patch, id });
        if (!res?.ok) throw new Error(res?.msg || "edit failed");
        print({ ok: true, action: "edit", id, patch }, args.json);
        return;
      }
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    kuma.socket.disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
