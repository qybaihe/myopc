export type ProjectTemplate = "control-plane" | "commerce" | "growth" | "infra";
export type ProjectHealth = "healthy" | "attention" | "offline";
export type EmployeeStatus = "running" | "busy" | "idle" | "paused";
export type TaskStatus = "in_progress" | "queued" | "review" | "blocked" | "done";
export type IntegrationMode = "live" | "embedded" | "repo" | "demo" | "missing";

export interface ProjectRoute {
  id: string;
  label: string;
  host: string;
  state: "live" | "planned";
  source: "Traefik" | "Demo" | "MyOPC Code Engine";
}

export interface Project {
  id: string;
  name: string;
  template: ProjectTemplate;
  description: string;
  objective: string;
  domain: string;
  subdomain: string;
  stage: "设计中" | "构建中" | "运行中";
  health: ProjectHealth;
  mrr: number;
  visitors7d: number;
  alerts: number;
  deploymentReadiness: number;
  performanceScore: number;
  knowledgeCoverage: number;
  commerceEnabled: boolean;
  monitoringEnabled: boolean;
  analyticsEnabled: boolean;
  repoTargets: string[];
  routes: ProjectRoute[];
  noteMarkdown: string;
}

export interface Employee {
  id: string;
  name: string;
  title: string;
  role: string;
  model: string;
  status: EmployeeStatus;
  monthlyBudget: number;
  spent: number;
  strengths: string[];
  defaultLane: "build" | "ops" | "growth" | "knowledge" | "commerce";
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  roleLabel: string;
  allocation: number;
  focus: string;
  currentTask: string;
  progress: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  employeeId: string;
  title: string;
  status: TaskStatus;
  progress: number;
  priority: "P0" | "P1" | "P2";
  eta: string;
  source: string;
}

export interface Approval {
  id: string;
  projectId: string;
  requesterId: string;
  type: "deploy" | "payment" | "knowledge" | "domain";
  title: string;
  summary: string;
  createdAt: string;
}

export interface CommerceProduct {
  id: string;
  projectId: string;
  name: string;
  plan: string;
  price: number;
  billing: string;
  status: "selling" | "draft";
  conversion: number;
}

export interface PaymentEvent {
  id: string;
  projectId: string;
  kind: "checkout" | "webhook" | "refund" | "subscription";
  title: string;
  amount: number;
  status: "success" | "pending" | "failed";
  time: string;
}

export interface CompanyState {
  projects: Project[];
  employees: Employee[];
  assignments: ProjectAssignment[];
  tasks: ProjectTask[];
  approvals: Approval[];
  products: CommerceProduct[];
  paymentEvents: PaymentEvent[];
}

const architectureDoc = `# MyOPC 项目工作台\n\n- 项目是一级入口\n- 智能员工是共享资源\n- 进入项目后再查看员工、知识、部署、支付、监控\n`;

