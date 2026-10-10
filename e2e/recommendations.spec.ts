import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// Scenario 6, the employee's side: Morgan recommended a target to Alex
test("accepting a recommended target makes it the target and the plan", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/me/plan");
  await expect(page.getByText("Morgan Lee suggests a target")).toBeVisible();
  await page.getByRole("button", { name: "Accept as my target" }).click();
  await expect(page.getByRole("heading", { name: "Towards Full-stack Developer" })).toBeVisible();
  await expect(page.getByText("Morgan Lee suggests")).toHaveCount(0);
});

test("declining a recommendation leaves the target alone", async ({ page }) => {
  await signInAs(page, "Sam Patel");
  await page.goto("/me/plan");
  await expect(page.getByText("Riley Nowak suggests")).toBeVisible();
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Riley Nowak suggests")).toHaveCount(0);
  await expect(page.getByText("You haven't picked a target yet.")).toBeVisible();
});
