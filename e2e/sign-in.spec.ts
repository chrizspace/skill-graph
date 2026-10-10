import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("every demo person can sign in", async ({ browser }) => {
  test.setTimeout(90_000); // 18 sign-ins
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/sign-in");
  const buttons = page.getByRole("list").getByRole("button");
  await expect(buttons).toHaveCount(18);
  const names = (await buttons.allInnerTexts()).map((t) => t.split("\n")[0]);
  await context.close();

  for (const name of names) {
    const fresh = await browser.newContext();
    await signInAs(await fresh.newPage(), name);
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
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/sign-in/);
});