export const defaultCompanyState: CompanyState = {
  projects: [
    {
      id: "myopc-platform",
      name: "MyOPC 控制台",
      template: "control-plane",
      description: "MyOPC 的公司级多 Agent 编排、知识协同与智能编码工作台。",
      objective: "把智能员工、项目、知识、监控、支付和代码执行都收拢到统一系统。",
      domain: "myopc.local",
      subdomain: "board",
      stage: "构建中",
      health: "healthy",
      mrr: 12840,
      visitors7d: 3840,
      alerts: 2,
      deploymentReadiness: 82,
      performanceScore: 91,
      knowledgeCoverage: 78,
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/paperclip", "repos/opencode", "repos/umami", "repos/uptime-kuma"],
      routes: [
        { id: "board", label: "主控台", host: "board.myopc.local", state: "planned", source: "Traefik" },
        { id: "agents", label: "员工 API", host: "agents.myopc.local", state: "planned", source: "Traefik" },
        { id: "code-engine", label: "智能编码入口", host: "127.0.0.1:50137", state: "live", source: "MyOPC Code Engine" },
      ],
      noteMarkdown: architectureDoc,
    },
    {
      id: "card-station",
      name: "发卡支付站",
      template: "commerce",
      description: "发卡商品、订单、回调、风控与售后页面的 Demo 集成位。",
      objective: "把商品、收款、Webhook、监控都纳入项目维度。",
      domain: "cards.local",
      subdomain: "shop",
      stage: "运行中",
      health: "attention",
      mrr: 46200,
      visitors7d: 9120,
      alerts: 5,
      deploymentReadiness: 74,
      performanceScore: 79,
      knowledgeCoverage: 54,
      commerceEnabled: true,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/traefik", "repos/uptime-kuma", "repos/umami"],
      routes: [
        { id: "shop", label: "商城前台", host: "shop.cards.local", state: "planned", source: "Traefik" },
        { id: "pay", label: "支付回调", host: "pay.cards.local", state: "planned", source: "Traefik" },
        { id: "ops", label: "运营后台", host: "ops.cards.local", state: "planned", source: "Demo" },
      ],
      noteMarkdown: `# 发卡支付站\n\n- 商品页、订单页、支付回调页先做 Demo\n- 监控、分析、知识回写按项目维度收口\n`,
    },
    {
      id: "growth-site",
      name: "增长官网",
      template: "growth",
      description: "官网、内容、SEO、转化追踪和 A/B 实验。",
      objective: "把流量、内容、知识沉淀和营销员工合到一个项目里。",
      domain: "launch.local",
      subdomain: "www",
      stage: "运行中",
      health: "healthy",
      mrr: 0,
      visitors7d: 12640,
      alerts: 1,
      deploymentReadiness: 88,
      performanceScore: 93,
      knowledgeCoverage: 85,
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/umami", "repos/traefik"],
      routes: [
        { id: "home", label: "主站", host: "www.launch.local", state: "planned", source: "Traefik" },
        { id: "blog", label: "内容站", host: "blog.launch.local", state: "planned", source: "Traefik" },
      ],
      noteMarkdown: `# 增长官网\n\n- 项目内看流量、内容、实验\n- 员工跨项目复用，但 KPI 在项目内看\n`,
    },
    {
      id: "ops-gateway",
      name: "API & 监控网关",
      template: "infra",
      description: "接口、二级域名、可用性、性能看板。",
      objective: "把域名分发、服务状态、延迟与告警都做成项目工作台。",
      domain: "oir.me",
      subdomain: "edge",
      stage: "构建中",
      health: "attention",
      mrr: 0,
      visitors7d: 2480,
      alerts: 3,
      deploymentReadiness: 69,
      performanceScore: 76,
      knowledgeCoverage: 62,
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: false,
      repoTargets: ["repos/traefik", "repos/uptime-kuma", "repos/paperclip"],
      routes: [
        { id: "gateway", label: "网关入口", host: "edge.oir.me", state: "planned", source: "Traefik" },
        { id: "status", label: "状态页", host: "status.oir.me", state: "planned", source: "Demo" },
        { id: "code", label: "智能编码入口", host: "code.oir.me", state: "planned", source: "MyOPC Code Engine" },
      ],
      noteMarkdown: `# API & 监控网关\n\n- 这个项目专门看 oir.me 的二级域名、告警、心跳、服务路由\n`,
    },
  ],
  employees: [
    {
      id: "dev-orchestrator",
      name: "Dev Orchestrator",
      title: "产品工程负责人",
      role: "L3 dev-engineer",
      model: "Claude Sonnet 4.1",
      status: "running",
      monthlyBudget: 800,
      spent: 462,
      strengths: ["React", "TypeScript", "MyOPC 控制面", "集成改造"],
      defaultLane: "build",
    },
    {
      id: "ops-sre",
      name: "Ops SRE",
      title: "部署与监控负责人",
      role: "L3 ops-sre",
      model: "GPT-4.1",
      status: "busy",
      monthlyBudget: 500,
      spent: 218,
      strengths: ["Traefik", "Kuma", "回滚", "告警巡检"],
      defaultLane: "ops",
    },
    {
      id: "knowledge-archivist",
      name: "Knowledge Archivist",
      title: "知识沉淀负责人",
      role: "L3 knowledge-architect",
      model: "Gemini 2.5 Pro",
      status: "running",
      monthlyBudget: 360,
      spent: 110,
      strengths: ["Milkdown", "文档体系", "知识索引", "SOP"],
      defaultLane: "knowledge",
    },
    {
      id: "growth-operator",
      name: "Growth Operator",
      title: "增长运营负责人",
      role: "L3 growth-marketer",
      model: "GPT-4o",
      status: "idle",
      monthlyBudget: 420,
      spent: 158,
      strengths: ["内容", "SEO", "转化分析", "A/B 测试"],
      defaultLane: "growth",
    },
    {
      id: "commerce-keeper",
      name: "Commerce Keeper",
      title: "支付与商品负责人",
      role: "L3 commerce-ops",
      model: "Claude Haiku",
      status: "running",
      monthlyBudget: 300,
      spent: 134,
      strengths: ["支付回调", "发卡商品", "售后流程", "订单风控"],
      defaultLane: "commerce",
    },
  ],
  assignments: [
    {
      id: "asg-1",
      projectId: "myopc-platform",
      employeeId: "dev-orchestrator",
      roleLabel: "项目主程",
      allocation: 70,
      focus: "重构项目级工作台与路由结构",
      currentTask: "把项目中心和项目内页面拆开",
      progress: 76,
    },
    {
      id: "asg-2",
      projectId: "myopc-platform",
      employeeId: "knowledge-archivist",
      roleLabel: "知识编排",
      allocation: 60,
      focus: "Milkdown + 本地知识源联动",
      currentTask: "把设计文档和 MyOPC 架构文档挂进项目知识页",
      progress: 64,
    },
    {
      id: "asg-3",
      projectId: "myopc-platform",
      employeeId: "ops-sre",
      roleLabel: "运行保障",
      allocation: 40,
      focus: "MyOPC 控制面 / 智能编码引擎探活",
      currentTask: "梳理可真实接通的本地服务",
      progress: 52,
    },
    {
      id: "asg-4",
      projectId: "card-station",
      employeeId: "dev-orchestrator",
      roleLabel: "支付前台",
      allocation: 35,
      focus: "商品页 + 订单页 + 支付路由",
      currentTask: "收敛发卡商品页面和支付反馈页",
      progress: 58,
    },
    {
      id: "asg-5",
      projectId: "card-station",
      employeeId: "commerce-keeper",
      roleLabel: "支付运维",
      allocation: 80,
      focus: "支付回调、退款和订单风控",
      currentTask: "梳理 Webhook、退款、库存 Demo",
      progress: 71,
    },
    {
      id: "asg-6",
      projectId: "card-station",
      employeeId: "ops-sre",
      roleLabel: "监控联动",
      allocation: 35,
      focus: "支付回调和站点健康告警",
      currentTask: "补可用性和回调监控卡片",
      progress: 49,
    },
    {
      id: "asg-7",
      projectId: "growth-site",
      employeeId: "growth-operator",
      roleLabel: "增长负责人",
      allocation: 90,
      focus: "内容与转化",
      currentTask: "整理内容投放和 SEO 数据页",
      progress: 63,
    },
    {
      id: "asg-8",
      projectId: "growth-site",
      employeeId: "knowledge-archivist",
      roleLabel: "内容知识库",
      allocation: 30,
      focus: "模板库与 SOP",
      currentTask: "把增长模板库按项目挂载",
      progress: 41,
    },
    {
      id: "asg-9",
      projectId: "ops-gateway",
      employeeId: "ops-sre",
      roleLabel: "SRE 主责",
      allocation: 85,
      focus: "二级域名、监控、告警",
      currentTask: "把路由和探活状态集中到项目页",
      progress: 67,
    },
    {
      id: "asg-10",
      projectId: "ops-gateway",
      employeeId: "dev-orchestrator",
      roleLabel: "控制面联调",
      allocation: 20,
      focus: "MyOPC 多 Agent / 智能编码编排链路",
      currentTask: "补集成状态与证据面板",
      progress: 45,
    },
  ],
  tasks: [
    {
      id: "task-1",
      projectId: "myopc-platform",
      employeeId: "dev-orchestrator",
      title: "项目级入口改造",
      status: "in_progress",
      progress: 76,
      priority: "P0",
      eta: "今天",
      source: "MyOPC demo",
    },
    {
      id: "task-2",
      projectId: "myopc-platform",
      employeeId: "knowledge-archivist",
      title: "知识页接 Milkdown + 本地文档索引",
      status: "review",
      progress: 88,
      priority: "P1",
      eta: "今晚",
      source: "MyOPC demo",
    },
    {
      id: "task-3",
      projectId: "card-station",
      employeeId: "commerce-keeper",
      title: "支付成功 / 失败 / 退款状态页",
      status: "in_progress",
      progress: 71,
      priority: "P0",
      eta: "今天",
      source: "MyOPC demo",
    },
    {
      id: "task-4",
      projectId: "card-station",
      employeeId: "ops-sre",
      title: "支付回调告警卡片",
      status: "queued",
      progress: 18,
      priority: "P1",
      eta: "明天",
      source: "MyOPC demo",
    },
    {
      id: "task-5",
      projectId: "growth-site",
      employeeId: "growth-operator",
      title: "内容转化看板",
      status: "in_progress",
      progress: 63,
      priority: "P1",
      eta: "本周",
      source: "MyOPC demo",
    },
    {
      id: "task-6",
      projectId: "ops-gateway",
      employeeId: "ops-sre",
      title: "路由和监控整合面板",
      status: "blocked",
      progress: 39,
      priority: "P0",
      eta: "等待 Traefik/Kuma 真连接",
      source: "MyOPC demo",
    },
  ],
  approvals: [
    {
      id: "approval-1",
      projectId: "myopc-platform",
      requesterId: "dev-orchestrator",
      type: "deploy",
      title: "发布新的项目工作台路由",
      summary: "包含 /projects 入口、项目内导航、右上角项目切换器。",
      createdAt: "8 分钟前",
    },
    {
      id: "approval-2",
      projectId: "card-station",
      requesterId: "commerce-keeper",
      type: "payment",
      title: "开放退款自助入口",
      summary: "先挂 Demo 流程，等待真实支付 API 对接。",
      createdAt: "22 分钟前",
    },
    {
      id: "approval-3",
      projectId: "ops-gateway",
      requesterId: "ops-sre",
      type: "domain",
      title: "新增 edge 子域名编排规则",
      summary: "准备把多项目路由统一收进 Traefik。",
      createdAt: "45 分钟前",
    },
  ],
  products: [
    {
      id: "product-1",
      projectId: "card-station",
      name: "标准发卡包",
      plan: "Starter",
      price: 39,
      billing: "一次性",
      status: "selling",
      conversion: 3.8,
    },
    {
      id: "product-2",
      projectId: "card-station",
      name: "高级发卡包",
      plan: "Pro",
      price: 99,
      billing: "一次性",
      status: "selling",
      conversion: 2.4,
    },
    {
      id: "product-3",
      projectId: "myopc-platform",
      name: "MyOPC 内测席位",
      plan: "Beta",
      price: 199,
      billing: "按月",
      status: "draft",
      conversion: 0.8,
    },
  ],
  paymentEvents: [
    {
      id: "event-1",
      projectId: "card-station",
      kind: "checkout",
      title: "订单 #A-2048 支付完成",
      amount: 99,
      status: "success",
      time: "刚刚",
    },
    {
      id: "event-2",
      projectId: "card-station",
      kind: "webhook",
      title: "Webhook：subscription.updated",
      amount: 0,
      status: "pending",
      time: "12 分钟前",
    },
    {
      id: "event-3",
      projectId: "card-station",
      kind: "refund",
      title: "退款申请 #R-0312",
      amount: 39,
      status: "failed",
      time: "32 分钟前",
    },
  ],
};

