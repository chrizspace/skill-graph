import { expect, test } from "@playwright/test";
import { planSteps, rowNames, signInAs } from "./helpers";

// Scenario 1: a Frontend Developer (JavaScript, TypeScript, React) wants to be a Data Engineer
test.beforeEach(async ({ page }) => signInAs(page, "Alex Rivera"));

test("compare: shared Problem Solving, Git and Agile, all held", async ({ page }) => {
  await page.goto("/compare?a=frontend-developer--react&b=data-engineer");
  const shared = page.getByRole("region", { name: /^Both need/ });
  expect((await rowNames(shared, 3)).sort()).toEqual(["Agile", "Git", "Problem Solving"]);
  await expect(shared.getByText("Have it")).toHaveCount(3);
});

test("compare: SQL, Python, Data Modelling, Spark and Databricks are missing", async ({ page }) => {
  await page.goto("/compare?a=frontend-developer--react&b=data-engineer");
  const adds = page.getByRole("region", { name: /adds/ });
  expect((await rowNames(adds, 5)).sort()).toEqual([
    "Data Modelling",
    "Databricks",
    "Python",
    "SQL",
    "Spark",
  ]);
  await expect(adds.getByText("To learn")).toHaveCount(5);
});

test("the plan lists them in learning order", async ({ page }) => {
  await page.goto("/me");
  await page.getByLabel("Target role").selectOption({ label: "Data Engineer" });
  await page.getByRole("button", { name: "Save target" }).click();
  await expect(page).toHaveURL(/\/me\/plan$/);
  await expect(page.getByRole("heading", { name: "Towards Data Engineer" })).toBeVisible();
  expect(await planSteps(page, 5)).toEqual(["SQL", "Python", "Data Modelling", "Spark", "Databricks"]);
});
