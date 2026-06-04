import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { actorMiddleware } from "../middleware/auth.js";

function createSelectChain(rows: unknown[]) {
  return {
    from() {
      return {
        where() {
          return Promise.resolve(rows);
        },
      };
    },
  };
}

function createDb() {
  return {
    select: vi
      .fn()
      .mockImplementationOnce(() => createSelectChain([]))
      .mockImplementationOnce(() => createSelectChain([])),
  } as any;
}

function createAutoCompanyDb(options: {
  memberships?: Array<{ companyId: string; membershipRole: string; status: string }>;
  existingAgents?: Array<Record<string, unknown>>;
} = {}) {
  const inserts: Array<{ values: Record<string, unknown> | Record<string, unknown>[] }> = [];
  function createInsertChain() {
    let lastValues: Record<string, unknown> | Record<string, unknown>[] = {};
    const chain = {
      values(values: Record<string, unknown> | Record<string, unknown>[]) {
        lastValues = values;
        inserts.push({ values });
        return chain;
      },
      onConflictDoNothing() {
        return chain;
      },
      onConflictDoUpdate() {
        return chain;
      },
      returning() {
        const value = Array.isArray(lastValues) ? lastValues[0] ?? {} : lastValues;
        return Promise.resolve([{
          id: value.id ?? `generated-${inserts.length}`,
          companyId: value.companyId,
          name: value.name ?? "Local",
          description: value.description ?? null,
          driver: value.driver ?? "local",
          status: value.status ?? "active",
          config: value.config ?? {},
          metadata: value.metadata ?? null,
          membershipRole: value.membershipRole,
          createdAt: value.createdAt ?? new Date(),
          updatedAt: value.updatedAt ?? new Date(),
        }]);
      },
    };
    return chain;
  }

  const tx = {
    select: vi.fn(() => createSelectChain([])),
    insert: vi.fn(createInsertChain),
  };

  return {
    db: {
      select: vi
        .fn()
        .mockImplementationOnce(() => createSelectChain([]))
        .mockImplementationOnce(() => createSelectChain(options.memberships ?? []))
        .mockImplementation(() => createSelectChain(options.existingAgents ?? [])),
      insert: vi.fn(createInsertChain),
      transaction: vi.fn((callback) => callback(tx)),
    } as any,
    inserts,
    tx,
  };
}

