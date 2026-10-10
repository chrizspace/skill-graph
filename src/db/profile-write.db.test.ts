import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { roles, type Graph } from "../domain/graph";
import { loadGraph, loadMyProfile, loadRecommendations } from "./graph";
import {
  addSkills,
  answerRecommendation,
  removeItem,
  saveCertification,
  setCurrentRole,
  setSkills,
  setTarget,
} from "./profile-write";
import { recommendations, user } from "./schema";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
let graph: Graph;
const id = (name: string) => [...graph.nodes.values()].find((n) => n.name === name)!.id;
const held = async (userId: string) =>
  (await loadMyProfile(t.db, userId))!.profile.items.map((i) => graph.nodes.get(i.nodeId)!.name).sort();

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
  graph = await loadGraph(t.db);
  // a new person, e.g. just signed in with Microsoft: a user, no profile
  await t.db.insert(user).values({ id: "new", name: "New Person", email: "new@example.com" });
});
afterAll(async () => {
  await t.client.close();
});

describe("a new person's profile", () => {
  it("has none until they pick a role", async () => {
    expect(await loadMyProfile(t.db, "new")).toBeNull();
  });
  it("is created with the current role and practice, then updated", async () => {
    const practice = roles(graph).find((r) => r.name === "Data Engineer")!.practiceId;
    await setCurrentRole(t.db, "new", { practiceId: practice, role: { roleId: id("Data Engineer") } });
    let mine = (await loadMyProfile(t.db, "new"))!;
    expect(mine.practiceId).toBe(practice);
    expect(mine.profile.current).toEqual({ roleId: id("Data Engineer"), specializationId: null });
    await setCurrentRole(t.db, "new", {
      practiceId: practice,
      role: { roleId: id("Scrum Master"), specializationId: id("SAFe") },
    });
    mine = (await loadMyProfile(t.db, "new"))!;
    expect(mine.profile.current).toEqual({ roleId: id("Scrum Master"), specializationId: id("SAFe") });
  });
});

describe("skills", () => {
  it("adds, then sets exactly, leaving certifications alone", async () => {
    await addSkills(t.db, "new", [id("SQL"), id("Python")]);
    await addSkills(t.db, "new", [id("SQL")]); // already held: no error, no duplicate
    expect(await held("new")).toEqual(["Python", "SQL"]);
    await saveCertification(t.db, "new", {
      nodeId: id("Azure Fundamentals (AZ-900)"),
      obtainedOn: "2025-01-01",
      expiresOn: null,
    });
    await setSkills(t.db, "new", [id("Python"), id("Spark")]);
    expect(await held("new")).toEqual(["Azure Fundamentals (AZ-900)", "Python", "Spark"]);
  });
});

describe("certifications", () => {
  it("are added with dates, updated, and removed", async () => {
    const cert = id("Professional Scrum Master I (PSM I)");
    await saveCertification(t.db, "new", { nodeId: cert, obtainedOn: "2024-01-01", expiresOn: "2026-01-01" });
    const dates = async () =>
      (await loadMyProfile(t.db, "new"))!.profile.items.find((i) => i.nodeId === cert);
    expect(await dates()).toMatchObject({ obtainedOn: "2024-01-01", expiresOn: "2026-01-01" });
    await saveCertification(t.db, "new", { nodeId: cert, obtainedOn: "2024-01-01", expiresOn: null });
    expect((await dates())!.expiresOn).toBeNull();
    await removeItem(t.db, "new", cert);
    expect(await dates()).toBeUndefined();
  });
});

describe("target", () => {
  it("is set and cleared, and needs a profile", async () => {
    expect(await setTarget(t.db, "nobody", { roleId: id("Data Engineer") })).toBe(false);
    expect(await setTarget(t.db, "new", { roleId: id("Data Engineer") })).toBe(true);
    expect((await loadMyProfile(t.db, "new"))!.profile.target).toEqual({
      roleId: id("Data Engineer"),
      specializationId: null,
    });
    await setTarget(t.db, "new", null);
    expect((await loadMyProfile(t.db, "new"))!.profile.target).toBeNull();
  });
});

describe("recommendations", () => {
  it("lists a person's recommendations with the author", async () => {
    const alex = await loadRecommendations(t.db, "seed-alex");
    expect(alex).toHaveLength(1);
    expect(alex[0]).toMatchObject({ status: "open", author: "Morgan Lee" });
    expect(graph.nodes.get(alex[0].nodeId)!.name).toBe("Full-stack Developer");
  });
  it("accepting a recommended target makes it the target; it can't be answered twice", async () => {
    const [rec] = await loadRecommendations(t.db, "seed-alex");
    expect(await answerRecommendation(t.db, "seed-alex", rec.id, "accepted", { roleId: rec.nodeId })).toBe(
      true,
    );
    expect((await loadMyProfile(t.db, "seed-alex"))!.profile.target).toEqual({
      roleId: rec.nodeId,
      specializationId: null,
    });
    expect(await answerRecommendation(t.db, "seed-alex", rec.id, "declined", null)).toBe(false);
    const [row] = await t.db.select().from(recommendations).where(eq(recommendations.id, rec.id));
    expect(row.status).toBe("accepted");
    expect(row.answeredAt).not.toBeNull();
  });
  it("can't be answered by anyone but the person it is for", async () => {
    const [sam] = await loadRecommendations(t.db, "seed-sam");
    expect(await answerRecommendation(t.db, "seed-alex", sam.id, "accepted", null)).toBe(false);
    expect((await loadRecommendations(t.db, "seed-sam"))[0].status).toBe("open");
  });
  it("declining changes nothing else", async () => {
    const [sam] = await loadRecommendations(t.db, "seed-sam");
    const before = await held("seed-sam");
    expect(await answerRecommendation(t.db, "seed-sam", sam.id, "declined", null)).toBe(true);
    expect(await held("seed-sam")).toEqual(before);
    expect((await loadRecommendations(t.db, "seed-sam"))[0].status).toBe("declined");
  });
});
