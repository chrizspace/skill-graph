import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

const primary = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());

test("Orange is the default; Violet can be chosen in the account menu and is kept", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "orange");
  expect(await primary(page)).toBe("#ff5800");

  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitemradio", { name: "Violet" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  expect(await primary(page)).toBe("#a100ff");

  // it survives a reload and another page, with no flash of the default (the attribute is set before first paint)
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await page.goto("/roles");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
});

test("the profile page has the same choice", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/me");
  await page.getByRole("radio", { name: "Violet" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await page.getByRole("radio", { name: "Orange" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "orange");
  expect(await primary(page)).toBe("#ff5800");
});
