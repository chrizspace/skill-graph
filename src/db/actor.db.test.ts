import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { can } from "../domain/access";
import { navigationFor } from "../domain/navigation";
import { DEMO_ACCOUNTS, listDemoAccounts, listDemoPeople, loadActor } from "./actor";
import { seed } from "./seed/seed";
import { createTestDb } from "./testing";

let t: Awaited<ReturnType<typeof createTestDb>>;
const actor = async (id: string) => (await loadActor(t.db, id))!;
const groups = async (id: string) => navigationFor(await actor(id)).map((g) => g.label);

beforeAll(async () => {
  t = await createTestDb();
  await seed(t.db, { today: new Date("2026-10-10T12:00:00Z") });
});
afterAll(async () => {
  await t.client.close();
});

describe("user types come from the seed data", () => {
  it("lists the 18 demo people, all on example.com", async () => {
    expect(await listDemoPeople(t.db)).toHaveLength(18);
  });
  it("Jordan is the Site Lead", async () => {
    const jordan = await actor("seed-jordan");
    expect(jordan.siteLead).toBe(true);
    expect(await groups("seed-jordan")).toEqual(["My Skills", "Explore Skills", "Organize Site"]);
  });
  it("Taylor leads the Frontend Practice", async () => {
    const taylor = await actor("seed-taylor");
    expect(taylor.leadOf.map((p) => p.slug)).toEqual(["frontend"]);
    expect(await groups("seed-taylor")).toEqual(["My Skills", "Explore Skills", "Lead Practice"]);
  });
  it("offers six demo accounts, one for each way of using the app", async () => {
    const accounts = await listDemoAccounts(t.db);
    expect(accounts.map((a) => a.email)).toEqual([...DEMO_ACCOUNTS]);
    const [alex, riley, taylor, casey, jordan, robin] = await Promise.all(accounts.map((a) => actor(a.id)));
    expect([alex.reportCount, alex.leadOf.length, alex.siteLead]).toEqual([0, 0, false]);
    expect([riley.reportCount, riley.leadOf.length, riley.siteLead]).toEqual([2, 0, false]);
    expect([taylor.reportCount, taylor.leadOf.length, taylor.siteLead]).toEqual([0, 1, false]);
    expect([casey.reportCount, casey.leadOf.length, casey.siteLead]).toEqual([1, 1, false]);
    expect([jordan.reportCount, jordan.leadOf.length, jordan.siteLead]).toEqual([0, 0, true]);
    expect([robin.reportCount, robin.leadOf.length, robin.siteLead]).toEqual([2, 1, true]);
  });
  it("Morgan manages five people", async () => {
    expect((await actor("seed-morgan")).reportCount).toBe(5);
    expect(await groups("seed-morgan")).toEqual(["My Skills", "Explore Skills", "Manage Team"]);
  });
  it("Alex is an employee only", async () => {
    expect(await groups("seed-alex")).toEqual(["My Skills", "Explore Skills"]);
  });
  it("returns null for someone unknown", async () => {
    expect(await loadActor(t.db, "nobody")).toBeNull();
  });
});

describe("privacy on the seed (Scenario 10)", () => {
  const person = (id: string, managerId: string | null, practiceId: string | null) => ({
    id,
    managerId,
    practiceId,
  });
  it("an employee can't open another person's profile", async () => {
    const alex = await actor("seed-alex");
    expect(can(alex, "profile:view", person("seed-zoe", "seed-morgan", alex.practiceId))).toBe(false);
  });
  it("a Practice Lead sees only their practice's members", async () => {
    const taylor = await actor("seed-taylor");
    const alex = await actor("seed-alex");
    const sam = await actor("seed-sam");
    expect(can(taylor, "profile:view", person(alex.userId, "seed-morgan", alex.practiceId))).toBe(true);
    expect(can(taylor, "profile:view", person(sam.userId, "seed-riley", sam.practiceId))).toBe(false);
  });
  it("the Site Lead sees no named profile", async () => {
    const jordan = await actor("seed-jordan");
    const alex = await actor("seed-alex");
    expect(can(jordan, "profile:view", person(alex.userId, "seed-morgan", alex.practiceId))).toBe(false);
  });
  it("Morgan opens a report, not Riley's report", async () => {
    const morgan = await actor("seed-morgan");
    expect(can(morgan, "profile:view", person("seed-alex", "seed-morgan", morgan.practiceId))).toBe(true);
    expect(can(morgan, "profile:view", person("seed-sam", "seed-riley", null))).toBe(false);
  });
});
