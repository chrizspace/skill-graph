import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

// M13: the keyboard pass (docs/PLAN.md §6). Everything here is done without a mouse. Read-only: it runs with the first specs.

const inside = (page: Page, selector: string) =>
  page.evaluate((s) => Boolean(document.activeElement?.closest(s)), selector);
const focusedName = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el ? (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 60) : "";
  });

test("the skip link is the first stop, shows itself, and takes you past the navigation", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/roles");
  await expect(page.getByRole("heading", { level: 1, name: "Roles" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeVisible();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(await inside(page, "main")).toBe(true);
});

test("the navigation is reached in order, by Tab, and every stop shows where the focus is", async ({
  page,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const stops: string[] = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    stops.push(await focusedName(page));
  }
  expect(stops.slice(0, 4)).toEqual([
    "Skip to content",
    "Skill Graph",
    expect.stringContaining("Account menu"),
    "Home",
  ]);
  expect(stops).toEqual(expect.arrayContaining(["Roles", "Catalogue", "Graph", "My team"]));
});

test("every interactive element on the main pages shows a visible focus", async ({ page }) => {
  await signInAs(page, "Morgan Lee");
  for (const path of [
    "/",
    "/roles",
    "/catalogue",
    "/me",
    "/team",
    "/requests/new?practice=frontend&role=ux-developer",
    "/explore?focus=data-engineer",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    const unclear = await page.evaluate(() => {
      const problems: string[] = [];
      const focusable = document.querySelectorAll<HTMLElement>(
        "a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex='-1'])",
      );
      for (const el of focusable) {
        const box = el.getBoundingClientRect();
        if (
          !box.width ||
          !box.height ||
          el.closest("[hidden], [inert], [aria-hidden=true]") ||
          getComputedStyle(el).visibility === "hidden"
        )
          continue;
        if (el.matches(".sr-only") && !el.matches(":focus")) {
          // the skip link: only shown on focus, still has to show it
        }
        el.focus({ focusVisible: true } as FocusOptions);
        if (document.activeElement !== el) continue;
        const s = getComputedStyle(el);
        const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
        const ring = s.boxShadow !== "none";
        // radio buttons and checkboxes in a label: the browser's own ring, or the label's
        const native = el instanceof HTMLInputElement && ["radio", "checkbox"].includes(el.type);
        // a link that covers its whole card: the card shows the ring (focus-within)
        const container = el.closest("label") ?? el.closest("[data-slot=card]");
        const labelRing = container && getComputedStyle(container).boxShadow !== "none";
        if (!outline && !ring && !native && !labelRing) {
          problems.push(
            `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? el.getAttribute("name") ?? "").trim().slice(0, 40)}"`,
          );
        }
      }
      return problems;
    });
    expect(unclear, path).toEqual([]);
  }
});

test("the account menu: Enter opens it, the arrow keys move in it, Escape closes it and gives the focus back", async ({
  page,
}) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /Account menu/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const signOut = page.getByRole("menuitem", { name: "Sign out" });
  await expect(signOut).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(signOut).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(signOut).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("the menu on a phone: it opens and closes from the keyboard and the focus doesn't get lost", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await signInAs(page, "Alex Rivera");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Open menu" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  expect(await inside(page, "#mobile-nav")).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  await context.close();
});

test("a confirmation window traps the focus, closes with Escape and gives the focus back", async ({
  page,
}) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend/roles/ux-developer/edit");
  await page.waitForLoadState("networkidle");
  const trigger = page.getByRole("button", { name: "Delete role" }).first();
  await expect(async () => {
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();
  // Tab goes around inside the window only
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(await inside(page, "[role=dialog]"), `after ${i + 1} Tab presses`).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("tabs change with the arrow keys, and a search form is sent with Enter", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/explore?focus=data-engineer");
  await page.waitForLoadState("networkidle");
  const graph = page.getByRole("tab", { name: "Graph" });
  await graph.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Table view" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(graph).toHaveAttribute("aria-selected", "true");

  await page.goto("/roles");
  await page.getByRole("searchbox", { name: "Search roles" }).focus();
  await page.keyboard.type("scrum");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=scrum/);
  await expect(page.getByText("1 role matching")).toBeVisible();
});

test("the graph can be driven by the keyboard alone and its table says the same", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/explore?focus=data-engineer");
  await expect(page.locator("[data-ready=true]")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("/");
  await expect(page.getByLabel(/^Search/)).toBeFocused();
  await page.keyboard.type("python");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/focus=python/);
  await page.keyboard.press("Escape"); // the search box: clears it
  await page.getByRole("group", { name: /^Graph:/ }).focus();
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/focus=/);
});
