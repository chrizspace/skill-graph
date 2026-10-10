import { expect, test, type Page } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

// M12: what the Site Lead does (docs/PLAN.md Scenario 8 and the privacy rules of Scenario 10). Runs after the specs that
// read the seeded data; it adds a practice and a catalogue item, and changes a reporting line (put back at the end).

test.describe.configure({ mode: "serial" });

const section = (page: Page, name: string | RegExp) => page.getByRole("region", { name });
const main = (page: Page) => page.locator("main");

async function as(browser: import("@playwright/test").Browser, who: string, path: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAs(page, who);
  await page.goto(path);
  return { page, close: () => context.close() };
}

test("Scenario 8: the Site Lead creates a practice and appoints its Practice Lead, who can then use it", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/practices");
  const form = section(page, "New practice");
  await form.getByLabel("Name").fill("Platform Engineering");
  await form.getByLabel("What does it cover?").fill("Internal platforms and the tooling around them.");
  await form.getByLabel("Practice Lead").selectOption({ label: "Ben Carter" });
  await form.getByRole("button", { name: "Create the practice" }).click();
  await expect(form.getByRole("status")).toContainText("Created “Platform Engineering”");
  await page.reload();
  await expect(page.locator("[data-slot=card]").filter({ hasText: "Platform Engineering" })).toBeVisible();

  // Ben has a new practice in his menu and can open it and start a role
  const ben = await as(browser, "Ben Carter", "/practices/platform-engineering");
  await expect(ben.page.getByRole("heading", { level: 1, name: "Platform Engineering" })).toBeVisible();
  await expect(ben.page.getByRole("link", { name: "Platform Engineering" }).first()).toBeVisible();
  const newRole = section(ben.page, "New role");
  await newRole.getByLabel("Name").fill("Platform Engineer");
  await newRole.getByLabel("What does the role do?").fill("Runs the internal platform.");
  await newRole.getByRole("button", { name: "Create draft role" }).click();
  await expect(ben.page).toHaveURL(/platform-engineering\/roles\/platform-engineer\/edit$/);
  await ben.close();

  // it is in the audit log
  await page.goto("/site/audit?kind=practice");
  await expect(main(page)).toContainText(
    "Jordan Kim created the practice “Platform Engineering” with Ben Carter as its Practice Lead",
  );
});

test("a practice always keeps a lead: the last one can't be removed until another is appointed", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/practices");
  const card = page.locator("[data-slot=card]").filter({ hasText: "Platform Engineering" });
  await card.getByRole("button", { name: "Remove Ben Carter as lead of Platform Engineering" }).click();
  await expect(card.getByRole("alert")).toContainText("needs at least one Practice Lead");

  await card
    .getByLabel("Appoint another lead of Platform Engineering")
    .selectOption({ label: "Lena Hoffmann" });
  await card
    .getByRole("button", { name: "Appoint the chosen person as lead of Platform Engineering" })
    .click();
  await expect(card.getByRole("status").first()).toContainText("Appointed");
  await page.reload();
  await card.getByRole("button", { name: "Remove Ben Carter as lead of Platform Engineering" }).click();
  // his row goes with him, so there is no message to read: he is simply no longer listed
  await expect(
    card.getByRole("button", { name: "Remove Ben Carter as lead of Platform Engineering" }),
  ).toHaveCount(0);

  // Ben no longer leads it; Lena does
  const ben = await as(browser, "Ben Carter", "/practices/platform-engineering");
  await expect(notFound(ben.page)).toBeVisible();
  await ben.close();
  const lena = await as(browser, "Lena Hoffmann", "/practices/platform-engineering");
  await expect(lena.page.getByRole("heading", { level: 1, name: "Platform Engineering" })).toBeVisible();
  await lena.close();
});

