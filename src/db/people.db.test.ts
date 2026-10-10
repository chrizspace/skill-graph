import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { can, type Actor } from "../domain/access";
import type { Graph } from "../domain/graph";
import { loadActor } from "./actor";
import { loadGraph } from "./graph";
import { EditError, ForbiddenError } from "./graph-write";
import {
  createRecommendation,
  directReportIds,
  loadPeople,
  memberIds,
  personRef,
  sentRecommendations,
} from "./people";
import { answerRecommendation } from "./profile-write";
import { auditLog, recommendations } from "./schema";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
const actors: Record<string, Actor> = {};
const id = (name: string) =>
  [...graph.nodes.values()].find((n) => n.name === name && n.type !== "specialization")!.id;
const spec = (role: string, name: string) =>
  [...graph.nodes.values()].find(
    (n) => n.type === "specialization" && n.name === name && n.parentRoleId === id(role),
  )!.id;
const reject = async (p: Promise<unknown>, type: typeof EditError | typeof ForbiddenError = EditError) => {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(type);
  return err as Error;
};

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
  graph = await loadGraph(t.db);
  for (const who of ["morgan", "riley", "taylor", "casey", "jordan", "alex"])
    actors[who] = (await loadActor(t.db, `seed-${who}`))!;
});
afterAll(async () => {
  await t.client.close();
});

describe("loading people", () => {
  it("loads profiles in bulk, with what they hold, sorted by name", async () => {
    const people = await loadPeople(t.db, ["seed-zoe", "seed-alex", "seed-ella"]);
    expect(people.map((p) => p.name)).toEqual(["Alex Rivera", "Ella Jensen", "Zoe Adler"]);
    const zoe = people.find((p) => p.id === "seed-zoe")!;
    expect(zoe.profile.current).toEqual({
      roleId: id("Frontend Developer"),
      specializationId: spec("Frontend Developer", "React"),
    });
    expect(zoe.profile.target).toEqual({ roleId: id("Full-stack Developer"), specializationId: null });
    expect(zoe.profile.items.length).toBeGreaterThan(8);
    expect(people.find((p) => p.id === "seed-ella")!.profile.items.some((i) => i.expiresOn)).toBe(true);
    expect(await loadPeople(t.db, [])).toEqual([]);
  });
  it("knows the reporting lines and the practices' members", async () => {
    expect((await directReportIds(t.db, "seed-morgan")).sort()).toEqual([
      "seed-alex",
      "seed-leo",
      "seed-mia",
      "seed-noah",
      "seed-zoe",
    ]);
    expect((await directReportIds(t.db, "seed-riley")).sort()).toEqual([
      "seed-ben",
      "seed-ella",
      "seed-lena",
      "seed-omar",
      "seed-sam",
    ]);
    expect(await directReportIds(t.db, "seed-alex")).toEqual([]);
    const frontend = actors.taylor.leadOf[0].id;
    expect((await memberIds(t.db, frontend)).length).toBe(7); // Taylor, Morgan and the five
  });
});

describe("who may see a named profile (Scenario 10)", () => {
  const allowed = async (who: string, personId: string) => {
    const ref = await personRef(t.db, personId);
    return Boolean(ref && can(actors[who], "profile:view", ref));
  };
  it("a manager sees their direct reports, not another manager's", async () => {
    expect(await allowed("morgan", "seed-zoe")).toBe(true);
    expect(await allowed("morgan", "seed-sam")).toBe(false);
    expect(await allowed("riley", "seed-sam")).toBe(true);
  });
  it("a Practice Lead sees their practice's members, not another practice's", async () => {
    expect(await allowed("taylor", "seed-zoe")).toBe(true);
    expect(await allowed("taylor", "seed-morgan")).toBe(true);
    expect(await allowed("taylor", "seed-sam")).toBe(false);
    expect(await allowed("casey", "seed-sam")).toBe(true);
    expect(await allowed("casey", "seed-zoe")).toBe(false);
  });
  it("the Site Lead sees no named profile, and an employee only their own", async () => {
    for (const p of ["seed-zoe", "seed-sam", "seed-alex"]) expect(await allowed("jordan", p)).toBe(false);
    expect(await allowed("alex", "seed-alex")).toBe(true);
    expect(await allowed("alex", "seed-zoe")).toBe(false);
  });
  it("a person without a profile has no reference", async () => {
    expect(await personRef(t.db, "nobody")).toBeNull();
  });
});

