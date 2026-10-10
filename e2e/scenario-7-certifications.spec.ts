import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// Scenario 7: certification states
test("an expired certification is held, faded with its expiry date, and not a gap", async ({ page }) => {
  await signInAs(page, "Ella Jensen");
  const expired = page.getByRole("region", { name: /^Already met/ }).locator('[data-status="expired"]');
  await expect(expired).toContainText("Power BI Data Analyst (PL-300)");
  await expect(expired).toContainText("expired on");
  await expect(expired).toHaveCSS("opacity", /0\.\d+/);
  await expect(page.getByRole("region", { name: /^Still to learn/ })).not.toContainText("PL-300");
});

test("renewing it changes its state but not her readiness", async ({ page }) => {
  await signInAs(page, "Ella Jensen");
  const readiness = () => page.getByRole("progressbar", { name: /Readiness/ }).getAttribute("aria-valuenow");
  const before = await readiness();

  await page.goto("/me");
  await page.getByText("Change dates or remove").click();
  const next = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Expires on").first().fill(next);
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.locator('[data-status="valid"]')).toContainText("PL-300");

  await page.goto("/");
  await expect(page.getByRole("progressbar", { name: /Readiness/ })).toBeVisible();
  expect(await readiness()).toBe(before);
});

test("one expiring within 90 days is flagged", async ({ page }) => {
  await signInAs(page, "Omar Haddad");
  await expect(page.locator('[data-status="expiring"]')).toContainText("SAFe Scrum Master");
  await expect(page.getByRole("status")).toContainText("expiring soon");
});

test("a date can't be before it was obtained, and what was typed stays", async ({ page }) => {
  await signInAs(page, "Noah Fischer");
  await page.goto("/me");
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Add certification" }) });
  await form.getByLabel("Certification").selectOption({ label: "Azure Fundamentals (AZ-900)" });
  await form.getByLabel("Obtained on").fill("2025-06-01");
  await form.getByLabel("Expires on").fill("2025-05-01");
  await form.getByRole("button", { name: "Add certification" }).click();
  await expect(form.getByRole("alert")).toContainText("before it was obtained");
  await expect(form.getByLabel("Obtained on")).toHaveValue("2025-06-01");
  await expect(form.getByLabel("Certification")).not.toHaveValue("");
});
