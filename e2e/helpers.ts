import { expect, type Locator, type Page } from "@playwright/test";

/** Demo sign-in as a seeded person, by name. */
export async function signInAs(page: Page, name: string) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Welcome, ${name.split(" ")[0]}` })).toBeVisible();
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * The first line of each row (`li`) inside a locator: the item's name. It first waits until there are `count` rows,
 * because the page streams in and reading too early gives an empty list.
 */
export async function rowNames(within: Locator, count: number) {
  const rows = within.locator("li");
  await expect(rows).toHaveCount(count);
  return (await rows.allInnerTexts()).map((t) => lines(t)[0]);
}

/** The names of the plan's steps, in order (each row reads "1." then the name). */
export async function planSteps(page: Page, count: number) {
  const rows = page.locator("ol > li");
  await expect(rows).toHaveCount(count);
  return (await rows.allInnerTexts()).map((t) => lines(t)[1]);
}

export const notFound = (page: Page) => page.getByText("This page could not be found.");
