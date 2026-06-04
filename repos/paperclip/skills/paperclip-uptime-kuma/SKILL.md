---
name: paperclip-uptime-kuma
description: >
  Manage Paperclip Monitoring through the integrated Uptime Kuma service. Use
  when Codex, OpenCode, or a Paperclip employee needs to inspect monitoring
  status, create HTTP/keyword/ping/TCP monitors, pause/resume/delete monitors,
  or configure uptime checks for Paperclip projects and services.
---

# Paperclip Uptime Kuma

Use this skill to configure Paperclip Monitoring instead of inventing a separate monitor store. The Monitoring page embeds Uptime Kuma and Paperclip exposes the integration snapshot.

## Default workflow

1. Confirm the integration is live:
   `GET /api/companies/$PAPERCLIP_COMPANY_ID/monitoring/uptime-kuma`
2. Prefer small monitor changes: add one monitor, verify it appears, then continue.
3. Name monitors with the service and environment, for example `Paperclip API · local` or `Customer portal · prod`.
4. Use conservative intervals unless the user asks otherwise. A 60 second interval is a good default.
5. Report the monitor id, type, URL/target, interval, and whether it is active.

## Helper script

For routine local integrated setups, use the bundled helper script from this skill folder:

```sh
node scripts/uptime-kuma-monitor.mjs status
node scripts/uptime-kuma-monitor.mjs list
node scripts/uptime-kuma-monitor.mjs add-http --name "Paperclip API" --url http://127.0.0.1:3100/api/health --interval 60
node scripts/uptime-kuma-monitor.mjs add-keyword --name "Paperclip page title" --url http://127.0.0.1:3100 --keyword Paperclip
node scripts/uptime-kuma-monitor.mjs add-ping --name "Gateway ping" --hostname 127.0.0.1
node scripts/uptime-kuma-monitor.mjs add-port --name "OpenCode Web" --hostname 127.0.0.1 --port 4096
node scripts/uptime-kuma-monitor.mjs pause --id <monitor-id>
node scripts/uptime-kuma-monitor.mjs resume --id <monitor-id>
node scripts/uptime-kuma-monitor.mjs delete --id <monitor-id>
```

The script first asks Paperclip for the Uptime Kuma base URL and repo path, then uses the Uptime Kuma Socket.IO API in embedded/disable-auth mode. It uses `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, and `PAPERCLIP_COMPANY_ID` when present; it defaults the API URL to `http://127.0.0.1:3100` when needed. If `PAPERCLIP_API_KEY` is missing, it omits the auth header so local trusted OpenCode sessions can still use the local Paperclip API when allowed.

Use `--json` when another tool should consume the output.

## Direct API reference

Paperclip integration snapshot:

```text
GET /api/companies/:companyId/monitoring/uptime-kuma
```

Important response fields:

- `status`: `live`, `frame_blocked`, `repo`, or `missing`
- `baseUrl`: Uptime Kuma URL, normally `http://127.0.0.1:3001`
- `embedUrl`: iframe-safe URL when embedding is allowed
- `repoPath`: local Uptime Kuma checkout path
- `startCommand`: command expected to run the integrated service

## Safety rules

- Do not delete monitors unless the user explicitly asks, or the monitor was just created incorrectly in the same run.
- Before editing or deleting an existing monitor, list monitors and match by id, not only by name.
- Do not store secrets in monitor names, URLs, headers, or descriptions.
- If Uptime Kuma is not live, report the Paperclip snapshot and start command rather than guessing.
