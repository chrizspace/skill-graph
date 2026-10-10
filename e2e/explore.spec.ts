import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

// the graph explorer (docs/PLAN.md §6). The drawing is a canvas, so these tests read the table view, the details panel
// and the live region, which carry the same content.
const canvas = (page: Page) => page.locator("[data-ready=true]");
const panel = (page: Page) => page.getByRole("complementary", { name: "Details" });
const waitDrawn = async (page: Page) => expect(canvas(page)).toBeVisible({ timeout: 15_000 });

test.beforeEach(async ({ page }) => signInAs(page, "Alex Rivera"));

test("opens on the overview, not on a hairball of labels, with a search box and a role picker", async ({
  page,
}) => {
  await page.goto("/explore");
  await waitDrawn(page);
  await expect(page.getByLabel(/^Search/)).toBeVisible();
  await expect(page.getByLabel("Pick a role")).toHaveValue("");
  await expect(canvas(page)).toHaveAttribute("data-nodes", "157");
  await expect(page.getByRole("region", { name: "Legend" })).toContainText("Critical (solid)");
  await expect(page.getByRole("region", { name: "Legend" })).toContainText("Important (dashed)");
  await expect(page.getByRole("region", { name: "Legend" })).toContainText("Nice to have (dotted)");
});

test("a role opens with its requirements by weight and its specialisations", async ({ page }) => {
  await page.goto("/explore");
  await waitDrawn(page);
  await page.getByLabel("Pick a role").selectOption({ label: "Scrum Master" });
  await expect(page).toHaveURL(/focus=scrum-master/);
  await expect(panel(page).getByRole("heading", { name: "Scrum Master" })).toBeVisible();
  await expect(canvas(page)).toHaveAttribute("data-nodes", "14"); // the role, 2 specialisations, 11 requirements

  await page.getByRole("tab", { name: "Table view" }).click();
  const table = page.getByRole("table");
  await expect(table.getByRole("row", { name: /^Scrum Technical skill Critical/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^Facilitation Soft skill Important/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /Scrum Master: SAFe Specialisation/ })).toBeVisible();

  await page.getByRole("tab", { name: "Graph" }).click();
  await page.getByRole("button", { name: "Show requirements" }).first().click();
  await expect(canvas(page)).toHaveAttribute("data-nodes", /^(1[5-9]|2\d)$/);
});

test("search finds a skill; its panel shows its weight for the role in focus and the roles that need it", async ({
  page,
}) => {
  await page.goto("/explore?focus=data-engineer");
  await waitDrawn(page);
  await page.getByLabel(/^Search/).fill("spark");
  await page
    .getByRole("list", { name: "Search results" })
    .getByRole("button", { name: /^Spark/ })
    .first()
    .click();
  await expect(panel(page).getByRole("heading", { name: "Spark" })).toBeVisible();
  await expect(panel(page)).toContainText("Roles that need this");
  await expect(panel(page)).toContainText("Builds on (learn first)");
  await expect(panel(page).getByRole("button", { name: "Python" })).toBeVisible();
});

test("a connection in the panel moves the focus", async ({ page }) => {
  await page.goto("/explore?focus=spark");
  await waitDrawn(page);
  await panel(page).getByRole("button", { name: "Python" }).first().click();
  await expect(page).toHaveURL(/focus=python/);
  await expect(panel(page).getByRole("heading", { name: "Python" })).toBeVisible();
});

test("my view marks what I have and what I still need, in words as well as colour", async ({ page }) => {
  await page.goto("/explore?focus=data-engineer");
  await waitDrawn(page);
  await page.getByRole("tab", { name: "Table view" }).click();
  const table = page.getByRole("table");
  await expect(
    table.getByRole("row", { name: /^SQL Technical skill Critical Still to learn/ }),
  ).toBeVisible();
  await expect(table.getByRole("row", { name: /^Git Technical skill Important I have it/ })).toBeVisible();
  // retried: a click before the page is interactive does nothing
  await expect(async () => {
    await page.getByLabel(/^My view/).uncheck();
    await expect(table.getByRole("columnheader", { name: "Me", exact: true })).toHaveCount(0, {
      timeout: 1000,
    });
  }).toPass();
});

test("filters narrow the overview: a practice, a weight", async ({ page }) => {
  await page.goto("/explore?practice=data-ai");
  await waitDrawn(page);
  await page.getByRole("tab", { name: "Table view" }).click();
  const rows = page.getByRole("table").getByRole("row");
  await expect(page.getByRole("table").getByRole("row", { name: /^Data Engineer Role/ })).toBeVisible();
  await expect(page.getByRole("table").getByRole("row", { name: /^Scrum Master Role/ })).toHaveCount(0);
  expect(await rows.count()).toBeLessThan(80);
});

test("keyboard: / searches, arrows walk the neighbours, Escape clears", async ({ page }) => {
  await page.goto("/explore?focus=data-engineer");
  await waitDrawn(page);
  await page.keyboard.press("/");
  await expect(page.getByLabel(/^Search/)).toBeFocused();

  await page.getByRole("group", { name: /^Graph:/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("status")).toContainText("Next neighbour");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Selected");
  await page.keyboard.press("ArrowLeft"); // back to where it was
  await expect(page.getByRole("status")).toContainText("Selected Data Engineer");

  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/focus=/);
  await expect(page.getByLabel("Pick a role")).toHaveValue("");
});

test("on a phone the table opens first and the graph is opt-in", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await signInAs(page, "Alex Rivera");
  await page.goto("/explore?focus=data-engineer");
  await expect(page.getByRole("tab", { name: "Table view" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("tab", { name: "Graph" }).click();
  await waitDrawn(page);
  await context.close();
});

test("the drawing has an accessible name and a keyboard hint", async ({ page }) => {
  await page.goto("/explore?focus=python");
  await waitDrawn(page);
  await expect(page.getByRole("img", { name: /^Skill graph:/ })).toBeVisible();
  await expect(page.getByRole("group", { name: /Escape clears/ })).toBeVisible();
});
