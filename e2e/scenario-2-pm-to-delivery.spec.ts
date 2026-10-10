import { expect, test } from "@playwright/test";
import { rowNames, signInAs } from "./helpers";

// Scenario 2: a Project Manager wants to be a Delivery Manager
test("moving to Delivery Manager adds Leadership, People, Financial, Account Management and Commercial Awareness", async ({
  page,
}) => {
  await signInAs(page, "Sam Patel");
  await page.goto("/compare?a=project-manager&b=delivery-manager");
  const adds = page.getByRole("region", { name: /adds/ });
  expect((await rowNames(adds, 5)).sort()).toEqual([
    "Account Management",
    "Commercial Awareness",
    "Financial Management",
    "Leadership",
    "People Management",
  ]);
  await expect(adds.getByText("To learn")).toHaveCount(5);
});
