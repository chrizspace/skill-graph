import { describe, expect, it } from "vitest";
import { can, isManager, isPracticeLead, type Actor, type PersonRef } from "./access";

const frontend = { id: "p-frontend", slug: "frontend", name: "Frontend Practice" };
const delivery = { id: "p-delivery", slug: "delivery", name: "Delivery Management" };

const base: Actor = {
  userId: "u-emp",
  name: "Employee",
  email: "e@example.com",
  practiceId: frontend.id,
  reportCount: 0,
  leadOf: [],
  siteLead: false,
};
const employee = base;
const manager: Actor = { ...base, userId: "u-mgr", reportCount: 2 };
const lead: Actor = { ...base, userId: "u-lead", leadOf: [frontend] };
const siteLead: Actor = { ...base, userId: "u-site", siteLead: true };
const everything: Actor = { ...manager, leadOf: [frontend], siteLead: true };

const report: PersonRef = { id: "u-rep", managerId: manager.userId, practiceId: frontend.id };
const stranger: PersonRef = { id: "u-other", managerId: "u-someone", practiceId: delivery.id };

describe("user types follow from the data", () => {
  it("derives manager and Practice Lead", () => {
    expect([isManager(employee), isManager(manager)]).toEqual([false, true]);
    expect([isPracticeLead(employee), isPracticeLead(lead)]).toEqual([false, true]);
  });
});

describe("named profiles", () => {
  it("lets people open their own profile", () => {
    expect(can(employee, "profile:view", { id: employee.userId, managerId: null, practiceId: null })).toBe(
      true,
    );
  });
  it("lets a manager open a direct report's profile", () => {
    expect(can(manager, "profile:view", report)).toBe(true);
  });
  it("lets a Practice Lead open the profiles of their practice's members", () => {
    expect(can(lead, "profile:view", report)).toBe(true);
  });
  it("denies an employee another person's profile", () => {
    expect(can(employee, "profile:view", report)).toBe(false);
  });
  it("denies a manager someone who doesn't report to them", () => {
    expect(can(manager, "profile:view", stranger)).toBe(false);
  });
  it("denies a Practice Lead members of another practice", () => {
    expect(can(lead, "profile:view", stranger)).toBe(false);
    expect(can(lead, "profile:view", { id: "x", managerId: null, practiceId: null })).toBe(false);
  });
  it("denies the Site Lead any named profile but their own", () => {
    expect(can(siteLead, "profile:view", report)).toBe(false);
    expect(can(siteLead, "profile:view", stranger)).toBe(false);
    expect(can(siteLead, "profile:view", { id: siteLead.userId, managerId: null, practiceId: null })).toBe(
      true,
    );
  });
  it("edits only their own profile", () => {
    expect(can(everything, "profile:edit", { id: everything.userId })).toBe(true);
    expect(can(everything, "profile:edit", { id: report.id })).toBe(false);
  });
});

describe("recommendations", () => {
  it("lets a manager recommend to a direct report only", () => {
    expect(can(manager, "recommendation:create", report)).toBe(true);
    expect(can(manager, "recommendation:create", stranger)).toBe(false);
  });
  it("denies employees, Practice Leads and the Site Lead", () => {
    for (const actor of [employee, lead, siteLead])
      expect(can(actor, "recommendation:create", report)).toBe(false);
  });
  it("denies recommending to oneself", () => {
    const self: PersonRef = { id: manager.userId, managerId: manager.userId, practiceId: null };
    expect(can(manager, "recommendation:create", self)).toBe(false);
  });
  it("lets only the receiver answer", () => {
    expect(can(employee, "recommendation:answer", { personId: employee.userId })).toBe(true);
    expect(can(manager, "recommendation:answer", { personId: report.id })).toBe(false);
  });
});

