import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { DEFAULT_OPENCODE_LOCAL_MODEL } from "@paperclipai/adapter-opencode-local";
import type { Db } from "@paperclipai/db";
import { agents } from "@paperclipai/db";
import { AGENT_DEFAULT_MAX_CONCURRENT_RUNS } from "@paperclipai/shared";
import { environmentService } from "./environments.js";

const DEFAULT_TEAM_VERSION = 1;

type DefaultAgentSpec = {
  key: string;
  name: string;
  role: "ceo" | "cmo" | "engineer" | "pm" | "researcher" | "general";
  title: string;
  icon: string;
  capabilities: string;
  bootstrapPrompt: string;
  reportsTo: "root" | "ceo";
  canCreateAgents?: boolean;
};

const DEFAULT_AGENT_SPECS: DefaultAgentSpec[] = [
  {
    key: "ceo",
    name: "CEO",
    role: "ceo",
    title: "MyOPC CEO",
    icon: "crown",
    reportsTo: "root",
    canCreateAgents: true,
    capabilities:
      "Owns strategy, priorities, cross-functional coordination, delegation, and final operating decisions for the MyOPC workspace.",
    bootstrapPrompt:
      "You are the MyOPC CEO. Lead the company as an operating system: clarify goals, set priorities, delegate to specialist agents, review outcomes, and keep the user focused on the highest-leverage next step.",
  },
  {
    key: "business-analyst",
    name: "Business Analyst",
    role: "researcher",
    title: "商业分析师",
    icon: "brain",
    reportsTo: "ceo",
    capabilities:
      "Turns fuzzy business questions into market maps, customer segments, pricing logic, KPI trees, and decision-ready briefs.",
    bootstrapPrompt:
      "You are MyOPC's Business Analyst. Structure ambiguous business problems, quantify options, compare tradeoffs, and produce crisp recommendations with assumptions and next actions.",
  },
  {
    key: "growth-marketer",
    name: "Growth Marketer",
    role: "cmo",
    title: "增长营销分析师",
    icon: "target",
    reportsTo: "ceo",
    capabilities:
      "Designs positioning, acquisition funnels, lifecycle messaging, launch plans, content systems, and campaign experiments.",
    bootstrapPrompt:
      "You are MyOPC's Growth Marketer. Build sharp positioning, audience insights, campaign plans, channel tests, and conversion-focused copy while keeping the brand premium and practical.",
  },
  {
    key: "product-operator",
    name: "Product Operator",
    role: "pm",
    title: "产品运营助手",
    icon: "rocket",
    reportsTo: "ceo",
    capabilities:
      "Connects product requirements, user feedback, delivery plans, notifications, payment scenarios, and operational workflows.",
    bootstrapPrompt:
      "You are MyOPC's Product Operator. Translate user intent into product requirements, workflows, acceptance checks, rollout plans, and operational follow-through.",
  },
  {
    key: "code-engineer",
    name: "Code Engineer",
    role: "engineer",
    title: "代码工程助手",
    icon: "code",
    reportsTo: "ceo",
    capabilities:
      "Implements focused code changes, debugs services, runs verification, and explains engineering tradeoffs clearly.",
    bootstrapPrompt:
      "You are MyOPC's Code Engineer. Read the codebase first, make scoped changes, verify behavior, protect secrets, and ship maintainable implementations.",
  },
  {
    key: "full-stack-builder",
    name: "Full-Stack Builder",
    role: "engineer",
    title: "全栈交付助手",
    icon: "terminal",
    reportsTo: "ceo",
    capabilities:
      "Builds end-to-end product surfaces across frontend, backend, integrations, deployment, and release verification.",
    bootstrapPrompt:
      "You are MyOPC's Full-Stack Builder. Deliver complete product flows across UI, API, data, integrations, and deployment checks with a bias toward usable end-to-end outcomes.",
  },
];

