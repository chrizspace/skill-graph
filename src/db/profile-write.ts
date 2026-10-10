import { and, eq, inArray } from "drizzle-orm";
import type { Target } from "../domain/graph";
import type { CertificationInput } from "../domain/profile-input";
import type { Database } from "./database";
import { nodes, profileItems, profiles, recommendations } from "./schema";

/** Writes to a person's own profile. Callers check `can()` and validate the input (src/domain/profile-input.ts). */

/** Sets the home practice and current role (and specialisation), creating the profile if there is none. */
export async function setCurrentRole(
  db: Database,
  userId: string,
  { practiceId, role }: { practiceId: string | null; role: Target },
) {
  const values = {
    practiceId,
    currentRoleId: role.roleId,
    currentSpecializationId: role.specializationId ?? null,
  };
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}

/** Adds skills to the profile; those already held keep their row. */
export async function addSkills(db: Database, userId: string, skillIds: readonly string[]) {
  if (skillIds.length === 0) return;
  await db
    .insert(profileItems)
    .values(skillIds.map((nodeId) => ({ userId, nodeId })))
    .onConflictDoNothing();
}

/** Makes the technical and soft skills held exactly `skillIds`; certifications are left alone. */
export async function setSkills(db: Database, userId: string, skillIds: readonly string[]) {
  await db.transaction(async (tx) => {
    const held = await tx
      .select({ id: profileItems.nodeId, type: nodes.type })
      .from(profileItems)
      .innerJoin(nodes, eq(nodes.id, profileItems.nodeId))
      .where(eq(profileItems.userId, userId));
    const wanted = new Set(skillIds);
    const skills = held.filter((h) => h.type !== "certification");
    const drop = skills.filter((h) => !wanted.has(h.id)).map((h) => h.id);
    if (drop.length) {
      await tx
        .delete(profileItems)
        .where(and(eq(profileItems.userId, userId), inArray(profileItems.nodeId, drop)));
    }
    const have = new Set(skills.map((h) => h.id));
    await addSkills(
      tx,
      userId,
      skillIds.filter((id) => !have.has(id)),
    );
  });
}

/** Adds a certification or updates its dates. */
export async function saveCertification(db: Database, userId: string, cert: CertificationInput) {
  const dates = { obtainedOn: cert.obtainedOn, expiresOn: cert.expiresOn };
  await db
    .insert(profileItems)
    .values({ userId, nodeId: cert.nodeId, ...dates })
    .onConflictDoUpdate({ target: [profileItems.userId, profileItems.nodeId], set: dates });
}

/** Saves the colour theme on the profile. Returns false when the person has no profile yet. */
export async function setTheme(db: Database, userId: string, theme: string) {
  const updated = await db
    .update(profiles)
    .set({ theme })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return updated.length > 0;
}

export async function removeItem(db: Database, userId: string, nodeId: string) {
  await db.delete(profileItems).where(and(eq(profileItems.userId, userId), eq(profileItems.nodeId, nodeId)));
}

/** Sets or clears the target. Needs a profile; returns false if there is none. */
export async function setTarget(db: Database, userId: string, target: Target | null) {
  const updated = await db
    .update(profiles)
    .set({ targetRoleId: target?.roleId ?? null, targetSpecializationId: target?.specializationId ?? null })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return updated.length > 0;
}

/**
 * Answers an open recommendation addressed to this person. Accepting a recommended target makes it their target
 * (`target` is the recommended node as a Target); accepting an item keeps it for the plan. Returns false if there is
 * no such open recommendation for them.
 */
export async function answerRecommendation(
  db: Database,
  userId: string,
  recommendationId: string,
  answer: "accepted" | "declined",
  target: Target | null,
) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(recommendations)
      .set({ status: answer, answeredAt: new Date() })
      .where(
        and(
          eq(recommendations.id, recommendationId),
          eq(recommendations.personId, userId),
          eq(recommendations.status, "open"),
        ),
      )
      .returning({ id: recommendations.id });
    if (!updated) return false;
    if (answer === "accepted" && target) await setTarget(tx, userId, target);
    return true;
  });
}
