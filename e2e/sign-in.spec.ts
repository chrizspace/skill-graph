import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("the demo sign-in offers six accounts, one for each way of using the app, and each works", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const expected = [
    ["Alex Rivera", "Employee"],
    ["Riley Nowak", "Career Advisor of 2 people"],
    ["Taylor Brooks", "Practice Lead"],
    ["Casey Lin", "Practice Lead, Career Advisor of 1 person"],
    ["Jordan Kim", "Site Lead"],
    ["Robin Weiss", "Site Lead, Practice Lead, Career Advisor of 2 people"],
  ];
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/sign-in");
  const buttons = page.getByRole("list").getByRole("button");
  await expect(buttons).toHaveCount(6);
  const rows = (await buttons.allInnerTexts()).map((t) =>
    t
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  expect(rows).toEqual(expected);
  await context.close();

  for (const [name] of expected) {
    const fresh = await browser.newContext();
    const p = await fresh.newPage();
    await p.goto("/sign-in");
    await p.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await expect(p.getByRole("heading", { level: 1, name: `Welcome, ${name.split(" ")[0]}` })).toBeVisible();
    await fresh.close();
  }
});

test("a signed-out visitor is sent to sign in and back", async ({ page }) => {
  await page.goto("/roles");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Froles/);
  await page.getByRole("button", { name: "Alex Rivera" }).click();
  await expect(page).toHaveURL(/\/roles$/);
});

test("signing out ends the session", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in/);
});
