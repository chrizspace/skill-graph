import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

// M13: every page, for the people who can see it, scanned with axe against WCAG 2.2 AA (docs/PLAN.md §6, §8). This spec is
// read-only and named to run first. A page that only opens after some interaction (a dialog, a menu, search results,
// the table view) is scanned in that state too.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SEEDED_REQUEST = "00000000-0000-4000-8000-000000000201";

/** Fails with the rules broken and where, instead of axe's long report. */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = results.violations.map(
    (v) =>
      `${v.impact}: ${v.id} (${v.help}) ×${v.nodes.length} at ${v.nodes
        .slice(0, 2)
        .map((n) => n.target.join(" "))
        .join(" | ")}`,
  );
  expect(found, `${label}\n`).toEqual([]);
}

async function visit(page: Page, path: string, theme?: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  // the pages stream in: wait for the network to settle so a late part isn't missed
  await page.waitForLoadState("networkidle");
  await scan(page, `${path}${theme ? ` (${theme})` : ""}`);
}

async function session(browser: Browser, who: string, options: { theme?: string; mobile?: boolean } = {}) {
  const context = await browser.newContext(options.mobile ? { viewport: { width: 375, height: 812 } } : {});
  if (options.theme)
    await context.addInitScript((t) => localStorage.setItem("skill-graph-theme", t), options.theme);
  const page = await context.newPage();
  await signInAs(page, who);
  return { page, close: () => context.close() };
}

test("the sign-in page", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await scan(page, "/sign-in");
});

test("everyone: home, roles, catalogue, graph, compare, profile, plan, onboarding", async ({ browser }) => {
  const { page, close } = await session(browser, "Alex Rivera");
  for (const path of [
    "/",
    "/roles",
    "/roles?q=scrum&practice=delivery",
    "/roles/scrum-master",
    "/roles/frontend-developer",
    "/catalogue",
    "/catalogue?type=certification",
    "/catalogue/sql",
    "/catalogue/psm-i",
    "/compare?a=frontend-developer--react&b=data-engineer",
    "/me",
    "/me/plan",
    "/onboarding",
    "/onboarding?practice=delivery&role=scrum-master&spec=scrum-master--safe",
  ]) {
    await visit(page, path);
  }
  await close();
});

test("the graph explorer: overview, a role, a skill, path mode, the table view, search results", async ({
  browser,
}) => {
  const { page, close } = await session(browser, "Alex Rivera");
  await visit(page, "/explore");
  await page.getByLabel(/^Search/).fill("spark");
  await expect(page.getByRole("list", { name: "Search results" })).toBeVisible();
  await scan(page, "/explore with search results");
  for (const path of [
    "/explore?focus=data-engineer",
    "/explore?focus=scrum-master",
    "/explore?focus=python&hops=2",
    "/explore?from=scrum-master&to=cloud-engineer",
  ]) {
    await visit(page, path);
  }
  await page.getByRole("tab", { name: "Table view" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await scan(page, "/explore table view");
  await close();
});

test("a manager: team, a report's profile, succession, requests", async ({ browser }) => {
  const { page, close } = await session(browser, "Morgan Lee");
  for (const path of [
    "/team",
    "/team/seed-zoe",
    "/team/seed-alex",
    "/team/succession?role=full-stack-developer",
    "/requests",
    `/requests/${SEEDED_REQUEST}`,
    "/requests/new",
    "/requests/new?practice=frontend",
    "/requests/new?practice=frontend&role=ux-developer",
    "/requests/new?practice=frontend&role=new",
  ]) {
    await visit(page, path);
  }
  await close();
});

test("a Practice Lead: the practice, the role editor, a member, succession", async ({ browser }) => {
  const { page, close } = await session(browser, "Taylor Brooks");
  for (const path of [
    "/practices/frontend",
    "/practices/frontend/roles/frontend-developer/edit",
    "/practices/frontend/roles/ux-developer/edit",
    "/practices/frontend/people/seed-zoe",
    "/practices/frontend/succession?role=full-stack-developer",
    "/requests",
    `/requests/${SEEDED_REQUEST}`,
    "/catalogue",
  ]) {
    await visit(page, path);
  }
  await close();
});

test("the Site Lead: overview, practices, people, catalogue maintenance with a merge preview, audit log", async ({
  browser,
}) => {
  const { page, close } = await session(browser, "Jordan Kim");
  await visit(page, "/site");
  await visit(page, "/site/practices");
  await visit(page, "/site/people");
  await visit(page, "/site/people?show=no-manager");
  await visit(page, "/site/catalogue");
  await visit(page, "/site/audit");
  await visit(page, "/site/audit?kind=edge");
  await visit(page, "/practices/frontend");
  await close();
});

test("dialogs and menus when open: the account menu, the mobile menu, a confirmation window", async ({
  browser,
}) => {
  const { page, close } = await session(browser, "Taylor Brooks");
  await visit(page, "/practices/frontend/roles/ux-developer/edit");
  await expect(async () => {
    await page.getByRole("button", { name: "Delete role" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();
  // scanned once it has finished fading in: halfway through, its colours are blended with the page behind
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await page.waitForTimeout(300);
  await scan(page, "a confirmation window");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /Account menu/ }).click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.waitForTimeout(300);
  await scan(page, "the account menu");
  await close();

  const phone = await session(browser, "Taylor Brooks", { mobile: true });
  await phone.page.goto("/");
  await expect(phone.page.getByRole("heading", { level: 1 })).toBeVisible();
  await phone.page.getByRole("button", { name: "Open menu" }).click();
  await expect(phone.page.locator("#mobile-nav")).toBeVisible();
  await scan(phone.page, "the mobile menu");
  await phone.close();
});

test("the Violet theme and a phone: the same pages hold", async ({ browser }) => {
  const violet = await session(browser, "Morgan Lee", { theme: "violet" });
  for (const path of [
    "/",
    "/roles/scrum-master",
    "/team",
    "/team/seed-zoe",
    "/explore?focus=data-engineer",
    "/me",
  ]) {
    await visit(violet.page, path, "violet");
  }
  await violet.close();
  const phone = await session(browser, "Morgan Lee", { mobile: true });
  for (const path of [
    "/",
    "/roles",
    "/roles/scrum-master",
    "/catalogue",
    "/compare?a=scrum-master&b=project-manager",
    "/me/plan",
    "/team",
    "/team/seed-zoe",
    "/requests",
    "/explore?focus=data-engineer",
  ]) {
    await visit(phone.page, path, "375px");
  }
  await phone.close();
});