export function slugifyProjectName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function buildProjectFromTemplate(input: {
  id: string;
  name: string;
  template: ProjectTemplate;
  domain: string;
  subdomain: string;
  objective: string;
}): Project {
  const templateMap: Record<ProjectTemplate, Partial<Project>> = {
    "control-plane": {
      description: "控制面、智能员工编排、知识与编码引擎联动。",
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/paperclip", "repos/opencode"],
      routes: [
        { id: "board", label: "主控台", host: `${input.subdomain}.${input.domain}`, state: "planned", source: "Traefik" },
      ],
    },
    commerce: {
      description: "商品、支付、订单、回调与售后联动。",
      commerceEnabled: true,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/traefik", "repos/uptime-kuma", "repos/umami"],
      routes: [
        { id: "shop", label: "商城", host: `${input.subdomain}.${input.domain}`, state: "planned", source: "Traefik" },
      ],
    },
    growth: {
      description: "官网、内容、转化与运营模板。",
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: true,
      repoTargets: ["repos/umami"],
      routes: [
        { id: "site", label: "主站", host: `${input.subdomain}.${input.domain}`, state: "planned", source: "Traefik" },
      ],
    },
    infra: {
      description: "二级域名、监控、告警、服务状态。",
      commerceEnabled: false,
      monitoringEnabled: true,
      analyticsEnabled: false,
      repoTargets: ["repos/traefik", "repos/uptime-kuma"],
      routes: [
        { id: "edge", label: "边缘入口", host: `${input.subdomain}.${input.domain}`, state: "planned", source: "Traefik" },
      ],
    },
  };

  const preset = templateMap[input.template];

  return {
    id: input.id,
    name: input.name,
    template: input.template,
    description: preset.description ?? "新项目",
    objective: input.objective,
    domain: input.domain,
    subdomain: input.subdomain,
    stage: "设计中",
    health: "healthy",
    mrr: 0,
    visitors7d: 0,
    alerts: 0,
    deploymentReadiness: 40,
    performanceScore: 70,
    knowledgeCoverage: 20,
    commerceEnabled: preset.commerceEnabled ?? false,
    monitoringEnabled: preset.monitoringEnabled ?? true,
    analyticsEnabled: preset.analyticsEnabled ?? false,
    repoTargets: preset.repoTargets ?? [],
    routes: preset.routes ?? [],
    noteMarkdown: `# ${input.name}\n\n## 项目目标\n\n${input.objective}\n\n## 下一步\n\n- 建立项目导航\n- 选择可复用员工\n- 挂接知识、监控、支付页面\n`,
  };
}

