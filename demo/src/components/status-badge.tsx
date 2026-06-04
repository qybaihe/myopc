import { IntegrationMode, ProjectHealth } from "@/lib/company-data";

const integrationClasses: Record<IntegrationMode, string> = {
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  embedded: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  repo: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  demo: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  missing: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

const integrationLabel: Record<IntegrationMode, string> = {
  live: "真实在线",
  embedded: "内嵌可用",
  repo: "仓库已接入",
  demo: "页面 Demo",
  missing: "未发现",
};

const projectHealthClasses: Record<ProjectHealth, string> = {
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  attention: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  offline: "border-red-500/30 bg-red-500/10 text-red-300",
};

const projectHealthLabel: Record<ProjectHealth, string> = {
  healthy: "运行健康",
  attention: "需要关注",
  offline: "离线",
};

export function IntegrationBadge({ mode }: { mode: IntegrationMode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${integrationClasses[mode]}`}>
      {integrationLabel[mode]}
    </span>
  );
}

export function ProjectHealthBadge({ health }: { health: ProjectHealth }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${projectHealthClasses[health]}`}>
      {projectHealthLabel[health]}
    </span>
  );
}
