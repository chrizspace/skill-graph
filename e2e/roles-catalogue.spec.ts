import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test.beforeEach(async ({ page }) => signInAs(page, "Alex Rivera"));

// Scenario 9
test("the Scrum Master page shows its specialisations and similar roles with synergies", async ({ page }) => {
  await page.goto("/roles/scrum-master");
  await expect(page.getByText("Scrum Master: SAFe", { exact: true })).toBeVisible();
  await expect(page.getByText("Scrum Master: Facilitation / Management 3.0", { exact: true })).toBeVisible();
  await expect(page.getByText("Raises the weight of Facilitation from Important to Critical")).toBeVisible();
  const similar = page.getByRole("region", { name: "Similar roles" });
  await expect(similar.getByRole("link", { name: "Project Manager" }).first()).toBeVisible();
  await expect(similar.getByRole("link", { name: "Product Owner" }).first()).toBeVisible();
  await expect(similar.locator("p", { hasText: "Shared:" }).first()).toContainText("Stakeholder Management");
});

test("role search and the practice filter", async ({ page }) => {
  await page.goto("/roles");
  await page.getByRole("searchbox", { name: "Search roles" }).fill("scrum");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText("1 role matching")).toBeVisible();
  await page.goto("/roles?practice=data-ai");
  await expect(page.getByText("5 roles in Data & AI")).toBeVisible();
});

test("catalogue filters and an item's page", async ({ page }) => {
  await page.goto("/catalogue?type=certification");
  await expect(page.getByText("17 items")).toBeVisible();
  await page.goto("/catalogue/databricks");
  await expect(page.getByRole("heading", { name: "Databricks" })).toBeVisible();
  await expect(page.getByText("Builds on (learn these first)")).toBeVisible();
});
