import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../domain/access";
import type { Graph } from "../domain/graph";
import { loadActor } from "./actor";
import {
  addComment,
  approveRequest,
  createRequest,
  EditError,
  ForbiddenError,
  listRequests,
  loadRequest,
  rejectRequest,
  requestInfo,
  withdrawRequest,
} from "./change-requests";
import { loadGraph } from "./graph";
import { auditLog, changeRequests, edges, nodes } from "./schema";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
let morgan: Actor; // manager, Frontend
let riley: Actor; // manager, Delivery
let taylor: Actor; // Practice Lead, Frontend
let casey: Actor; // Practice Lead, Delivery
let robin: Actor; // Practice Lead, Backend & Architecture
let jordan: Actor; // Site Lead
let alex: Actor; // employee
let frontend: string;
let delivery: string;

const id = (name: string) => [...graph.nodes.values()].find((n) => n.name === name)!.id;
const refresh = async () => (graph = await loadGraph(t.db));
const actor = async (userId: string) => (await loadActor(t.db, userId))!;
const reject = async (p: Promise<unknown>, type: typeof EditError | typeof ForbiddenError = EditError) => {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  return err as Error;
};
const requires = async (roleName: string, itemName: string) => {
  await refresh();
  return graph.edges.some(
    (e) => e.kind === "requires" && e.sourceId === id(roleName) && e.targetId === id(itemName),
  );
};
const auditCount = async () => (await t.db.select().from(auditLog)).length;
const status = async (requestId: string) =>
  (await t.db.select().from(changeRequests).where(eq(changeRequests.id, requestId)))[0];

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
  await refresh();
  [morgan, riley, taylor, casey, robin, jordan, alex] = await Promise.all(
    ["seed-morgan", "seed-riley", "seed-taylor", "seed-casey", "seed-robin", "seed-jordan", "seed-alex"].map(
      actor,
    ),
  );
  frontend = taylor.leadOf[0].id;
  delivery = casey.leadOf[0].id;
});
afterAll(async () => {
  await t.client.close();
});

describe("sending", () => {
  it("a manager sends feedback on a role to its practice; the reason and the operations are kept", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "  Our UX people need it every day.  ",
      changes: [{ op: "add_requirement", itemId: id("Docker"), priority: "nice", note: "For prototypes" }],
    });
    expect(r).toMatchObject({
      status: "open",
      authorId: "seed-morgan",
      reason: "Our UX people need it every day.",
      practiceId: frontend,
    });
    expect(r.changes).toHaveLength(1);
    const rows = await t.db.select().from(auditLog).where(eq(auditLog.changeRequestId, r.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "create", entity: "change_request", actorId: "seed-morgan" });
  });

  it("a Practice Lead may send one to another practice; employees may not", async () => {
    const r = await createRequest(t.db, casey, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "A view from Delivery.",
      changes: [
        {
          op: "update_description",
          description: "Designs and builds interfaces, in close contact with delivery teams.",
        },
      ],
    });
    expect(r.authorId).toBe("seed-casey");
    await reject(
      createRequest(t.db, alex, {
        practiceId: frontend,
        roleId: id("UX Developer"),
        reason: "x",
        changes: [{ op: "update_description", description: "x" }],
      }),
      ForbiddenError,
    );
  });

  it("refuses a missing reason, nothing to change, a role of another practice, a draft or unknown role, and rule breaks", async () => {
    const ok = [{ op: "update_description", description: "A new description." }];
    const base = { practiceId: frontend, roleId: id("UX Developer"), reason: "Because." };
    await reject(createRequest(t.db, morgan, { ...base, reason: "  ", changes: ok }));
    expect((await reject(createRequest(t.db, morgan, { ...base, changes: [] }))).message).toBe(
      "Add at least one change to the request.",
    );
    await reject(createRequest(t.db, morgan, { ...base, changes: [{ op: "nonsense" }] }));
    await reject(createRequest(t.db, morgan, { ...base, roleId: id("Scrum Master"), changes: ok })); // not this practice's role
    await reject(
      createRequest(t.db, morgan, { ...base, roleId: "00000000-0000-4000-8000-0000000000ff", changes: ok }),
    );
    await reject(createRequest(t.db, morgan, { ...base, roleId: id("SQL"), changes: ok })); // an item, not a role
    await reject(
      createRequest(t.db, morgan, { ...base, changes: [{ op: "remove_requirement", itemId: id("Docker") }] }),
    ); // not required
    await reject(
      createRequest(t.db, morgan, {
        ...base,
        changes: [{ op: "propose_role", name: "Scrum Master", description: "x" }],
        roleId: null,
      }),
    ); // name taken
    await reject(
      createRequest(t.db, morgan, {
        ...base,
        changes: [{ op: "update_description", description: "x" }],
        practiceId: "00000000-0000-4000-8000-0000000000ee",
      }),
    );
    // anything but a new-role proposal needs a role
    await reject(createRequest(t.db, morgan, { ...base, roleId: null, changes: ok }));
  });
});

