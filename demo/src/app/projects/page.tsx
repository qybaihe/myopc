"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  Plus,
  Sparkles,
} from "lucide-react";
import { ProjectTemplate } from "@/lib/company-data";
import { useCompany } from "@/lib/company-context";
import { IntegrationBadge, ProjectHealthBadge } from "@/components/status-badge";
import Panel from "@/components/panel";

const templateOptions: Array<{ value: ProjectTemplate; label: string; description: string }> = [
  { value: "control-plane", label: "控制台", description: "多 Agent 管理 / 智能编码 / 知识工作台" },
  { value: "commerce", label: "支付发卡", description: "商品、订单、支付回调、售后页面" },
  { value: "growth", label: "官网增长", description: "官网、内容、SEO、转化分析" },
  { value: "infra", label: "监控网关", description: "二级域名、监控、告警、路由入口" },
];

type IntegrationApiResponse = {
  checkedAt: string;
  services: Array<{ key: string; name: string; mode: "live" | "embedded" | "repo" | "demo" | "missing" }>;
};

export default function ProjectsHubPage() {
  const router = useRouter();
  const { state, hydrated, createProject } = useCompany();
  const [showCreate, setShowCreate] = useState(false);
  const [integrationData, setIntegrationData] = useState<IntegrationApiResponse | null>(null);
  const [form, setForm] = useState({
    name: "",
    template: "control-plane" as ProjectTemplate,
    domain: "oir.me",
    subdomain: "app",
    objective: "把智能员工、知识、部署和支付页面按项目收口。",
  });

  useEffect(() => {
    fetch("/api/integrations", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: IntegrationApiResponse) => setIntegrationData(data))
      .catch(() => setIntegrationData(null));
  }, []);

  const metrics = useMemo(() => {
    const liveCount = integrationData?.services.filter((service) => service.mode === "live" || service.mode === "embedded").length ?? 0;
    const demoCount = integrationData?.services.filter((service) => service.mode === "demo").length ?? 0;
    return {
      projectCount: state.projects.length,
      sharedEmployees: state.employees.length,
      liveCount,
      demoCount,
    };
  }, [integrationData, state.employees.length, state.projects.length]);

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-400">正在装载项目中心…</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),linear-gradient(180deg,_#09090b,_#09090b_45%,_#060607)]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/8 bg-white/[0.03] px-6 py-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.26em] text-cyan-300">MyOPC / 项目中心</div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                入口先收敛到项目，智能员工作为共享资源在项目之间流转。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                MyOPC 是一套面向一人公司和小团队的多 Agent 操作系统：公司级只看“项目中心”；真正进入项目后，才看到智能员工、知识、部署监控、支付发卡、集成状态和编码工作台。
                右上角切项目，项目内部再看自己的页面。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <FolderPlus className="h-4 w-4" />
                新建项目
              </button>
              <Link
                href={state.projects[0] ? `/projects/${state.projects[0].id}` : "/projects"}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
              >
                <Sparkles className="h-4 w-4" />
                进入 MyOPC
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="项目数" value={`${metrics.projectCount}`} helper="项目是一级入口" />
            <MetricCard label="智能员工" value={`${metrics.sharedEmployees}`} helper="可跨项目复用" />
            <MetricCard label="真实接入" value={`${metrics.liveCount}`} helper="在线服务 + 内嵌能力" />
            <MetricCard label="Demo 页面" value={`${metrics.demoCount}`} helper="已纳入编排但未真连后端" />
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Panel
            title="项目工作台编排"
            description="每个项目有自己的一套页面；智能员工是共享资源，不再把全局员工页和项目页揉在一起。"
            action={
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
              >
                <Plus className="h-3.5 w-3.5" />
                新建项目
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {state.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group rounded-[28px] border border-white/8 bg-black/20 p-5 transition hover:border-cyan-400/30 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white transition group-hover:text-cyan-100">{project.name}</div>
                      <div className="mt-1 text-sm text-zinc-500">{project.description}</div>
                    </div>
                    <ProjectHealthBadge health={project.health} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <SmallStat label="域名" value={`${project.subdomain}.${project.domain}`} />
                    <SmallStat label="阶段" value={project.stage} />
                    <SmallStat label="驻守员工" value={`${state.assignments.filter((item) => item.projectId === project.id).length}`} />
                    <SmallStat label="路由位" value={`${project.routes.length}`} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.monitoringEnabled ? <Tag>监控</Tag> : null}
                    {project.analyticsEnabled ? <Tag>分析</Tag> : null}
                    {project.commerceEnabled ? <Tag>支付</Tag> : null}
                    <Tag>知识</Tag>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-xs text-zinc-500">
                    <span>{project.objective}</span>
                    <span className="text-cyan-300">进入项目 →</span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel title="智能员工池" description="员工不是页面入口，而是项目的资源池。项目里只看被分配进来的那部分。">
              <div className="space-y-3">
                {state.employees.map((employee) => {
                  const linkedProjects = state.assignments.filter((assignment) => assignment.employeeId === employee.id);
                  return (
                    <div key={employee.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">{employee.name}</div>
                          <div className="mt-1 text-xs text-zinc-500">{employee.title} · {employee.model}</div>
                        </div>
                        <div className="text-xs text-zinc-400">¥{employee.spent} / ¥{employee.monthlyBudget}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {linkedProjects.map((assignment) => {
                          const project = state.projects.find((item) => item.id === assignment.projectId);
                          return (
                            <Link
                              key={assignment.id}
                              href={project ? `/projects/${project.id}/employees` : "/projects"}
                              className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:bg-white/[0.1]"
                            >
                              {project?.name ?? assignment.projectId}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="真实集成概览" description="这块专门区分：哪些能力已经接进 MyOPC，哪些仍是演示页面。">
              <div className="space-y-3">
                {integrationData?.services.map((service) => (
                  <div key={service.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-white">{service.name}</div>
                    </div>
                    <IntegrationBadge mode={service.mode} />
                  </div>
                )) ?? <div className="text-sm text-zinc-500">正在读取本地集成状态…</div>}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-zinc-950 p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">新建项目</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">先建项目，再在项目里安放智能员工和业务页面</h2>
                <p className="mt-2 text-sm text-zinc-500">这里先做本地持久化，创建后会直接进入 MyOPC 项目工作台。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.05] hover:text-zinc-200"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="项目名">
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例如：发卡支付站"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />
              </Field>
              <Field label="模板">
                <select
                  value={form.template}
                  onChange={(event) => setForm((current) => ({ ...current, template: event.target.value as ProjectTemplate }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                >
                  {templateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} · {option.description}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="主域名">
                <input
                  value={form.domain}
                  onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />
              </Field>
              <Field label="子域名前缀">
                <input
                  value={form.subdomain}
                  onChange={(event) => setForm((current) => ({ ...current, subdomain: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />
              </Field>
              <Field label="目标说明" className="md:col-span-2">
                <textarea
                  value={form.objective}
                  onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/50"
                />
              </Field>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
              <div className="text-xs text-zinc-500">创建后会带着默认项目结构进入总览页，智能员工仍然需要你自己复用进来。</div>
              <button
                type="button"
                onClick={() => {
                  const projectId = createProject({
                    name: form.name || "未命名项目",
                    template: form.template,
                    domain: form.domain || "oir.me",
                    subdomain: form.subdomain || "app",
                    objective: form.objective || "先把项目工作台搭起来。",
                  });
                  setShowCreate(false);
                  router.push(`/projects/${projectId}`);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <Plus className="h-4 w-4" />
                创建并进入项目
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-zinc-400">{helper}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-zinc-200">{value}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-zinc-300">{children}</span>;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-2 text-sm text-zinc-400">{label}</div>
      {children}
    </label>
  );
}