describe("actorMiddleware authenticated session profile", () => {
  const originalCloudTenantToken = process.env.PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN;

  afterEach(() => {
    if (originalCloudTenantToken === undefined) delete process.env.PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN;
    else process.env.PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN = originalCloudTenantToken;
  });

  it("preserves the signed-in user name and email on the board actor", async () => {
    const app = express();
    app.use(
      actorMiddleware(createDb(), {
        deploymentMode: "authenticated",
        resolveSession: async () => ({
          session: { id: "session-1", userId: "user-1" },
          user: {
            id: "user-1",
            name: "User One",
            email: "user@example.com",
          },
        }),
      }),
    );
    app.get("/actor", (req, res) => {
      res.json(req.actor);
    });

    const res = await request(app).get("/actor");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: "board",
      userId: "user-1",
      userName: "User One",
      userEmail: "user@example.com",
      source: "session",
      companyIds: [],
      memberships: [],
      isInstanceAdmin: false,
    });
  });

  it("auto-creates an owned company for signed-in users without company access when enabled", async () => {
    const { db, inserts } = createAutoCompanyDb();
    const app = express();
    app.use(
      actorMiddleware(db, {
        deploymentMode: "authenticated",
        autoCreateCompanyForNewUsers: true,
        resolveSession: async () => ({
          session: { id: "session-1", userId: "user-1" },
          user: {
            id: "user-1",
            name: "User One",
            email: "user@example.com",
          },
        }),
      }),
    );
    app.get("/actor", (req, res) => {
      res.json(req.actor);
    });

    const res = await request(app).get("/actor");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: "board",
      userId: "user-1",
      userName: "User One",
      userEmail: "user@example.com",
      source: "session",
      memberships: [expect.objectContaining({ membershipRole: "owner", status: "active" })],
      isInstanceAdmin: false,
    });
    expect(res.body.companyIds[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserts).toHaveLength(4);
    expect(inserts[0]?.values).toMatchObject({
      id: res.body.companyIds[0],
      name: "User One's Company",
      status: "active",
    });
    expect(inserts[0]?.values.issuePrefix).toMatch(/^U[A-F0-9]{10}$/);
    expect(inserts[1]?.values).toMatchObject({
      companyId: res.body.companyIds[0],
      principalType: "user",
      principalId: "user-1",
      status: "active",
      membershipRole: "owner",
    });
    expect(inserts[2]?.values).toMatchObject({
      companyId: res.body.companyIds[0],
      name: "Local",
      driver: "local",
      status: "active",
    });
    expect(inserts[3]?.values).toEqual(expect.arrayContaining([
      expect.objectContaining({
        companyId: res.body.companyIds[0],
        name: "CEO",
        role: "ceo",
        adapterType: "opencode_local",
      }),
      expect.objectContaining({
        companyId: res.body.companyIds[0],
        name: "Business Analyst",
        title: "商业分析师",
        adapterType: "opencode_local",
      }),
      expect.objectContaining({
        companyId: res.body.companyIds[0],
        name: "Growth Marketer",
        title: "增长营销分析师",
        adapterType: "opencode_local",
      }),
      expect.objectContaining({
        companyId: res.body.companyIds[0],
        name: "Code Engineer",
        title: "代码工程助手",
        adapterConfig: expect.objectContaining({ model: "anthropic/MiniMax-M3" }),
      }),
    ]));
  });

  it("fills the default agent bench for existing user-owned companies without duplicating the CEO", async () => {
    const { db, inserts } = createAutoCompanyDb({
      memberships: [{ companyId: "company-existing", membershipRole: "owner", status: "active" }],
      existingAgents: [{
        id: "ceo-existing",
        name: "CEO",
        role: "ceo",
        status: "idle",
        reportsTo: null,
        metadata: null,
      }],
    });
    const app = express();
    app.use(
      actorMiddleware(db, {
        deploymentMode: "authenticated",
        autoCreateCompanyForNewUsers: true,
        resolveSession: async () => ({
          session: { id: "session-1", userId: "user-1" },
          user: {
            id: "user-1",
            name: "User One",
            email: "user@example.com",
          },
        }),
      }),
    );
    app.get("/actor", (req, res) => {
      res.json(req.actor);
    });

    const res = await request(app).get("/actor");

    expect(res.status).toBe(200);
    expect(res.body.companyIds).toEqual(["company-existing"]);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]?.values).toMatchObject({
      companyId: "company-existing",
      name: "Local",
      driver: "local",
    });
    const insertedAgents = inserts[1]?.values as Record<string, unknown>[];
    expect(insertedAgents).toHaveLength(5);
    expect(insertedAgents).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Business Analyst", reportsTo: "ceo-existing" }),
      expect.objectContaining({ name: "Growth Marketer", reportsTo: "ceo-existing" }),
      expect.objectContaining({ name: "Product Operator", reportsTo: "ceo-existing" }),
      expect.objectContaining({ name: "Code Engineer", reportsTo: "ceo-existing" }),
      expect.objectContaining({ name: "Full-Stack Builder", reportsTo: "ceo-existing" }),
    ]));
    expect(insertedAgents.some((agent) => agent.name === "CEO")).toBe(false);
  });

  it("trusts Cloud tenant identity headers and seeds board access", async () => {
    process.env.PAPERCLIP_CLOUD_TENANT_SERVER_TOKEN = "tenant-token";
    const inserts: Array<{ values: Record<string, unknown> }> = [];
    const db = {
      insert: vi.fn(() => {
        const chain = {
          values(values: Record<string, unknown>) {
            inserts.push({ values });
            return chain;
          },
          onConflictDoUpdate() {
            return chain;
          },
          onConflictDoNothing() {
            return chain;
          },
          returning() {
            return Promise.resolve([{
              companyId: inserts.at(-1)?.values.companyId,
              membershipRole: inserts.at(-1)?.values.membershipRole,
              status: inserts.at(-1)?.values.status,
            }]);
          },
        };
        return chain;
      }),
      select: vi.fn(),
    } as any;
    const app = express();
    app.use(
      actorMiddleware(db, {
        deploymentMode: "authenticated",
        resolveSession: async () => null,
      }),
    );
    app.get("/actor", (req, res) => {
      res.json(req.actor);
    });

    const res = await request(app)
      .get("/actor")
      .set("x-paperclip-cloud-tenant-token", "tenant-token")
      .set("x-paperclip-cloud-user-id", "global-user-1")
      .set("x-paperclip-cloud-user-email", "owner@example.com")
      .set("x-paperclip-cloud-user-name", "Stack Owner")
      .set("x-paperclip-cloud-stack-id", "stack-alpha")
      .set("x-paperclip-cloud-paperclip-company-id", "paperclip-stack-alpha")
      .set("x-paperclip-cloud-stack-role", "owner");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: "board",
      userId: "global-user-1",
      userName: "Stack Owner",
      userEmail: "owner@example.com",
      source: "cloud_tenant",
      isInstanceAdmin: true,
      memberships: [expect.objectContaining({ membershipRole: "owner", status: "active" })],
    });
    expect(res.body.companyIds[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserts).toHaveLength(4);
    expect(inserts[0]?.values).toMatchObject({
      id: "global-user-1",
      email: "owner@example.com",
      emailVerified: true,
    });
  });
});
