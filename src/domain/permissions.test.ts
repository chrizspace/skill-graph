import { describe, expect, it } from "vitest";
import { permissionMatrix, userTypes, type UserType } from "./permissions";

const rows = permissionMatrix().flatMap((g) => g.rows);
const row = (label: RegExp) => {
  const r = rows.find((x) => label.test(x.label));
  if (!r) throw new Error(`no row ${label}`);
  return r.allowed;
};
const who = (allowed: Record<UserType, boolean>) => userTypes.filter((t) => allowed[t]);

describe("the permission matrix", () => {
  it("lists the four user types in order", () => {
    expect(userTypes).toEqual(["employee", "manager", "practice_lead", "site_lead"]);
  });
  it("starts with the own profile", () => {
    expect(permissionMatrix()[0].label).toBe("Own profile");
  });
  it("gives every row an answer for every type", () => {
    for (const r of rows) expect(Object.keys(r.allowed).sort()).toEqual([...userTypes].sort());
  });
  it("lets everyone browse and keep their own profile", () => {
    expect(who(row(/Browse roles/))).toEqual([...userTypes]);
    expect(who(row(/Keep my profile/))).toEqual([...userTypes]);
  });
  it("keeps named profiles to the person, their manager and the leads of their practice", () => {
    expect(who(row(/named profile of a direct report/))).toEqual(["manager"]);
    expect(who(row(/member of their practice/))).toEqual(["practice_lead"]);
    expect(who(row(/named profile of anyone else/))).toEqual([]);
  });
  it("lets only managers recommend steps", () => {
    expect(who(row(/Recommend a development step/))).toEqual(["manager"]);
  });
  it("scopes gaps and succession", () => {
    expect(who(row(/gaps and succession of their team/))).toEqual(["manager"]);
    expect(who(row(/gaps and succession of their practice/))).toEqual(["practice_lead", "site_lead"]);
    expect(who(row(/whole site/))).toEqual(["site_lead"]);
  });
  it("lets managers and Practice Leads send change requests, and Practice Leads edit their practice", () => {
    expect(who(row(/Send a change request/))).toEqual(["manager", "practice_lead"]);
    expect(who(row(/Edit the roles, requirements/))).toEqual(["practice_lead", "site_lead"]);
    expect(who(row(/roles of another practice/))).toEqual(["site_lead"]);
  });
  it("keeps site administration to the Site Lead", () => {
    expect(who(row(/Manage practices/))).toEqual(["site_lead"]);
    expect(who(row(/audit log/))).toEqual(["site_lead"]);
    expect(who(row(/Merge duplicates/))).toEqual(["site_lead"]);
    expect(who(row(/Add a skill/))).toEqual(["practice_lead", "site_lead"]);
  });
});