export function getProjectById(state: CompanyState, projectId: string) {
  return state.projects.find((project) => project.id === projectId) ?? null;
}

export function getAssignmentsForProject(state: CompanyState, projectId: string) {
  return state.assignments.filter((assignment) => assignment.projectId === projectId);
}

export function getEmployeesForProject(state: CompanyState, projectId: string) {
  const assignments = getAssignmentsForProject(state, projectId);
  return assignments
    .map((assignment) => {
      const employee = state.employees.find((item) => item.id === assignment.employeeId);
      if (!employee) return null;
      return { employee, assignment };
    })
    .filter((item): item is { employee: Employee; assignment: ProjectAssignment } => item !== null);
}

export function getTasksForProject(state: CompanyState, projectId: string) {
  return state.tasks.filter((task) => task.projectId === projectId);
}

export function getApprovalsForProject(state: CompanyState, projectId: string) {
  return state.approvals.filter((approval) => approval.projectId === projectId);
}

export function getProductsForProject(state: CompanyState, projectId: string) {
  return state.products.filter((product) => product.projectId === projectId);
}

export function getPaymentEventsForProject(state: CompanyState, projectId: string) {
  return state.paymentEvents.filter((event) => event.projectId === projectId);
}

export const performanceSeries: Record<string, Array<{ label: string; latency: number; errors: number }>> = {
  "myopc-platform": [
    { label: "Mon", latency: 320, errors: 2 },
    { label: "Tue", latency: 280, errors: 1 },
    { label: "Wed", latency: 260, errors: 1 },
    { label: "Thu", latency: 310, errors: 3 },
    { label: "Fri", latency: 240, errors: 1 },
    { label: "Sat", latency: 220, errors: 0 },
    { label: "Sun", latency: 250, errors: 1 },
  ],
  "card-station": [
    { label: "Mon", latency: 540, errors: 5 },
    { label: "Tue", latency: 500, errors: 4 },
    { label: "Wed", latency: 610, errors: 7 },
    { label: "Thu", latency: 470, errors: 3 },
    { label: "Fri", latency: 430, errors: 2 },
    { label: "Sat", latency: 590, errors: 6 },
    { label: "Sun", latency: 450, errors: 3 },
  ],
  "growth-site": [
    { label: "Mon", latency: 180, errors: 0 },
    { label: "Tue", latency: 170, errors: 0 },
    { label: "Wed", latency: 190, errors: 1 },
    { label: "Thu", latency: 165, errors: 0 },
    { label: "Fri", latency: 160, errors: 0 },
    { label: "Sat", latency: 175, errors: 1 },
    { label: "Sun", latency: 185, errors: 0 },
  ],
  "ops-gateway": [
    { label: "Mon", latency: 420, errors: 3 },
    { label: "Tue", latency: 460, errors: 5 },
    { label: "Wed", latency: 390, errors: 2 },
    { label: "Thu", latency: 520, errors: 7 },
    { label: "Fri", latency: 410, errors: 4 },
    { label: "Sat", latency: 365, errors: 2 },
    { label: "Sun", latency: 350, errors: 1 },
  ],
};