describe("aggregates and succession", () => {
  const team = { kind: "team", managerId: manager.userId } as const;
  const practice = { kind: "practice", practiceId: frontend.id } as const;
  const otherPractice = { kind: "practice", practiceId: delivery.id } as const;
  const site = { kind: "site" } as const;

  it.each(["aggregates:view", "succession:view"] as const)(
    "%s: a manager sees their own team only",
    (action) => {
      expect(can(manager, action, team)).toBe(true);
      expect(can(manager, action, { kind: "team", managerId: "u-someone" })).toBe(false);
      expect(can(manager, action, practice)).toBe(false);
      expect(can(manager, action, site)).toBe(false);
    },
  );
  it.each(["aggregates:view", "succession:view"] as const)(
    "%s: a Practice Lead sees their practice only",
    (action) => {
      expect(can(lead, action, practice)).toBe(true);
      expect(can(lead, action, otherPractice)).toBe(false);
      expect(can(lead, action, site)).toBe(false);
    },
  );
  it.each(["aggregates:view", "succession:view"] as const)(
    "%s: the Site Lead sees every practice and the site",
    (action) => {
      expect(can(siteLead, action, practice)).toBe(true);
      expect(can(siteLead, action, otherPractice)).toBe(true);
      expect(can(siteLead, action, site)).toBe(true);
    },
  );
  it.each(["aggregates:view", "succession:view"] as const)("%s: employees see none", (action) => {
    for (const scope of [team, practice, site]) expect(can(employee, action, scope)).toBe(false);
  });
  it("a manager who isn't one (no reports) has no team", () => {
    expect(can(employee, "aggregates:view", { kind: "team", managerId: employee.userId })).toBe(false);
  });
});

describe("change requests", () => {
  const request = { practiceId: frontend.id, authorId: manager.userId };
  it("lets managers and Practice Leads send them, to any practice", () => {
    expect(can(manager, "changeRequest:create", { practiceId: delivery.id })).toBe(true);
    expect(can(lead, "changeRequest:create", { practiceId: delivery.id })).toBe(true);
  });
  it("denies employees and a plain Site Lead", () => {
    expect(can(employee, "changeRequest:create", { practiceId: frontend.id })).toBe(false);
    expect(can(siteLead, "changeRequest:create", { practiceId: frontend.id })).toBe(false);
  });
  it("shows a request to its author, the practice's leads and the Site Lead", () => {
    expect(can(manager, "changeRequest:view", request)).toBe(true);
    expect(can(lead, "changeRequest:view", request)).toBe(true);
    expect(can(siteLead, "changeRequest:view", request)).toBe(true);
    expect(can(employee, "changeRequest:view", request)).toBe(false);
    expect(can(lead, "changeRequest:view", { ...request, practiceId: delivery.id })).toBe(false);
  });
  it("lets only the author withdraw", () => {
    expect(can(manager, "changeRequest:withdraw", request)).toBe(true);
    expect(can(lead, "changeRequest:withdraw", request)).toBe(false);
  });
  it("lets only the practice's leads review, and the Site Lead in an emergency", () => {
    expect(can(lead, "changeRequest:review", { practiceId: frontend.id })).toBe(true);
    expect(can(lead, "changeRequest:review", { practiceId: delivery.id })).toBe(false);
    expect(can(siteLead, "changeRequest:review", { practiceId: delivery.id })).toBe(true);
    expect(can(manager, "changeRequest:review", { practiceId: frontend.id })).toBe(false);
    expect(can(employee, "changeRequest:review", { practiceId: frontend.id })).toBe(false);
  });
});

describe("controlling roles and the catalogue", () => {
  it("lets a Practice Lead edit roles of their own practice only", () => {
    expect(can(lead, "role:edit", { practiceId: frontend.id })).toBe(true);
    expect(can(lead, "role:edit", { practiceId: delivery.id })).toBe(false);
  });
  it("lets the Site Lead edit any role", () => {
    expect(can(siteLead, "role:edit", { practiceId: delivery.id })).toBe(true);
  });
  it("denies employees and managers", () => {
    for (const actor of [employee, manager])
      expect(can(actor, "role:edit", { practiceId: frontend.id })).toBe(false);
  });
  it("lets Practice Leads and the Site Lead add catalogue items", () => {
    expect(can(lead, "catalogue:add")).toBe(true);
    expect(can(siteLead, "catalogue:add")).toBe(true);
    expect(can(employee, "catalogue:add")).toBe(false);
    expect(can(manager, "catalogue:add")).toBe(false);
  });
  it("lets only the Site Lead merge items, manage the site and read the audit log", () => {
    for (const action of ["catalogue:manage", "site:manage", "audit:view"] as const) {
      expect(can(siteLead, action)).toBe(true);
      for (const actor of [employee, manager, lead]) expect(can(actor, action)).toBe(false);
    }
  });
});