describe("recommending", () => {
  it("a manager recommends a target to a direct report, with a comment; it is audited", async () => {
    const rec = await createRecommendation(t.db, actors.morgan, {
      personId: "seed-leo",
      nodeId: id("Data Engineer"),
      comment: "  Leo likes data work.  ",
    });
    expect(rec).toMatchObject({
      personId: "seed-leo",
      authorId: "seed-morgan",
      nodeId: id("Data Engineer"),
      status: "open",
      comment: "Leo likes data work.",
    });
    const row = (await t.db.select().from(auditLog).where(eq(auditLog.entityId, rec.id)))[0];
    expect(row).toMatchObject({ entity: "recommendation", action: "create", actorId: "seed-morgan" });
    expect((await sentRecommendations(t.db, "seed-leo", "seed-morgan")).map((r) => r.id)).toEqual([rec.id]);
  });
  it("or a skill to work on, which the person can then accept (Scenario 6)", async () => {
    const rec = await createRecommendation(t.db, actors.morgan, {
      personId: "seed-mia",
      nodeId: id("Docker"),
      comment: "Handy for prototypes.",
    });
    expect(await answerRecommendation(t.db, "seed-mia", rec.id, "accepted", null)).toBe(true);
    expect((await sentRecommendations(t.db, "seed-mia", "seed-morgan"))[0].status).toBe("accepted");
  });
  it("only a manager of that person may: not another manager, a Practice Lead, the Site Lead, an employee", async () => {
    for (const who of ["riley", "taylor", "jordan", "alex"]) {
      await reject(
        createRecommendation(t.db, actors[who], {
          personId: "seed-noah",
          nodeId: id("Docker"),
          comment: "x",
        }),
        ForbiddenError,
      );
    }
    await reject(
      createRecommendation(t.db, actors.morgan, { personId: "seed-sam", nodeId: id("Docker"), comment: "x" }),
      ForbiddenError,
    );
    await reject(
      createRecommendation(t.db, actors.morgan, { personId: "nobody", nodeId: id("Docker"), comment: "x" }),
      ForbiddenError,
    );
  });
  it("refuses a missing comment, their own role, a skill they have, a repeat, and things that aren't skills or roles", async () => {
    const base = { personId: "seed-noah" };
    await reject(createRecommendation(t.db, actors.morgan, { ...base, nodeId: id("Docker"), comment: "  " }));
    await reject(
      createRecommendation(t.db, actors.morgan, { ...base, nodeId: id("Docker"), comment: "x".repeat(1001) }),
    );
    expect(
      (
        await reject(
          createRecommendation(t.db, actors.morgan, { ...base, nodeId: id("Angular"), comment: "x" }),
        )
      ).message,
    ).toBeTruthy(); // a skill Noah has
    expect(
      (
        await reject(
          createRecommendation(t.db, actors.morgan, {
            ...base,
            nodeId: spec("Frontend Developer", "Angular"),
            comment: "x",
          }),
        )
      ).message,
    ).toContain("already their role");
    await reject(
      createRecommendation(t.db, actors.morgan, {
        ...base,
        nodeId: "00000000-0000-4000-8000-0000000000ff",
        comment: "x",
      }),
    );
    await createRecommendation(t.db, actors.morgan, { ...base, nodeId: id("Docker"), comment: "First." });
    expect(
      (
        await reject(
          createRecommendation(t.db, actors.morgan, { ...base, nodeId: id("Docker"), comment: "Again." }),
        )
      ).message,
    ).toContain("already waiting");
    expect(
      await t.db.select().from(recommendations).where(eq(recommendations.personId, "seed-noah")),
    ).toHaveLength(1);
  });
});
