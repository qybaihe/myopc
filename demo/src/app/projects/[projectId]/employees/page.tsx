"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowRightLeft, Plus } from "lucide-react";
import Panel from "@/components/panel";
import { useCompany } from "@/lib/company-context";
import { getEmployeesForProject, getProjectById } from "@/lib/company-data";

export default function ProjectEmployeesPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated, assignEmployeeToProject } = useCompany();
  const project = getProjectById(state, projectId);
  const staffing = getEmployeesForProject(state, projectId);

  const unassignedEmployees = useMemo(
    () => state.employees.filter((employee) => !staffing.some((item) => item.employee.id === employee.id)),
    [staffing, state.employees]
  );

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">员工编排</div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{project.name} 的共享员工配置</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              这里不再讨论“员工到底跟项目走还是全局有一堆”这个歧义：员工仍然是共享资源池，但项目里只显示当前被分配进来的员工，并且能看到他们在其他项目上的负载。
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-zinc-400">
            当前项目已分配 <span className="font-semibold text-white">{staffing.length}</span> 名员工
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="当前驻守员工" description="这里显示的是项目内视图；员工的其他项目负载会附在卡片上。">
          <div className="space-y-4">
            {staffing.map(({ employee, assignment }) => {
              const otherProjects = state.assignments
                .filter((item) => item.employeeId === employee.id && item.projectId !== projectId)
                .map((item) => state.projects.find((projectItem) => projectItem.id === item.projectId)?.name)
                .filter(Boolean) as string[];

              return (
                <div key={assignment.id} className="rounded-[28px] border border-white/8 bg-black/20 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-white">{employee.name}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-400">
                          {employee.role}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-zinc-500">{employee.title} · {employee.model}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Tag>当前职责：{assignment.roleLabel}</Tag>
                        <Tag>分配占比：{assignment.allocation}%</Tag>
                        <Tag>预算：¥{employee.spent} / ¥{employee.monthlyBudget}</Tag>
                      </div>
                    </div>

                    <div className="min-w-72 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">当前聚焦</div>
                      <div className="mt-2 text-sm text-white">{assignment.focus}</div>
                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                          <span>{assignment.currentTask}</span>
                          <span>{assignment.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${assignment.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/8 pt-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">跨项目流转</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {otherProjects.length ? otherProjects.map((name) => <Tag key={name}>{name}</Tag>) : <Tag>当前只服务这个项目</Tag>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="可复用员工池" description="新项目创建后，可以把共享员工临时拉进来，而不是复制出一套新员工。">
            <div className="space-y-3">
              {unassignedEmployees.length ? (
                unassignedEmployees.map((employee) => (
                  <div key={employee.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{employee.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">{employee.title} · {employee.model}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {employee.strengths.map((strength) => (
                            <Tag key={strength}>{strength}</Tag>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => assignEmployeeToProject(projectId, employee.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/15"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        拉入项目
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-6 text-sm text-zinc-500">共享员工都已经在本项目中有编排关系了。</div>
              )}
            </div>
          </Panel>

          <Panel title="编排判断准则" description="这是这轮页面重构时真正落地的规则。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Rule text="项目是一级入口，所以员工、知识、支付、监控全部挂到项目内部导航。" />
              <Rule text="员工是共享资源池，所以不复制员工实体，只在项目里建立 assignment。" />
              <Rule text="项目内页面只展示当前项目的任务、审批、知识与运营数据，不再混全局。" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-zinc-300">{children}</span>;
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
      <span>{text}</span>
    </div>
  );
}
