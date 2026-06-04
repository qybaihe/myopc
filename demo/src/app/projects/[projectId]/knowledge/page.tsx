"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Database, Search } from "lucide-react";
import Panel from "@/components/panel";
import { useCompany } from "@/lib/company-context";
import { getProjectById } from "@/lib/company-data";

const MilkdownEditor = dynamic(() => import("@/components/milkdown-editor"), { ssr: false });

type CatalogItem = {
  id: string;
  title: string;
  relativePath: string;
  summary: string;
};

type SearchResult = {
  id: string;
  title: string;
  relativePath: string;
  excerpt: string;
};

export default function ProjectKnowledgePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated, updateProjectNote } = useCompany();
  const project = getProjectById(state, projectId);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<{ title: string; relativePath: string; content: string; summary: string } | null>(null);

  useEffect(() => {
    fetch("/api/knowledge", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setCatalog(data.catalog ?? []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const target = query.trim() ? `/api/knowledge?q=${encodeURIComponent(query)}` : "/api/knowledge";
    fetch(target, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (query.trim()) {
          setResults(data.results ?? []);
        } else {
          setResults((data.catalog ?? []).map((item: CatalogItem) => ({
            id: item.id,
            title: item.title,
            relativePath: item.relativePath,
            excerpt: item.summary,
          })));
        }
      })
      .catch(() => setResults([]));
  }, [query]);

  useEffect(() => {
    if (!catalog.length) return;
    const first = catalog[0];
    fetch(`/api/knowledge?documentId=${first.id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSelectedDoc(data.document ?? null))
      .catch(() => setSelectedDoc(null));
  }, [catalog]);

  const knowledgeCount = useMemo(() => new Set(results.map((item) => item.id)).size, [results]);

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">知识页</div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{project.name} 的项目知识面板</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              这一页不是纯静态示意了：左侧是 Milkdown 真编辑器，右侧是直接从当前工作区读出来的 Markdown 文档索引。现在已经能真实启动的知识能力都先接上来了。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="真实编辑器" value="Milkdown" />
            <Stat label="知识源数量" value={`${catalog.length || knowledgeCount}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <MilkdownEditor
          key={projectId}
          editorKey={projectId}
          initialMarkdown={project.noteMarkdown}
          onSave={(markdown) => updateProjectNote(projectId, markdown)}
        />

        <div className="space-y-6">
          <Panel title="工作区知识搜索" description="真实读取当前仓库文档，不再是纯手写假数据。">
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜：MyOPC、项目、知识库、支付、监控…"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <div className="mt-4 space-y-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    fetch(`/api/knowledge?documentId=${item.id}`, { cache: "no-store" })
                      .then((response) => response.json())
                      .then((data) => setSelectedDoc(data.document ?? null))
                      .catch(() => setSelectedDoc(null));
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Database className="h-4 w-4 text-cyan-300" />
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{item.relativePath}</div>
                  <div className="mt-3 text-sm leading-6 text-zinc-400">{item.excerpt}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="当前文档预览" description="点右侧结果可以直接看工作区文档片段。">
            {selectedDoc ? (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <BookOpen className="h-4 w-4 text-cyan-300" />
                  {selectedDoc.title}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{selectedDoc.relativePath}</div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-zinc-300 whitespace-pre-wrap">
                  {selectedDoc.content.slice(0, 1600)}
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">请选择一份工作区文档查看。</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