describe("who sees a request", () => {
  it("the author, the practice's leads and the Site Lead; nobody else", async () => {
    const [seeded] = (
      await t.db.select().from(changeRequests).where(eq(changeRequests.authorId, "seed-morgan"))
    ).filter((r) => r.status === "open");
    expect(await loadRequest(t.db, morgan, seeded.id)).not.toBeNull();
    expect(await loadRequest(t.db, taylor, seeded.id)).not.toBeNull();
    expect(await loadRequest(t.db, jordan, seeded.id)).not.toBeNull();
    expect(await loadRequest(t.db, alex, seeded.id)).toBeNull(); // an employee
    expect(await loadRequest(t.db, riley, seeded.id)).toBeNull(); // another manager
    expect(await loadRequest(t.db, casey, seeded.id)).toBeNull(); // another practice's lead
    expect(await loadRequest(t.db, robin, seeded.id)).toBeNull();
    expect(await loadRequest(t.db, taylor, "00000000-0000-4000-8000-0000000000aa")).toBeNull();
  });

  it("lists what I sent and (for leads) what waits in my practices, pending ones first", async () => {
    const morganList = await listRequests(t.db, morgan);
    expect(morganList.inbox).toEqual([]);
    expect(morganList.mine.length).toBeGreaterThanOrEqual(3);
    expect(morganList.mine[0].status).toBe("open");
    expect(morganList.mine.at(-1)!.status).toBe("rejected");
    expect(
      morganList.mine.every((r) => r.authorName === "Morgan Lee" && r.practiceName === "Frontend Practice"),
    ).toBe(true);

    const taylorList = await listRequests(t.db, taylor);
    expect(taylorList.inbox.every((r) => r.practiceId === frontend)).toBe(true);
    expect(taylorList.inbox.length).toBeGreaterThanOrEqual(4);
    const caseyList = await listRequests(t.db, casey);
    expect(caseyList.inbox.some((r) => r.practiceId === delivery)).toBe(true);
    expect(caseyList.inbox.some((r) => r.practiceId === frontend)).toBe(false);
    const all = await listRequests(t.db, jordan);
    expect(
      all.inbox.some((r) => r.practiceId === frontend) && all.inbox.some((r) => r.practiceId === delivery),
    ).toBe(true);
    expect((await listRequests(t.db, alex)).inbox).toEqual([]);
  });

  it("the seeded request shows its thread", async () => {
    const needsInfo = (
      await t.db.select().from(changeRequests).where(eq(changeRequests.status, "needs_info"))
    )[0];
    const detail = (await loadRequest(t.db, riley, needsInfo.id))!;
    expect(detail.comments).toHaveLength(1);
    expect(detail.comments[0]).toMatchObject({ authorName: "Casey Lin" });
    const rejected = (
      await t.db.select().from(changeRequests).where(eq(changeRequests.status, "rejected"))
    )[0];
    const d2 = (await loadRequest(t.db, morgan, rejected.id))!;
    expect(d2).toMatchObject({ status: "rejected", decidedByName: "Taylor Brooks" });
    expect(d2.decisionNote).toContain("Accessibility stays Important");
  });
});

