"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CreditCard,
  Server,
} from "lucide-react";
import Panel from "@/components/panel";
import { IntegrationBadge, ProjectHealthBadge } from "@/components/status-badge";
import { useCompany } from "@/lib/company-context";
import {
  analyticsSeries,
  getApprovalsForProject,
  getEmployeesForProject,
  getProjectById,
  getTasksForProject,
} from "@/lib/company-data";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);
  const staffing = getEmployeesForProject(state, projectId);
  const approvals = getApprovalsForProject(state, projectId);
  const tasks = getTasksForProject(state, projectId);
  const [integrationData, setIntegrationData] = useState<{
    services: Array<{ key: string; name: string; summary: string; mode: "live" | "embedded" | "repo" | "demo" | "missing" }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/integrations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setIntegrationData(data))
      .catch(() => setIntegrationData(null));
  }, []);

  const relevantIntegrations = useMemo(() => {
    const allow = new Set(project?.template === "commerce"
      ? ["control-plane", "code-engine", "milkdown", "workspace-knowledge", "traefik", "uptime-kuma", "umami", "payments-demo"]
      : project?.template === "growth"
      ? ["control-plane", "milkdown", "workspace-knowledge", "umami", "traefik"]
      : project?.template === "infra"
      ? ["control-plane", "code-engine", "traefik", "uptime-kuma"]
      : ["control-plane", "code-engine", "milkdown", "workspace-knowledge", "traefik", "uptime-kuma", "umami"]);

    return integrationData?.services.filter((service) => allow.has(service.key)) ?? [];
  }, [integrationData?.services, project?.template]);

  if (!hydrated || !project) return null;

  const analytics = analyticsSeries[projectId] ?? [];
  const liveIntegrationCount = relevantIntegrations.filter(
    (service) => service.mode === "live" || service.mode === "embedded"
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">项目总览</div>
              <ProjectHealthBadge health={project.health} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{project.name}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400 sm:text-base">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{project.subdomain}.{project.domain}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">阶段：{project.stage}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">项目目标：{project.objective}</span>
            </div>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3">
              <OverviewMetric label="实时接入" value={`${liveIntegrationCount}`} helper="在线服务 + 内嵌能力" />
            <OverviewMetric label="驻守员工" value={`${staffing.length}`} helper="智能员工按项目分配" />
            <OverviewMetric label="活跃任务" value={`${tasks.filter((task) => task.status === "in_progress").length}`} helper="都挂在当前项目下" />
            <OverviewMetric label="待审批" value={`${approvals.length}`} helper="审批也按项目收口" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className="space-y-6">
          <Panel title="这次编排改动的核心" description="先解决页面入口逻辑，再谈集成深度。">
            <div className="grid gap-4 md:grid-cols-2">
              <FeatureCard icon={<Bot className="h-4 w-4" />} title="员工不再是一级入口">
                智能员工仍然是共享资源，但只在具体项目里看驻守关系、当前任务和负载。
              </FeatureCard>
              <FeatureCard icon={<BookOpen className="h-4 w-4" />} title="知识页改成项目知识面板">
                项目笔记 + 本地文档索引同屏，先把真正能启动的知识能力接进去。
              </FeatureCard>
              <FeatureCard icon={<Server className="h-4 w-4" />} title="部署与监控回到项目维度">
                子域名、监控、性能、告警都挂在项目里，而不是散在全局静态页面里。
              </FeatureCard>
              <FeatureCard icon={<CreditCard className="h-4 w-4" />} title="支付 / 发卡页面也属于项目">
                先放进项目工作台做 Demo，占住结构位，后续再逐步真连支付后端。
              </FeatureCard>
            </div>
          </Panel>

          <Panel title="项目任务与审批" description="任务、审批、页面入口都不再混全局数据。">
            <div className="space-y-3">
              {tasks.map((task) => {
                const owner = staffing.find((item) => item.employee.id === task.employeeId)?.employee;
                return (
                  <div key={task.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                            {task.priority}
                          </span>
                          <span className="text-sm font-medium text-white">{task.title}</span>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">负责人：{owner?.name ?? task.employeeId} · 来源：{task.source} · ETA：{task.eta}</div>
                      </div>
                      <div className="min-w-48">
                        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                          <span>{task.status.replace("_", " ")}</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${task.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-sm font-medium text-white">待审批</div>
              <div className="mt-3 space-y-3">
                {approvals.map((approval) => {
                  const requester = staffing.find((item) => item.employee.id === approval.requesterId)?.employee;
                  return (
                    <div key={approval.id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{approval.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">{requester?.name ?? approval.requesterId} · {approval.summary}</div>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">{approval.createdAt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="关键集成位" description="这块直接告诉你哪些已经是真接通，哪些还只是位置占好了。">
            <div className="space-y-3">
              {relevantIntegrations.map((service) => (
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

          <Panel title="流量 / 转化节奏" description="这里先用项目级数据卡把监控和增长节奏放到一起。">
            <div className="space-y-3">
              {analytics.slice(-4).map((point) => (
                <div key={point.label} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between text-sm text-white">
                    <span>{point.label}</span>
                    <span>{point.visitors} 访客</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>转化 {point.conversions}</span>
                    <span>项目内看数据，而不是全局混看</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="下一步建议" description="基于当前仓库和本地环境，优先顺序建议这样推进。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Step text="把 MyOPC 控制面真正跑起来，让任务 / 审批从演示数据切成真实控制平面数据。" />
              <Step text="知识页继续保留 Milkdown，但把本地知识索引升级为真正的 R2R / 向量检索。" />
              <Step text="Traefik / Kuma / Umami 先做 adapter，再把操作页和支付页的状态条目逐步从演示切成真实接口。" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function OverviewMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-xs text-zinc-500">{helper}</div>
    </div>
  );
}

function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <div className="text-sm font-medium text-white">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-6 text-zinc-400">{children}</div>
    </div>
  );
}

function Step({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
      <span>{text}</span>
    </div>
  );
}
