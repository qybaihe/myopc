#!/usr/bin/env node
import fs from "node:fs/promises";

function usage(exitCode = 0) {
  const text = `Paperclip Knowledge helper

Usage:
  node scripts/knowledge.mjs list   [--scope company|project] [--project-id ID] [--json]
  node scripts/knowledge.mjs get    --id ID [--scope company|project] [--project-id ID] [--json]
  node scripts/knowledge.mjs create --title TITLE [--body TEXT|--body-file PATH] [--scope company|project] [--project-id ID] [--json]
  node scripts/knowledge.mjs update --id ID [--title TITLE] [--body TEXT|--body-file PATH] [--scope company|project] [--project-id ID] [--json]

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
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

function readConfig(args) {
  const apiUrl = (args["api-url"] || process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3100").replace(/\/$/, "");
  const apiKey = args["api-key"] || process.env.PAPERCLIP_API_KEY || "";
  const companyId = args["company-id"] || process.env.PAPERCLIP_COMPANY_ID || "";
  return { apiUrl, apiKey, companyId };
}

function requireValue(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing ${label}.`);
  return value.trim();
}

function endpoint(config, args, docId = null) {
  const scope = args.scope || "company";
  if (scope === "project") {
    const projectId = requireValue(args["project-id"], "--project-id for project scope");
    return `/api/projects/${encodeURIComponent(projectId)}/knowledge${docId ? `/${encodeURIComponent(docId)}` : ""}`;
  }
  if (scope !== "company") throw new Error("--scope must be company or project.");
  const companyId = requireValue(args["company-id"] || config.companyId, "PAPERCLIP_COMPANY_ID or --company-id");
  return `/api/companies/${encodeURIComponent(companyId)}/knowledge${docId ? `/${encodeURIComponent(docId)}` : ""}`;
}

async function request(config, method, path, body) {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  if (!response.ok) {
    const message = typeof parsed === "object" && parsed && "error" in parsed ? parsed.error : text;
    throw new Error(`${method} ${path} failed (${response.status}): ${message || response.statusText}`);
  }
  return parsed;
}

async function readBody(args) {
  if (typeof args.body === "string") return args.body;
  if (typeof args["body-file"] === "string") return fs.readFile(args["body-file"], "utf8");
  return undefined;
}

function printResult(value, json) {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      console.log("No knowledge documents found.");
      return;
    }
    for (const doc of value) {
      console.log(`- ${doc.title} (${doc.id}) [${doc.scopeType}] updated=${doc.updatedAt}`);
      if (doc.summary) console.log(`  ${doc.summary}`);
    }
    return;
  }
  console.log(`${value.title} (${value.id}) [${value.scopeType}]`);
  if (value.bodyPath) console.log(`bodyPath: ${value.bodyPath}`);
  if (typeof value.body === "string") {
    console.log("\n--- markdown ---");
    console.log(value.body.replace(/\n$/, ""));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage(0);
  const command = args._[0];
  if (!command) usage(1);
  const config = readConfig(args);

  if (command === "list") {
    printResult(await request(config, "GET", endpoint(config, args)), args.json);
    return;
  }
  if (command === "get") {
    const id = requireValue(args.id, "--id");
    printResult(await request(config, "GET", endpoint(config, args, id)), args.json);
    return;
  }
  if (command === "create") {
    const title = requireValue(args.title, "--title");
    const body = await readBody(args);
    printResult(await request(config, "POST", endpoint(config, args), { title, ...(body === undefined ? {} : { body }) }), args.json);
    return;
  }
  if (command === "update") {
    const id = requireValue(args.id, "--id");
    const body = await readBody(args);
    if (args.title === undefined && body === undefined) throw new Error("update requires --title or --body/--body-file.");
    printResult(await request(config, "PATCH", endpoint(config, args, id), { ...(args.title === undefined ? {} : { title: args.title }), ...(body === undefined ? {} : { body }) }), args.json);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