describe("approving", () => {
  it("applies every operation in one go, links the audit rows to the request, and closes it (Scenario 4)", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "Two things for UX.",
      changes: [
        { op: "add_requirement", itemId: id("Docker"), priority: "nice", note: "For prototypes" },
        { op: "update_description", description: "Designs and builds interfaces and prototypes them." },
      ],
    });
    await reject(approveRequest(t.db, morgan, r.id), ForbiddenError); // the author can't approve their own
    await reject(approveRequest(t.db, casey, r.id), ForbiddenError); // another practice's lead
    await reject(approveRequest(t.db, alex, r.id), ForbiddenError);
    expect(await requires("UX Developer", "Docker")).toBe(false);

    await approveRequest(t.db, taylor, r.id, "Good idea.");
    expect(await requires("UX Developer", "Docker")).toBe(true);
    expect(graph.nodes.get(id("UX Developer"))!.description).toBe(
      "Designs and builds interfaces and prototypes them.",
    );
    expect(await status(r.id)).toMatchObject({
      status: "approved",
      decidedBy: "seed-taylor",
      decisionNote: "Good idea.",
    });

    const rows = await t.db.select().from(auditLog).where(eq(auditLog.changeRequestId, r.id));
    // created, two applied changes, the approval
    expect(rows.map((x) => `${x.entity}:${x.action}`).sort()).toEqual([
      "change_request:create",
      "change_request:update",
      "edge:create",
      "node:update",
    ]);
    expect(rows.filter((x) => x.actorId === "seed-taylor")).toHaveLength(3);
    const detail = (await loadRequest(t.db, morgan, r.id))!;
    expect(detail.applied.map((a) => a.entity).sort()).toEqual(["edge", "node"]);
  });

  it("a decided request can't be decided or commented on again", async () => {
    const approved = "00000000-0000-4000-8000-000000000203"; // Riley's Jira request, approved by Casey
    expect((await reject(approveRequest(t.db, casey, approved))).message).toContain("already been decided");
    await reject(rejectRequest(t.db, casey, approved, "no"));
    await reject(rejectRequest(t.db, taylor, approved, "no"), ForbiddenError); // another practice's lead
    await reject(withdrawRequest(t.db, morgan, approved), ForbiddenError); // not his request
    await reject(withdrawRequest(t.db, riley, approved)); // his own, but decided
    await reject(addComment(t.db, riley, approved, "one more thing"));
  });

  it("the Site Lead may approve in an emergency, and the applied changes say so", async () => {
    const r = await createRequest(t.db, riley, {
      practiceId: delivery,
      roleId: id("Project Manager"),
      reason: "Estimation is used daily.",
      changes: [{ op: "update_requirement", itemId: id("Estimation"), priority: "important" }],
    });
    await approveRequest(t.db, jordan, r.id);
    const applied = (await t.db.select().from(auditLog).where(eq(auditLog.changeRequestId, r.id))).find(
      (x) => x.entity === "edge",
    )!;
    expect(applied.actorId).toBe("seed-jordan");
    expect(applied.after).toMatchObject({ emergency: true, priority: "important" });
  });

  it("a request that no longer applies fails with the reason, and changes nothing (all or nothing)", async () => {
    // two requests that both add Kubernetes to Frontend Developer; and one that also removes something
    const first = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("Full-stack Developer"),
      reason: "A",
      changes: [{ op: "add_requirement", itemId: id("Kubernetes"), priority: "nice" }],
    });
    const second = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("Full-stack Developer"),
      reason: "B",
      changes: [
        { op: "remove_requirement", itemId: id("SQL") },
        { op: "add_requirement", itemId: id("Kubernetes"), priority: "important" },
      ],
    });
    await approveRequest(t.db, taylor, first.id);
    const before = await auditCount();
    const err = await reject(approveRequest(t.db, taylor, second.id));
    expect(err.message).toContain("No longer applies");
    expect(err.message).toContain("already requires");
    expect(await auditCount()).toBe(before); // nothing was written
    expect(await requires("Full-stack Developer", "SQL")).toBe(true); // the removal was not applied either
    expect((await status(second.id)).status).toBe("open");
    // and the author can still withdraw it
    await withdrawRequest(t.db, morgan, second.id);
    expect((await status(second.id)).status).toBe("withdrawn");
  });

  it("an item that no longer exists is reported, not applied", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "x",
      changes: [
        {
          op: "add_requirement",
          itemId: id("Terraform"),
          priority: "nice",
        },
      ],
    });
    await t.db.delete(nodes).where(eq(nodes.id, id("Terraform")));
    const err = await reject(approveRequest(t.db, taylor, r.id));
    expect(err.message).toContain("No longer applies");
    expect((await status(r.id)).status).toBe("open");
    await refresh();
  });
});

