"use client";

import { useRef, useState } from "react";
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Save, RotateCcw } from "lucide-react";

function EditorSurface({
  editorKey,
  initialMarkdown,
  onSave,
}: {
  editorKey: string;
  initialMarkdown: string;
  onSave: (markdown: string) => void;
}) {
  const crepeRef = useRef<Crepe | null>(null);
  const [savedAt, setSavedAt] = useState<string>("未保存");

  const { loading } = useEditor(
    (root) => {
      const crepe = new Crepe({
        root,
        defaultValue: initialMarkdown,
      });
      crepeRef.current = crepe;
      return crepe;
    },
    [editorKey, initialMarkdown]
  );

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-white">Milkdown 编辑器（真实集成）</div>
          <div className="mt-1 text-xs text-zinc-500">当前保存状态：{savedAt}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const markdown = crepeRef.current?.getMarkdown() ?? initialMarkdown;
              onSave(markdown);
              setSavedAt(new Date().toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }));
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/15"
          >
            <Save className="h-3.5 w-3.5" />
            保存项目笔记
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            重置编辑器
          </button>
        </div>
      </div>

      <div className="min-h-[28rem] bg-black/10 px-2 py-4">
        {loading ? <div className="px-4 py-8 text-sm text-zinc-500">正在挂载 Milkdown…</div> : null}
        <Milkdown />
      </div>
    </div>
  );
}

export default function MilkdownEditor(props: {
  editorKey: string;
  initialMarkdown: string;
  onSave: (markdown: string) => void;
}) {
  return (
    <MilkdownProvider>
      <EditorSurface {...props} />
    </MilkdownProvider>
  );
}
