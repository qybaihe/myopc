"use client";

import {
  CompanyState,
  Employee,
  Project,
  ProjectAssignment,
  ProjectTemplate,
  buildProjectFromTemplate,
  defaultCompanyState,
  slugifyProjectName,
} from "@/lib/company-data";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type CreateProjectInput = {
  name: string;
  template: ProjectTemplate;
  domain: string;
  subdomain: string;
  objective: string;
};

type CompanyContextValue = {
  state: CompanyState;
  hydrated: boolean;
  createProject: (input: CreateProjectInput) => string;
  updateProjectNote: (projectId: string, markdown: string) => void;
  assignEmployeeToProject: (projectId: string, employeeId: string) => void;
  getProject: (projectId: string) => Project | null;
  getEmployee: (employeeId: string) => Employee | null;
  getAssignment: (projectId: string, employeeId: string) => ProjectAssignment | null;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

function createUniqueProjectId(state: CompanyState, rawName: string) {
  const base = slugifyProjectName(rawName) || "project";
  if (!state.projects.some((project) => project.id === base)) return base;

  let index = 2;
  while (state.projects.some((project) => project.id === `${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function createDefaultAssignment(projectId: string, employee: Employee): ProjectAssignment {
  const focusMap: Record<Employee["defaultLane"], { roleLabel: string; focus: string }> = {
    build: {
      roleLabel: "产品工程",
      focus: "先把项目骨架与关键页面跑通",
    },
    ops: {
      roleLabel: "监控运维",
      focus: "补运行状态、告警和发布面板",
    },
    growth: {
      roleLabel: "增长运营",
      focus: "围绕流量和转化建立项目节奏",
    },
    knowledge: {
      roleLabel: "知识体系",
      focus: "建立项目文档与长期知识沉淀",
    },
    commerce: {
      roleLabel: "支付运营",
      focus: "梳理商品、订单、支付和售后链路",
    },
  };

  const preset = focusMap[employee.defaultLane];

  return {
    id: `asg-${projectId}-${employee.id}`,
    projectId,
    employeeId: employee.id,
    roleLabel: preset.roleLabel,
    allocation: 25,
    focus: preset.focus,
    currentTask: `加入 ${projectId} 项目编排`,
    progress: 15,
  };
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompanyState>(defaultCompanyState);

  const createProject = useCallback((input: CreateProjectInput) => {
    let createdId = "";
    setState((current) => {
      createdId = createUniqueProjectId(current, input.name);
      const project = buildProjectFromTemplate({
        id: createdId,
        name: input.name,
        template: input.template,
        domain: input.domain,
        subdomain: input.subdomain,
        objective: input.objective,
      });
      return {
        ...current,
        projects: [project, ...current.projects],
      };
    });
    return createdId;
  }, []);

  const updateProjectNote = useCallback((projectId: string, markdown: string) => {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, noteMarkdown: markdown } : project
      ),
    }));
  }, []);

  const assignEmployeeToProject = useCallback((projectId: string, employeeId: string) => {
    setState((current) => {
      const existing = current.assignments.find(
        (assignment) => assignment.projectId === projectId && assignment.employeeId === employeeId
      );
      if (existing) return current;
      const employee = current.employees.find((item) => item.id === employeeId);
      if (!employee) return current;
      return {
        ...current,
        assignments: [...current.assignments, createDefaultAssignment(projectId, employee)],
      };
    });
  }, []);

  const getProject = useCallback(
    (projectId: string) => state.projects.find((project) => project.id === projectId) ?? null,
    [state.projects]
  );

  const getEmployee = useCallback(
    (employeeId: string) => state.employees.find((employee) => employee.id === employeeId) ?? null,
    [state.employees]
  );

  const getAssignment = useCallback(
    (projectId: string, employeeId: string) =>
      state.assignments.find(
        (assignment) => assignment.projectId === projectId && assignment.employeeId === employeeId
      ) ?? null,
    [state.assignments]
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      state,
      hydrated: true,
      createProject,
      updateProjectNote,
      assignEmployeeToProject,
      getProject,
      getEmployee,
      getAssignment,
    }),
    [state, createProject, updateProjectNote, assignEmployeeToProject, getProject, getEmployee, getAssignment]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within CompanyProvider");
  }
  return context;
}
