import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

const waitDrawn = async (page: Page) =>
  expect(page.locator("[data-ready=true]")).toBeVisible({ timeout: 15_000 });
const pathPanel = (page: Page) => page.getByRole("region", { name: "Path between two roles" });

test.beforeEach(async ({ page }) => signInAs(page, "Alex Rivera"));

test("path mode follows an official path and lists its steps in order", async ({ page }) => {
  await page.goto("/explore");
  await waitDrawn(page);
  await page.getByRole("button", { name: "Path mode" }).click();
  await pathPanel(page).getByLabel("From").selectOption({ label: "Data Engineer" });
  await pathPanel(page).getByLabel("To").selectOption({ label: "AI Engineer" });

  await expect(pathPanel(page)).toContainText("Official path");
  const steps = pathPanel(page).getByRole("listitem");
  await expect(steps).toHaveCount(2);
  await expect(steps.nth(0)).toContainText("1. Data Engineer");
  await expect(steps.nth(1)).toContainText("2. AI Engineer");
  await expect(page).toHaveURL(/from=data-engineer/);
  await expect(page).toHaveURL(/to=ai-engineer/);
  // the whole graph stays around it, dimmed; the route is what is named for assistive technology
  await expect(
    page.getByRole("img", { name: /route of 2 steps from Data Engineer to AI Engineer/ }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Table view" }).click();
  await expect(page.getByRole("table")).toContainText(
    "Official path from Data Engineer to AI Engineer, in order",
  );
  const names = await page.getByRole("table").locator("tbody th").allInnerTexts();
  expect(names).toEqual(["Data Engineer", "AI Engineer"]);
});

test("without an official path it falls back to the shortest route over shared skills", async ({ page }) => {
  await page.goto("/explore?from=scrum-master&to=cloud-engineer");
  await waitDrawn(page);
  await expect(pathPanel(page)).toContainText("No official path");
  const steps = pathPanel(page).getByRole("listitem");
  expect(await steps.count()).toBeGreaterThanOrEqual(3);
  await expect(steps.first()).toContainText("1. Scrum Master");
  await expect(steps.last()).toContainText("Cloud Engineer");
});

test("a path can start from a specialisation, can be swapped, and Escape leaves path mode", async ({
  page,
}) => {
  await page.goto("/explore?from=frontend-developer--react&to=full-stack-developer");
  await waitDrawn(page);
  // from the React specialisation the role's official paths apply
  await expect(pathPanel(page)).toContainText("Official path");
  await expect(pathPanel(page).getByRole("listitem").first()).toContainText("1. Frontend Developer");
  await expect(pathPanel(page).getByRole("listitem").last()).toContainText("Full-stack Developer");

  await pathPanel(page).getByRole("button", { name: "Swap" }).click();
  await expect(page).toHaveURL(/from=full-stack-developer/);

  await page.getByRole("group", { name: /^Graph:/ }).focus();
  await page.keyboard.press("Escape");
  await expect(pathPanel(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/from=/);
});

test("the performance page is not a way around the sign-in", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/explore/perf");
  await expect(page).toHaveURL(/\/sign-in/);
  await context.close();
});
