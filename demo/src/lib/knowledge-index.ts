import { readFile } from "node:fs/promises";
import path from "node:path";

export interface KnowledgeSource {
  id: string;
  title: string;
  absolutePath: string;
  relativePath: string;
  summary: string;
  content: string;
}

const CATALOG = [
  {
    id: "iopc-architecture",
    title: "MyOPC 架构草案",
    relativePath: "docs/MYOPC-ARCHITECTURE-v0.2.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "IOPC-ARCHITECTURE-v0.2.md"),
  },
  {
    id: "iopc-layout-plan",
    title: "MyOPC 页面布局方案",
    relativePath: "docs/MYOPC-LAYOUT-PLAN-v0.1.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "IOPC-LAYOUT-PLAN-v0.1.md"),
  },
  {
    id: "iopc-page-design",
    title: "MyOPC 页面设计草案",
    relativePath: "docs/MYOPC-PAGE-DESIGN-v0.1.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "IOPC-PAGE-DESIGN-v0.1.md"),
  },
  {
    id: "paperclip-readme",
    title: "MyOPC 控制面核心说明",
    relativePath: "myopc/control-plane/README.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "paperclip", "README.md"),
  },
  {
    id: "paperclip-developing",
    title: "MyOPC 控制面开发说明",
    relativePath: "myopc/control-plane/DEVELOPING.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "paperclip", "doc", "DEVELOPING.md"),
  },
  {
    id: "opencode-readme-zh",
    title: "MyOPC 智能编码引擎说明",
    relativePath: "myopc/code-engine/README.zh.md",
    absolutePath: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "opencode", "README.zh.md"),
  },
] as const;

function summarizeMarkdown(content: string) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstHeading = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? "未命名文档";
  const firstParagraph = lines.find((line) => !line.startsWith("#") && !line.startsWith("|")) ?? "";
  return `${firstHeading}${firstParagraph ? ` · ${firstParagraph.slice(0, 80)}` : ""}`;
}

function buildExcerpt(content: string, query: string) {
  if (!query.trim()) return summarizeMarkdown(content);
  const haystack = content.toLowerCase();
  const term = query.trim().toLowerCase();
  const index = haystack.indexOf(term);
  if (index === -1) return summarizeMarkdown(content);
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + term.length + 120);
  return content.slice(start, end).replace(/\n+/g, " ");
}

function scoreContent(content: string, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!terms.length) return 0;
  const haystack = content.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export async function loadKnowledgeSources(): Promise<KnowledgeSource[]> {
  return Promise.all(
    CATALOG.map(async (item) => {
      const content = await readFile(item.absolutePath, "utf8");
      return {
        id: item.id,
        title: item.title,
        absolutePath: item.absolutePath,
        relativePath: item.relativePath,
        summary: summarizeMarkdown(content),
        content,
      } satisfies KnowledgeSource;
    })
  );
}

export async function searchKnowledge(query: string) {
  const sources = await loadKnowledgeSources();
  if (!query.trim()) {
    return sources.map((source) => ({
      id: source.id,
      title: source.title,
      relativePath: source.relativePath,
      excerpt: source.summary,
      score: 0,
    }));
  }

  return sources
    .map((source) => ({
      id: source.id,
      title: source.title,
      relativePath: source.relativePath,
      excerpt: buildExcerpt(source.content, query),
      score: scoreContent(source.content, query),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
}

export async function getKnowledgeDocument(documentId: string) {
  const sources = await loadKnowledgeSources();
  return sources.find((source) => source.id === documentId) ?? null;
}
