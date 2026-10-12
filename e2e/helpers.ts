import { expect, test, type Locator, type Page } from "@playwright/test";

/** A demo person's address: first.last@example.com. */
export const demoEmail = (name: string) => `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;

/**
 * Demo sign-in as a seeded person, by name. It asks the sign-in endpoint directly: the picker only offers five of
 * the people (e2e/sign-in.spec.ts covers it), and the tests need all of them.
 */
export async function signInAs(page: Page, name: string) {
  await page.context().clearCookies(); // signing in as someone else mid-test
  // the sign-in endpoint wants to know where the request comes from, as a browser tells it
  const origin = test.info().project.use.baseURL!;
  const response = await page.request.post("/api/auth/sign-in/demo", {
    data: { email: demoEmail(name) },
    headers: { origin },
  });
  expect(response.ok(), `sign in as ${name}: ${response.status()} ${await response.text()}`).toBe(true);
  await page.goto("/");
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
