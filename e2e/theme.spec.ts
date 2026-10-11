import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

const html = (page: Page) => page.locator("html");
const primary = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim());

/** Chooses a theme on the profile page. Retries, because a click before the page is interactive does nothing. */
async function choose(page: Page, label: "Orange" | "Violet") {
  await page.goto("/me");
  await expect(async () => {
    await page.getByRole("radio", { name: label }).check({ force: true });
    await expect(html(page)).toHaveAttribute("data-theme", label.toLowerCase(), { timeout: 1000 });
  }).toPass();
}

test("Orange is the default; Violet is chosen on the profile page and kept", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await expect(html(page)).toHaveAttribute("data-theme", "orange");
  expect(await primary(page)).toBe("#ff5800");

  await choose(page, "Violet");
  expect(await primary(page)).toBe("#a100ff");

  // it survives a reload and another page, with no flash of the default (the attribute is set before first paint)
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "violet");
  await page.goto("/roles");
  await expect(html(page)).toHaveAttribute("data-theme", "violet");

  await choose(page, "Orange");
  expect(await primary(page)).toBe("#ff5800");
});

test("it is saved on the profile, so a browser that never saw it gets it too", async ({ browser }) => {
  const first = await browser.newContext();
  const page = await first.newPage();
  await signInAs(page, "Noah Fischer");
  // the choice is stored by a server action: wait for its response before leaving
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/me"));
  await choose(page, "Violet");
  await saved;
  await first.close();

  const other = await browser.newContext(); // no localStorage, as on another device
  const fresh = await other.newPage();
  await signInAs(fresh, "Noah Fischer");
  await expect(html(fresh)).toHaveAttribute("data-theme", "violet");
  await other.close();
});

test("the account menu has no theme choice", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.getByRole("button", { name: /Account menu/ }).click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("menuitemradio")).toHaveCount(0);
});