describe("proposals", () => {
  it("a new specialisation becomes a draft for the lead to complete", async () => {
    const needsInfo = (
      await t.db.select().from(changeRequests).where(eq(changeRequests.status, "needs_info"))
    )[0];
    // the seeded Kanban proposal: Riley answers, then Casey approves
    await addComment(t.db, riley, needsInfo.id, "Two teams, and they would keep sprint reviews.");
    expect((await status(needsInfo.id)).status).toBe("open"); // answering reopens it
    await approveRequest(t.db, casey, needsInfo.id, "Fine as a specialisation.");
    await refresh();
    const spec = [...graph.nodes.values()].find((n) => n.name === "Kanban")!;
    expect(spec).toMatchObject({ type: "specialization", status: "draft", parentRoleId: id("Scrum Master") });
    const rows = await t.db.select().from(auditLog).where(eq(auditLog.changeRequestId, needsInfo.id));
    expect(rows.some((x) => x.entity === "node" && x.action === "create" && x.entityId === spec.id)).toBe(
      true,
    );
  });

  it("a new role is proposed without a role and becomes a draft in the practice", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: null,
      reason: "We keep hiring for this.",
      changes: [
        { op: "propose_role", name: "Design Technologist", description: "Between design and engineering." },
      ],
    });
    await approveRequest(t.db, taylor, r.id);
    await refresh();
    expect([...graph.nodes.values()].find((n) => n.name === "Design Technologist")).toMatchObject({
      type: "role",
      status: "draft",
      practiceId: frontend,
    });
  });

  it("a new item in a request is added to the catalogue when it is approved", async () => {
    // the seeded open request: add Playwright to Frontend Developer as Important
    const open = (await t.db.select().from(changeRequests).where(eq(changeRequests.status, "open"))).find(
      (r) => r.practiceId === frontend && JSON.stringify(r.changes).includes("Playwright"),
    )!;
    await approveRequest(t.db, taylor, open.id);
    expect(await requires("Frontend Developer", "Playwright")).toBe(true);
    expect(graph.nodes.get(id("Playwright"))).toMatchObject({ type: "technical_skill", status: "published" });
  });
});

describe("the thread", () => {
  it("the reviewer asks, the author answers, the reviewer rejects with a reason", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "Please.",
      changes: [{ op: "remove_requirement", itemId: id("Figma Foundation") }],
    });
    await reject(requestInfo(t.db, taylor, r.id, "  "));
    await reject(requestInfo(t.db, morgan, r.id, "Why?"), ForbiddenError);
    await requestInfo(t.db, taylor, r.id, "Which projects don't use it?");
    expect((await status(r.id)).status).toBe("needs_info");
    await reject(addComment(t.db, alex, r.id, "hi"), ForbiddenError);
    await addComment(t.db, morgan, r.id, "Most client work.");
    expect((await status(r.id)).status).toBe("open");

    await reject(rejectRequest(t.db, taylor, r.id, " "));
    await reject(rejectRequest(t.db, morgan, r.id, "nope"), ForbiddenError);
    await rejectRequest(t.db, taylor, r.id, "Figma matters for the design handover.");
    expect(await status(r.id)).toMatchObject({
      status: "rejected",
      decidedBy: "seed-taylor",
      decisionNote: "Figma matters for the design handover.",
    });
    expect(await requires("UX Developer", "Figma Foundation")).toBe(true); // nothing applied
    const detail = (await loadRequest(t.db, morgan, r.id))!;
    expect(detail.comments.map((c) => c.authorName)).toEqual(["Taylor Brooks", "Morgan Lee"]);
  });

  it("only the author can withdraw", async () => {
    const r = await createRequest(t.db, morgan, {
      practiceId: frontend,
      roleId: id("UX Developer"),
      reason: "Maybe.",
      changes: [{ op: "update_description", description: "Something else entirely." }],
    });
    await reject(withdrawRequest(t.db, taylor, r.id), ForbiddenError);
    await reject(withdrawRequest(t.db, jordan, r.id), ForbiddenError);
    await withdrawRequest(t.db, morgan, r.id);
    expect((await status(r.id)).status).toBe("withdrawn");
    await reject(approveRequest(t.db, taylor, r.id));
    expect(await t.db.select().from(edges).where(eq(edges.kind, "next_step"))).not.toHaveLength(0);
  });
});
