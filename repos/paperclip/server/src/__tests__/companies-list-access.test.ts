import { describe, expect, it } from "vitest";
import { filterCompaniesForActor } from "../routes/companies.js";

const companies = [
  { id: "company-member", name: "Member company" },
  { id: "company-other", name: "Other company" },
] as unknown as Parameters<typeof filterCompaniesForActor>[0];

describe("filterCompaniesForActor", () => {
  it("limits authenticated instance admins to companies they can actually enter", () => {
    const result = filterCompaniesForActor(companies, {
      type: "board",
      userId: "admin-1",
      isInstanceAdmin: true,
      companyIds: ["company-member"],
      memberships: [{ companyId: "company-member", membershipRole: "owner", status: "active" }],
      source: "session",
    });

    expect(result.map((company) => company.id)).toEqual(["company-member"]);
  });

  it("keeps local trusted mode unrestricted", () => {
    const result = filterCompaniesForActor(companies, {
      type: "board",
      userId: "local-board",
      isInstanceAdmin: true,
      source: "local_implicit",
    });

    expect(result.map((company) => company.id)).toEqual(["company-member", "company-other"]);
  });
});
