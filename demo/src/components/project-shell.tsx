"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  CreditCard,
  LayoutDashboard,
  Network,
  PlugZap,
  Users2,
} from "lucide-react";
import { ReactNode } from "react";
import { useCompany } from "@/lib/company-context";
import {
  getApprovalsForProject,
  getAssignmentsForProject,
  getProjectById,
  getTasksForProject,
} from "@/lib/company-data";
import ProjectSwitcher from "@/components/project-switcher";
import { ProjectHealthBadge } from "@/components/status-badge";

const navItems = [
  { icon: LayoutDashboard, label: "总览", suffix: "" },
  { icon: Users2, label: "员工编排", suffix: "/employees" },
  { icon: BookOpen, label: "知识库", suffix: "/knowledge" },
  { icon: Activity, label: "部署监控", suffix: "/operations" },
  { icon: Network, label: "二级域名分发", suffix: "/domains" },
  { icon: CreditCard, label: "支付发卡", suffix: "/commerce" },
  { icon: PlugZap, label: "集成状态", suffix: "/integrations" },
];

export default function ProjectShell({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        正在装载项目工作台…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-center">
        <div className="rounded-full border border-white/10 bg-white/[0.04] p-4 text-zinc-300">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">项目不存在</h1>
          <p className="mt-2 text-sm text-zinc-500">可能是本地状态还没同步，或者项目尚未创建。</p>
        </div>
        <Link
          href="/projects"
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
        >
          返回项目中心
        </Link>
      </div>
    );
  }

  const assignmentCount = getAssignmentsForProject(state, project.id).length;
  const activeTaskCount = getTasksForProject(state, project.id).filter((task) => task.status === "in_progress").length;
  const approvalCount = getApprovalsForProject(state, project.id).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,_#0a0a0d,_#09090b_38%,_#09090b)] text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <Link href="/projects" className="text-sm font-semibold tracking-[0.22em] text-cyan-300 uppercase">
              MyOPC
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <span>项目模式</span>
              <span>•</span>
              <span>智能员工共享、页面按项目组织</span>
            </div>
          </div>

          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400">
              先选项目，再进入智能员工 / 知识 / 监控 / 支付 / 集成页面
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 md:block">
              <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">当前项目</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-medium text-white">{project.name}</span>
                <ProjectHealthBadge health={project.health} />
              </div>
            </div>
            <ProjectSwitcher projects={state.projects} currentProject={project} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">项目导航</div>
              <nav className="mt-4 space-y-1.5">
                {navItems.map(({ icon: Icon, label, suffix }) => {
                  const href = `/projects/${project.id}${suffix}`;
                  const active = suffix === "" ? pathname === href : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">本项目快照</div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="驻守员工" value={`${assignmentCount}`} />
                <Stat label="活跃任务" value={`${activeTaskCount}`} />
                <Stat label="待审批" value={`${approvalCount}`} />
                <Stat label="子域名" value={`${project.routes.length}`} />
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-3 text-xs text-zinc-400">
                <div className="mb-1 text-zinc-500">项目目标</div>
                {project.objective}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