function deterministicUuid(namespace: string, value: string): string {
  const bytes = createHash("sha256").update(`${namespace}:${value}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function defaultAgentId(companyId: string, key: string) {
  return deterministicUuid("myopc-default-company-agent", `${companyId}:${key}`);
}

function defaultAgentMetadata(key: string) {
  return {
    managedByMyopc: true,
    myopcDefaultTeamKey: key,
    myopcDefaultTeamVersion: DEFAULT_TEAM_VERSION,
  };
}

function readDefaultTeamKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const key = (metadata as Record<string, unknown>).myopcDefaultTeamKey;
  return typeof key === "string" && key.length > 0 ? key : null;
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function buildAdapterConfig(spec: DefaultAgentSpec): Record<string, unknown> {
  return {
    model: DEFAULT_OPENCODE_LOCAL_MODEL,
    dangerouslySkipPermissions: true,
    timeoutSec: 0,
    graceSec: 20,
    promptTemplate:
      "{{paperclipWake}}\n\nUse your MyOPC role, the issue context, and the user's latest request to produce a concrete outcome. Prefer concise progress updates, implementation when appropriate, and clear verification.",
    bootstrapPromptTemplate: spec.bootstrapPrompt,
  };
}

function buildRuntimeConfig(): Record<string, unknown> {
  return {
    heartbeat: {
      maxConcurrentRuns: AGENT_DEFAULT_MAX_CONCURRENT_RUNS,
    },
    modelProfiles: {
      cheap: {
        enabled: true,
        label: "Unlimited",
        adapterConfig: {
          model: DEFAULT_OPENCODE_LOCAL_MODEL,
        },
      },
    },
  };
}

export async function ensureMyopcDefaultAgentTeam(db: Db, companyId: string) {
  const localEnvironment = await environmentService(db).ensureLocalEnvironment(companyId);
  const existingAgents = await db
    .select({
      id: agents.id,
      name: agents.name,
      role: agents.role,
      status: agents.status,
      reportsTo: agents.reportsTo,
      metadata: agents.metadata,
    })
    .from(agents)
    .where(eq(agents.companyId, companyId));

  const existingByDefaultKey = new Map<string, (typeof existingAgents)[number]>();
  const existingByName = new Map<string, (typeof existingAgents)[number]>();
  for (const agent of existingAgents) {
    const key = readDefaultTeamKey(agent.metadata);
    if (key) existingByDefaultKey.set(key, agent);
    if (agent.status !== "terminated") existingByName.set(normalizeName(agent.name), agent);
  }

  const existingCeo =
    existingByDefaultKey.get("ceo")
    ?? existingAgents.find((agent) => agent.status !== "terminated" && agent.role === "ceo")
    ?? existingByName.get("ceo")
    ?? null;
  const ceoId = existingCeo?.id ?? defaultAgentId(companyId, "ceo");
  const now = new Date();

  const rowsToInsert = DEFAULT_AGENT_SPECS.flatMap((spec) => {
    const deterministicId = defaultAgentId(companyId, spec.key);
    const existingByKey = existingByDefaultKey.get(spec.key);
    const existingByExactName = existingByName.get(normalizeName(spec.name));
    if (existingByKey || existingByExactName || (spec.key === "ceo" && existingCeo)) return [];

    return [{
      id: deterministicId,
      companyId,
      name: spec.name,
      role: spec.role,
      title: spec.title,
      icon: spec.icon,
      status: "idle",
      reportsTo: spec.reportsTo === "ceo" ? ceoId : null,
      capabilities: spec.capabilities,
      adapterType: "opencode_local",
      adapterConfig: buildAdapterConfig(spec),
      runtimeConfig: buildRuntimeConfig(),
      defaultEnvironmentId: localEnvironment.id,
      budgetMonthlyCents: 0,
      spentMonthlyCents: 0,
      permissions: {
        canCreateAgents: spec.canCreateAgents === true,
      },
      metadata: defaultAgentMetadata(spec.key),
      createdAt: now,
      updatedAt: now,
    }];
  });

  if (rowsToInsert.length === 0) {
    return {
      created: 0,
      expected: DEFAULT_AGENT_SPECS.length,
    };
  }

  await db
    .insert(agents)
    .values(rowsToInsert)
    .onConflictDoNothing({
      target: agents.id,
    });

  return {
    created: rowsToInsert.length,
    expected: DEFAULT_AGENT_SPECS.length,
  };
}

export async function ensureMyopcDefaultAgentTeamsForMemberships(
  db: Db,
  memberships: Array<{ companyId: string; status?: string | null }>,
) {
  const companyIds = Array.from(new Set(
    memberships
      .filter((membership) => membership.status === undefined || membership.status === null || membership.status === "active")
      .map((membership) => membership.companyId)
      .filter((companyId) => companyId.length > 0),
  ));

  for (const companyId of companyIds) {
    await ensureMyopcDefaultAgentTeam(db, companyId);
  }
}
