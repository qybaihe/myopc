"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Gauge,
  Globe,
  Route,
  ShieldCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Panel from "@/components/panel";
import { IntegrationBadge } from "@/components/status-badge";
import { useCompany } from "@/lib/company-context";
import { getProjectById, performanceSeries } from "@/lib/company-data";

export default function ProjectOperationsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);
  const [integrationData, setIntegrationData] = useState<{
    services: Array<{ key: string; name: string; summary: string; mode: "live" | "embedded" | "repo" | "demo" | "missing" }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/integrations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setIntegrationData(data))
      .catch(() => setIntegrationData(null));
  }, []);

  const series = performanceSeries[projectId] ?? [];
  const opsServices = useMemo(
    () => integrationData?.services.filter((service) => ["control-plane", "code-engine", "traefik", "uptime-kuma", "umami"].includes(service.key)) ?? [],
    [integrationData?.services]
  );

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">部署监控</div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{project.name} 的部署、性能与路由面板</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              二级域名分发、MyOPC 智能编码入口、Traefik 路由位、Kuma/Umami 的位置都已经集中到项目内。真实能探活的会标“真实在线”，其余明确标成“源码已接入”或“演示”。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="路由位" value={`${project.routes.length}`} />
            <Stat label="运行告警" value={`${project.alerts}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-6">
          <Panel title="性能走势" description="这一页先把性能监控卡真正放到项目内部。">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 rounded-2xl border border-white/8 bg-black/20 p-3">
                <div className="mb-3 text-sm font-medium text-white">接口延迟 (ms)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="latencyFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717a" tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" tickLine={false} axisLine={false} width={40} />
                    <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
                    <Area type="monotone" dataKey="latency" stroke="#22d3ee" fill="url(#latencyFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="h-72 rounded-2xl border border-white/8 bg-black/20 p-3">
                <div className="mb-3 text-sm font-medium text-white">错误数</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717a" tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
                    <Bar dataKey="errors" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>

          <Panel title="二级域名与发布入口" description="把你提到的二级域名分发和 MyOPC 智能编码入口一并放到项目内部。">
            <div className="space-y-3">
              {project.routes.map((route) => (
                <div key={route.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <Route className="h-4 w-4 text-cyan-300" />
                      {route.label}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{route.host}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag>{route.source}</Tag>
                    <Tag>{route.state === "live" ? "已联通" : "待编排"}</Tag>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="运行面状态" description="先展示接入证据，再决定哪些卡片能从 Demo 切真接口。">
            <div className="space-y-3">
              {opsServices.map((service) => (
                <div key={service.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-white">{service.name}</div>
                    <div className="text-xs text-zinc-500">{service.summary}</div>
                  </div>
                  <IntegrationBadge mode={service.mode} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="操作策略" description="你现在本地能用的，先做进去；不能用的，只先占结构位。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Tip icon={<ShieldCheck className="h-4 w-4" />} text="MyOPC 智能编码引擎已经有本地服务在跑，所以这里优先把执行入口和证据放进项目页。" />
              <Tip icon={<Globe className="h-4 w-4" />} text="Traefik / 二级域名分发先在页面里形成项目化路由表，后续再切到真实 adapter。" />
              <Tip icon={<Gauge className="h-4 w-4" />} text="监控和性能卡片现在先项目内展示，等 Kuma / Umami 接通后再把图表换成真实数据。" />
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

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-zinc-300">{children}</span>;
}

function Tip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-cyan-300">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