test("only the Site Lead manages practices, people, the catalogue and the audit log", async ({ browser }) => {
  for (const who of ["Taylor Brooks", "Morgan Lee", "Alex Rivera"]) {
    const s = await as(browser, who, "/site/practices");
    for (const path of ["/site/practices", "/site/people", "/site/catalogue", "/site/audit", "/site"]) {
      await s.page.goto(path);
      await expect(notFound(s.page), `${who} ${path}`).toBeVisible();
    }
    await s.close();
  }
});

test("reporting lines: people without a manager are easy to find, a loop is refused", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/people?show=no-manager");
  // the e-mail address is only in a person's own row (the names are also in every list of managers)
  await expect(section(page, /^Everyone/)).toContainText("jordan.kim@example.com");
  await expect(section(page, /^Everyone/)).not.toContainText("alex.rivera@example.com"); // he has a manager

  await page.goto("/site/people");
  await page.getByLabel("Reports to (Robin Weiss)").selectOption({ label: "Jordan Kim" });
  await page.getByRole("button", { name: "Save Robin Weiss" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "robin.weiss@example.com" }).getByRole("status"),
  ).toContainText("Saved");

  // Jordan now manages Robin: Robin can't be Jordan's manager
  await page.reload();
  await page.getByLabel("Reports to (Jordan Kim)").selectOption({ label: "Robin Weiss" });
  await page.getByRole("button", { name: "Save Jordan Kim" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "jordan.kim@example.com" }).getByRole("alert"),
  ).toContainText("loop");

  // put it back
  await page.reload();
  await page.getByLabel("Reports to (Robin Weiss)").selectOption("");
  await page.getByRole("button", { name: "Save Robin Weiss" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "robin.weiss@example.com" }).getByRole("status"),
  ).toContainText("Saved");
});

test("the overview shows numbers only: groups of fewer than 5 are hidden and nobody is named (Scenario 10)", async ({
  page,
}) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site");
  await expect(page.getByRole("heading", { level: 1, name: "Site overview" })).toBeVisible();

  const practices = section(page, "Practices");
  const frontend = practices.getByRole("row").filter({ hasText: "Frontend Practice" });
  await expect(frontend).toContainText("7");
  await expect(frontend).toContainText("%");
  const cloud = practices.getByRole("row").filter({ hasText: "Cloud & Security" });
  await expect(cloud).toContainText("Fewer than 5 people: hidden");
  await expect(cloud).not.toContainText("%");
  await expect(
    section(page, "Roles")
      .getByText(/Fewer than 5 people: hidden/)
      .first(),
  ).toBeVisible();
  // small counts inside a shown group are withheld too: they would point at a person
  await expect(practices.getByRole("row").filter({ hasText: "Frontend Practice" })).toContainText(
    "fewer than 5 people",
  );
  await expect(section(page, "Bench strength")).toContainText("Frontend Developer");

  // no one is named anywhere on the page
  for (const name of [
    "Alex Rivera",
    "Zoe Adler",
    "Noah Fischer",
    "Sam Patel",
    "Ella Jensen",
    "Morgan Lee",
    "Riley Nowak",
  ]) {
    await expect(main(page), name).not.toContainText(name);
  }
  // and the pages that would name people are closed to the Site Lead (see people.spec)
  await page.goto("/team");
  await expect(notFound(page)).toBeVisible();
});

