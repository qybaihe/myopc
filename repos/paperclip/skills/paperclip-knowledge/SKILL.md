---
name: paperclip-knowledge
description: >
  Manage the Paperclip Knowledge library from an agent run. Use when Codex,
  OpenCode, or a Paperclip employee needs to list, read, create, or update
  company/project knowledge documents, Markdown docs, SOPs, runbooks, policies,
  notes, or knowledge-base content through Paperclip's Knowledge API.
---

# Paperclip Knowledge

Use this skill to operate the Paperclip Knowledge library as first-class Markdown, not as ad-hoc files in a workspace.

## Default workflow

1. Choose the narrowest scope:
   - company knowledge: default when the request is organization-wide, policy-like, or no project is named.
   - project knowledge: use when the request names a project or the content only belongs to one project.
2. Read before writing. List documents, fetch the target document, then patch only the intended Markdown.
3. Preserve useful Markdown structure. Keep headings, tables, links, code fences, and front matter intact unless the user asks to rewrite them.
4. After a create/update, report the document title, id, scope, and a concise summary of what changed.

## API routes

Use the injected Paperclip env vars in agent runs:

- `PAPERCLIP_API_URL`
- `PAPERCLIP_API_KEY`
- `PAPERCLIP_COMPANY_ID`

When `PAPERCLIP_API_KEY` is present, send `Authorization: Bearer $PAPERCLIP_API_KEY`.
In a local trusted Paperclip/OpenCode session where the API is already reachable on
`http://127.0.0.1:3100`, the helper may also work without a token.

Company knowledge:

```text
GET   /api/companies/:companyId/knowledge
POST  /api/companies/:companyId/knowledge
GET   /api/companies/:companyId/knowledge/:docId
PATCH /api/companies/:companyId/knowledge/:docId
```

Project knowledge:

```text
GET   /api/projects/:projectId/knowledge
POST  /api/projects/:projectId/knowledge
GET   /api/projects/:projectId/knowledge/:docId
PATCH /api/projects/:projectId/knowledge/:docId
```

Create body:

```json
{ "title": "SOP title", "body": "# SOP title\n\n..." }
```

Update body:

```json
{ "title": "Optional new title", "body": "# Full replacement Markdown\n" }
```

Fetched documents include:

- `body`: Markdown content
- `scopeDirectory`: backing Knowledge directory on the Paperclip host
- `bodyPath`: backing `.md` file for tools such as OpenCode

## Helper script

For routine work, use the bundled helper script from this skill folder:

```sh
node scripts/knowledge.mjs list --scope company
node scripts/knowledge.mjs get --scope company --id <doc-id>
node scripts/knowledge.mjs create --scope company --title "New SOP" --body-file ./draft.md
node scripts/knowledge.mjs update --scope company --id <doc-id> --body-file ./draft.md

node scripts/knowledge.mjs list --scope project --project-id <project-id>
```

The helper defaults to `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, and `PAPERCLIP_COMPANY_ID`.
If `PAPERCLIP_API_KEY` is missing, it omits the auth header so local trusted OpenCode sessions can still use the local Paperclip API when allowed. Use `--json` for raw JSON output.

## Writing rules

- Do not create duplicate docs when an existing doc can be updated.
- Do not overwrite a document from memory. Fetch the current version first.
- Keep secrets out of knowledge docs unless the user explicitly confirms the target doc is allowed to hold that secret.
- Prefer a short changelog comment in your final response over pasting an entire long document.
