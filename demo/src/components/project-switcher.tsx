"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, FolderKanban } from "lucide-react";
import { Project } from "@/lib/company-data";
import { ProjectHealthBadge } from "@/components/status-badge";

export default function ProjectSwitcher({
  projects,
  currentProject,
}: {
  projects: Project[];
  currentProject: Project;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const suffix = useMemo(() => {
    const prefix = `/projects/${currentProject.id}`;
    if (!pathname.startsWith(prefix)) return "";
    return pathname.slice(prefix.length) || "";
  }, [currentProject.id, pathname]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-w-56 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left transition hover:bg-white/[0.07]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-xl bg-cyan-500/10 p-2 text-cyan-300">
            <FolderKanban className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{currentProject.name}</span>
            <span className="block truncate text-xs text-zinc-400">{currentProject.subdomain}.{currentProject.domain}</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-3 w-[22rem] overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/projects/${project.id}${suffix}`);
              }}
              className={`mb-1 flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition last:mb-0 ${
                project.id === currentProject.id
                  ? "bg-white/[0.08]"
                  : "hover:bg-white/[0.05]"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{project.name}</div>
                <div className="mt-1 truncate text-xs text-zinc-500">{project.description}</div>
              </div>
              <div className="ml-3 shrink-0">
                <ProjectHealthBadge health={project.health} />
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