test("merging a duplicate catalogue item: the impact first, a confirmation, then it is gone", async ({
  page,
}) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/catalogue");
  const add = section(page, "Add to the catalogue");
  await add.getByLabel("Name").fill("K8s");
  await add.getByRole("button", { name: "Add to the catalogue" }).click();
  await expect(add.getByRole("status")).toContainText("Added “K8s”");
  await page.goto("/catalogue/k8s");
  await expect(page.getByRole("heading", { level: 1, name: "K8s" })).toBeVisible();

  await page.goto("/site/catalogue");
  await page.getByLabel("Keep", { exact: true }).selectOption({ label: "Kubernetes" });
  await page.getByLabel("Merge into it (this one is deleted)").selectOption({ label: "K8s" });
  await page.getByRole("button", { name: "Show what it would do" }).click();
  await expect(page.getByRole("heading", { name: "Merge “K8s” into “Kubernetes”" })).toBeVisible();
  await expect(main(page)).toContainText("0 requirements move");

  // a different type is refused, with the reason
  await page.goto("/site/catalogue");
  await page.getByLabel("Keep", { exact: true }).selectOption({ label: "Communication" });
  await page.getByLabel("Merge into it (this one is deleted)").selectOption({ label: "K8s" });
  await page.getByRole("button", { name: "Show what it would do" }).click();
  await expect(main(page)).toContainText("only items of the same type can be merged");

  await page.goto("/site/catalogue");
  await page.getByLabel("Keep", { exact: true }).selectOption({ label: "Kubernetes" });
  await page.getByLabel("Merge into it (this one is deleted)").selectOption({ label: "K8s" });
  await page.getByRole("button", { name: "Show what it would do" }).click();
  await expect(async () => {
    await page.getByRole("button", { name: /^Merge “K8s” into “Kubernetes”/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.getByRole("dialog").getByRole("button", { name: "Merge and delete the duplicate" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Merged." })).toBeVisible();

  await page.goto("/catalogue/k8s");
  await expect(notFound(page)).toBeVisible();
  await page.goto("/site/audit?kind=node");
  await expect(main(page)).toContainText("merged “K8s” into “Kubernetes”");
});

test("categories: rename one across its items, and set or clear an item's category", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/catalogue");
  const add = section(page, "Add to the catalogue");
  await add.getByLabel("Name").fill("Zeta Skill");
  await add.getByLabel("Category (optional)").fill("Spare");
  await add.getByRole("button", { name: "Add to the catalogue" }).click();
  await expect(add.getByRole("status")).toContainText("Added “Zeta Skill”");

  await page.goto("/site/catalogue");
  await page.getByLabel("1 item in").fill("Spare parts");
  // the row is made again under the new name, so its own message goes with it: wait for the server, then read the page
  const renamed = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/site/catalogue"),
  );
  await page.getByRole("button", { name: "Rename the category Spare" }).click();
  await renamed;
  await page.reload();
  await expect(page.getByLabel("1 item in")).toHaveValue("Spare parts");

  await page.getByLabel("Put an item in a category").selectOption({ label: "Zeta Skill" });
  await page.getByLabel("Category (empty: none)").fill("");
  await page.getByRole("button", { name: "Save", exact: true }).last().click();
  await expect(section(page, "Categories").getByRole("status").last()).toContainText("Saved");
  await page.goto("/site/audit?kind=node");
  await expect(main(page)).toContainText("renamed the category “Spare” to “Spare parts” (1 item)");
  await expect(main(page)).toContainText("took “Zeta Skill” out of its category");
});

test("the audit log pages through everything, newest first, and can be filtered", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/audit");
  await expect(page.getByRole("heading", { level: 1, name: "Audit log" })).toBeVisible();
  const first = page.locator("main ol > li").first(); // not the filter chips above it
  await expect(first).toContainText("UTC");
  // 25 entries to a page: with more than that (the whole suite writes many) there are pages to go through
  const total = Number(
    (
      await main(page)
        .getByText(/^\d+ entries/)
        .innerText()
    ).split(" ")[0],
  );
  if (total > 25) {
    await expect(main(page).getByRole("navigation", { name: "Pages" })).toBeVisible();
    await page.getByRole("link", { name: "Older" }).click();
    await expect(page).toHaveURL(/page=2/);
  } else {
    await expect(main(page).getByRole("navigation", { name: "Pages" })).toHaveCount(0);
  }
  await page.goto("/site/audit?kind=access");
  await expect(main(page)).toContainText(
    "appointed Lena Hoffmann as Practice Lead of “Platform Engineering”",
  );
  await expect(main(page)).toContainText("removed Ben Carter as Practice Lead of “Platform Engineering”");
  await expect(main(page)).not.toContainText("created the practice");
});