export const analyticsSeries: Record<string, Array<{ label: string; visitors: number; conversions: number }>> = {
  "myopc-platform": [
    { label: "Mon", visitors: 420, conversions: 21 },
    { label: "Tue", visitors: 500, conversions: 28 },
    { label: "Wed", visitors: 560, conversions: 31 },
    { label: "Thu", visitors: 610, conversions: 34 },
    { label: "Fri", visitors: 590, conversions: 32 },
    { label: "Sat", visitors: 520, conversions: 25 },
    { label: "Sun", visitors: 640, conversions: 39 },
  ],
  "card-station": [
    { label: "Mon", visitors: 980, conversions: 41 },
    { label: "Tue", visitors: 1100, conversions: 49 },
    { label: "Wed", visitors: 1240, conversions: 53 },
    { label: "Thu", visitors: 1320, conversions: 62 },
    { label: "Fri", visitors: 1280, conversions: 58 },
    { label: "Sat", visitors: 1490, conversions: 69 },
    { label: "Sun", visitors: 1710, conversions: 74 },
  ],
  "growth-site": [
    { label: "Mon", visitors: 1600, conversions: 24 },
    { label: "Tue", visitors: 1740, conversions: 26 },
    { label: "Wed", visitors: 1880, conversions: 28 },
    { label: "Thu", visitors: 2010, conversions: 31 },
    { label: "Fri", visitors: 2100, conversions: 33 },
    { label: "Sat", visitors: 1960, conversions: 29 },
    { label: "Sun", visitors: 2150, conversions: 36 },
  ],
  "ops-gateway": [
    { label: "Mon", visitors: 190, conversions: 8 },
    { label: "Tue", visitors: 240, conversions: 10 },
    { label: "Wed", visitors: 260, conversions: 11 },
    { label: "Thu", visitors: 300, conversions: 14 },
    { label: "Fri", visitors: 280, conversions: 13 },
    { label: "Sat", visitors: 220, conversions: 9 },
    { label: "Sun", visitors: 210, conversions: 8 },
  ],
};
