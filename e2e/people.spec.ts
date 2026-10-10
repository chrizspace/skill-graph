import { expect, test, type Page } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

// M11: what managers and Practice Leads see of people, and the privacy rules around it (docs/PLAN.md Scenarios 3, 6, 10).
// This file is named to run BEFORE the specs that change profiles (scenario-1 sets Alex's target, scenario-7 renews Ella's
// certification): it reads the seeded people as they are.

const section = (page: Page, name: string | RegExp) => page.getByRole("region", { name });
const main = (page: Page) => page.locator("main");

async function as(browser: import("@playwright/test").Browser, who: string, path: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAs(page, who);
  await page.goto(path);
  return { page, close: () => context.close() };
}

test("Scenario 3: a manager sees their team, then a report's profile: fit, paths and roles they could reach", async ({
  page,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/team");
  await expect(page.getByRole("heading", { level: 1, name: "My team" })).toBeVisible();
  const people = section(page, "People");
  for (const name of ["Alex Rivera", "Noah Fischer", "Mia Kowalski", "Leo Martins", "Zoe Adler"]) {
    await expect(people.getByRole("link", { name })).toBeVisible();
  }
  await expect(people.getByRole("link", { name: "Sam Patel" })).toHaveCount(0); // Riley's report

  // gaps shared across the team: "2 of 5 people lack ..."
  const gaps = section(page, "Gaps across the team");
  await expect(gaps).toContainText("Testing");
  await expect(gaps).toContainText("Noah Fischer");
  await expect(gaps).toContainText("Accessibility");
  await expect(gaps).toContainText("Zoe Adler");
  await expect(gaps).toContainText("of 5 people");

  // Zoe: Frontend Developer: React without Accessibility, target Full-stack Developer
  await people.getByRole("link", { name: "Zoe Adler" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Zoe Adler" })).toBeVisible();
  await expect(main(page)).toContainText("Frontend Developer: React");
  await expect(section(page, /^How Zoe meets their role/)).toContainText("Accessibility");
  await expect(
    section(page, /^How Zoe meets their role/).getByRole("region", { name: /^Still to learn/ }),
  ).toContainText("Accessibility");
  await expect(section(page, "Target and plan")).toContainText("Towards Full-stack Developer");
  await expect(section(page, "Possible paths")).toContainText("Full-stack Developer");
  await expect(section(page, "Possible paths")).toContainText("Official paths");
  await expect(section(page, /^Roles Zoe could take on now/)).toBeVisible();

  // Alex can already take on Full-stack Developer
  await page.goto("/team");
  await page.getByRole("link", { name: "Alex Rivera" }).click();
  await expect(section(page, /^Roles Alex could take on now/)).toContainText("Full-stack Developer");
});

test("certifications to watch: an expired one is still held, an expiring one is flagged", async ({
  page,
}) => {
  await signInAs(page, "Riley Nowak");
  await page.goto("/team");
  await page.getByRole("link", { name: "Ella Jensen" }).click();
  const certs = section(page, "Certifications to watch");
  await expect(certs.locator('[data-status="expired"]')).toContainText("Power BI Data Analyst (PL-300)");
  await expect(certs.locator('[data-status="expired"]')).toContainText("expired on");
  await expect(certs).toContainText("still counts as held");
  await page.goto("/team");
  await page.getByRole("link", { name: "Omar Haddad" }).click();
  await expect(section(page, "Certifications to watch").locator('[data-status="expiring"]')).toContainText(
    "SAFe Scrum Master",
  );
});

test("Scenario 6: a manager recommends a target, the report accepts it, and it becomes their target and plan", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/team");
  await page.getByRole("link", { name: "Leo Martins" }).click();
  await expect(section(page, "Target and plan")).toContainText("hasn't picked a target");

  const recs = section(page, "Recommendations");
  await recs
    .getByLabel("A role to aim for, or something to work on")
    .selectOption({ label: "Data Engineer" });
  await recs.getByLabel(/^Why/).fill("Leo keeps picking up the data tasks in our projects.");
  await recs.getByRole("button", { name: "Recommend to Leo" }).click();
  await expect(recs.getByRole("status")).toContainText("Recommended");
  await page.reload();
  await expect(recs).toContainText("Data Engineer");
  await expect(recs).toContainText("Waiting for an answer");

  // Leo sees it on his home and in his plan, and accepts it
  const leo = await as(browser, "Leo Martins", "/");
  await expect(leo.page.getByRole("link", { name: /1 new recommendation from your manager/ })).toBeVisible();
  await leo.page.goto("/me/plan");
  await expect(leo.page.getByText("Morgan Lee suggests a target")).toBeVisible();
  await leo.page.getByRole("button", { name: "Accept as my target" }).click();
  await expect(leo.page.getByRole("heading", { name: "Towards Data Engineer" })).toBeVisible();
  await leo.close();

  // and the manager sees the answer and the new plan
  await page.reload();
  await expect(recs).toContainText("Accepted");
  await expect(section(page, "Target and plan")).toContainText("Towards Data Engineer");
});

test("a manager can also recommend a skill to work on; the report can decline it", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/team");
  await page.getByRole("link", { name: "Mia Kowalski" }).click();
  const recs = section(page, "Recommendations");
  await recs.getByLabel("A role to aim for, or something to work on").selectOption({ label: "Kubernetes" });
  await recs.getByLabel(/^Why/).fill("Our prototypes now run on the cluster.");
  await recs.getByRole("button", { name: "Recommend to Mia" }).click();
  await expect(recs.getByRole("status")).toContainText("Recommended");
  // a second one for the same thing is refused while the first waits
  await recs.getByLabel("A role to aim for, or something to work on").selectOption({ label: "Kubernetes" });
  await recs.getByLabel(/^Why/).fill("Again.");
  await recs.getByRole("button", { name: "Recommend to Mia" }).click();
  await expect(recs.getByRole("alert")).toContainText("already waiting");

  const mia = await as(browser, "Mia Kowalski", "/me/plan");
  await expect(mia.page.getByText("Morgan Lee suggests working on")).toBeVisible();
  await mia.page.getByRole("button", { name: "Decline" }).click();
  await expect(mia.page.getByText("Morgan Lee suggests working on")).toHaveCount(0);
  await mia.close();
  await page.reload();
  await expect(recs).toContainText("Declined");
});

test("Scenario 10: named profiles are for the person, their manager and their practice's leads only", async ({
  browser,
}) => {
  // an employee: nobody else's profile, and no team pages
  const alex = await as(browser, "Alex Rivera", "/team/seed-zoe");
  await expect(notFound(alex.page)).toBeVisible();
  await alex.page.goto("/practices/frontend/people/seed-zoe");
  await expect(notFound(alex.page)).toBeVisible();
  await alex.close();

  // a manager: their own reports, not another manager's
  const morgan = await as(browser, "Morgan Lee", "/team/seed-zoe");
  await expect(morgan.page.getByRole("heading", { level: 1, name: "Zoe Adler" })).toBeVisible();
  await morgan.page.goto("/team/seed-sam");
  await expect(notFound(morgan.page)).toBeVisible();
  await morgan.page.goto("/team");
  await expect(main(morgan.page)).not.toContainText("Sam Patel");
  await morgan.close();

  // a Practice Lead: the members of their practice (including the manager), not another practice's
  const taylor = await as(browser, "Taylor Brooks", "/practices/frontend/people/seed-zoe");
  await expect(taylor.page.getByRole("heading", { level: 1, name: "Zoe Adler" })).toBeVisible();
  await expect(taylor.page.getByRole("button", { name: /^Recommend to/ })).toHaveCount(0); // only a manager recommends
  await taylor.page.goto("/practices/frontend/people/seed-morgan");
  await expect(taylor.page.getByRole("heading", { level: 1, name: "Morgan Lee" })).toBeVisible();
  for (const path of [
    "/practices/frontend/people/seed-sam",
    "/practices/delivery/people/seed-sam",
    "/team/seed-sam",
    "/practices/delivery",
  ]) {
    await taylor.page.goto(path);
    await expect(notFound(taylor.page), path).toBeVisible();
  }
  await taylor.close();

  // the Site Lead sees no named profile at all, in any route
  const jordan = await as(browser, "Jordan Kim", "/team/seed-zoe");
  await expect(notFound(jordan.page)).toBeVisible();
  for (const path of [
    "/practices/frontend/people/seed-zoe",
    "/practices/delivery/people/seed-sam",
    "/practices/frontend/succession",
  ]) {
    await jordan.page.goto(path);
    await expect(notFound(jordan.page), path).toBeVisible();
  }
  await jordan.page.goto("/practices/frontend");
  await expect(jordan.page.getByRole("heading", { level: 1, name: "Frontend Practice" })).toBeVisible();
  await expect(jordan.page.getByRole("note")).toContainText("aggregates only");
  await expect(jordan.page.getByText("Zoe Adler")).toHaveCount(0);
  await expect(jordan.page.getByRole("link", { name: /Zoe|Alex|Noah|Mia|Leo/ })).toHaveCount(0);
  await jordan.close();
});

test("a Practice Lead's practice page: its people, the gaps they share and how they meet their roles", async ({
  page,
}) => {
  await signInAs(page, "Casey Lin");
  await page.goto("/practices/delivery");
  const people = section(page, /^People/);
  for (const name of ["Sam Patel", "Ella Jensen", "Omar Haddad", "Lena Hoffmann", "Ben Carter"]) {
    await expect(people.getByRole("link", { name })).toBeVisible();
  }
  await expect(people.getByRole("link", { name: "Zoe Adler" })).toHaveCount(0);
  await expect(section(page, "Gaps across the practice")).toBeVisible();
  const perRole = section(page, "How people meet their roles");
  await expect(perRole).toContainText("Scrum Master");
  await expect(perRole).toContainText("Meet it on average");
  await people.getByRole("link", { name: "Ella Jensen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ella Jensen" })).toBeVisible();
});

test("succession: who is closest to a role, for a manager and for a Practice Lead", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/team/succession");
  await expect(page.getByText("Choose a role to see who is closest")).toBeVisible();
  await page.goto("/team/succession?role=full-stack-developer");
  const ranking = section(page, /^Closest to Full-stack Developer/);
  const first = ranking.getByRole("listitem").first();
  await expect(first).toContainText("Leo Martins"); // he is one
  await expect(ranking.getByRole("listitem")).toHaveCount(5);

  const lead = await as(browser, "Taylor Brooks", "/practices/frontend/succession?role=full-stack-developer");
  // all members of the practice: the manager and the lead included
  await expect(section(lead.page, /^Closest to Full-stack Developer/).getByRole("listitem")).toHaveCount(7);
  await lead.close();
});
