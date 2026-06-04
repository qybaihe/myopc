"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, DatabaseZap, PlugZap } from "lucide-react";
import Panel from "@/components/panel";
import { IntegrationBadge } from "@/components/status-badge";
import { useCompany } from "@/lib/company-context";
import { getProjectById } from "@/lib/company-data";

type IntegrationService = {
  key: string;
  name: string;
  mode: "live" | "embedded" | "repo" | "demo" | "missing";
  summary: string;
  evidence: string;
  endpoint?: string;
};

export default function ProjectIntegrationsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);
  const [services, setServices] = useState<IntegrationService[]>([]);
  const [checkedAt, setCheckedAt] = useState<string>("");

  useEffect(() => {
    fetch("/api/integrations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setServices(data.services ?? []);
        setCheckedAt(data.checkedAt ?? "");
      })
      .catch(() => {
        setServices([]);
        setCheckedAt("");
      });
  }, []);

  const summary = useMemo(() => ({
    live: services.filter((service) => service.mode === "live" || service.mode === "embedded").length,
    repo: services.filter((service) => service.mode === "repo").length,
    demo: services.filter((service) => service.mode === "demo").length,
  }), [services]);

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">集成状态</div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{project.name} 的真实接入盘点</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              这页专门回答“哪些能力已经真正进入 MyOPC 系统”。我按真实在线、内嵌可用、源码已接入、页面演示四层来区分，不再把所有模块都写成“已连接”。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Stat label="真实可用" value={`${summary.live}`} />
            <Stat label="仓库已接入" value={`${summary.repo}`} />
            <Stat label="Demo 页面" value={`${summary.demo}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <Panel title="集成清单" description={checkedAt ? `最近检查：${new Date(checkedAt).toLocaleString("zh-CN")}` : "正在读取本地环境证据…"}>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.key} className="rounded-[28px] border border-white/8 bg-black/20 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">{service.name}</span>
                      <IntegrationBadge mode={service.mode} />
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">{service.summary}</div>
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-zinc-500">
                      {service.evidence}
                      {service.endpoint ? <div className="mt-2 text-cyan-300">endpoint: {service.endpoint}</div> : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="当前已经真正接进去的能力" description="这一栏是我认为这轮最关键的结果。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Fact icon={<CheckCircle2 className="h-4 w-4" />} text="项目级页面编排：已经从‘全局静态导航’切成‘项目中心 → 项目内导航’。" />
              <Fact icon={<CheckCircle2 className="h-4 w-4" />} text="Milkdown：已经真实内嵌到知识页，可编辑并保存项目笔记。" />
              <Fact icon={<CheckCircle2 className="h-4 w-4" />} text="本地知识索引：直接读取工作区 Markdown 文档，可搜索和预览。" />
              <Fact icon={<CheckCircle2 className="h-4 w-4" />} text="MyOPC 智能编码引擎：已检测到本地服务在线，所以它不再只是文案占位。" />
            </div>
          </Panel>

          <Panel title="接下来最值得优先打通的" description="为了从 Demo 走向真集成，我建议按这个顺序来。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Fact icon={<PlugZap className="h-4 w-4" />} text="MyOPC 控制面继续深化，把任务、审批、员工详情从本地状态换成真实控制平面接口。" />
              <Fact icon={<DatabaseZap className="h-4 w-4" />} text="R2R / 向量索引接进知识页，把现在的工作区检索升级为项目知识库。" />
              <Fact icon={<PlugZap className="h-4 w-4" />} text="Traefik / Kuma / Umami 通过 adapter 接入操作页，逐步替换图表和状态条。" />
            </div>
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

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-cyan-300">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
