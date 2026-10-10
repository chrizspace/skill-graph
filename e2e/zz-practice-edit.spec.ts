import { expect, test, type Page } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

// M9: Practice Leads control their practice. This file is named to run last: it changes roles and the catalogue, which
// other specs count (roles per practice, certifications, the size of the overview).

const section = (page: Page, name: string | RegExp) => page.getByRole("region", { name });

test.describe.configure({ mode: "serial" });

test("a Practice Lead creates a draft role, completes it, publishes it, and everyone sees it at once", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend");
  const form = section(page, "New role");
  await form.getByLabel("Name").fill("Embedded UI Developer");
  await form
    .getByLabel("What does the role do?")
    .fill("Builds interfaces for devices with small screens and tight memory.");
  await form.getByRole("button", { name: "Create draft role" }).click();

  // it opens in the editor as a draft
  await expect(page).toHaveURL(/\/practices\/frontend\/roles\/embedded-ui-developer\/edit$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Embedded UI Developer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Draft");

  // nobody else can see a draft
  const other = await browser.newContext();
  const alex = await other.newPage();
  await signInAs(alex, "Alex Rivera");
  await alex.goto("/roles/embedded-ui-developer");
  await expect(notFound(alex)).toBeVisible();

  // a role needs a requirement before it is published
  await page.getByRole("button", { name: "Publish role" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("at least one requirement");

  const core = section(page, "Core requirements");
  await core.getByLabel("Skill or certification").selectOption({ label: "TypeScript" });
  await core.getByLabel("Weight", { exact: true }).selectOption("critical");
  await core.getByLabel("Why it matters (optional)").fill("The language every interface here is written in.");
  await core.getByRole("button", { name: "Add requirement" }).click();
  await expect(core.getByRole("link", { name: "TypeScript" })).toBeVisible();

  await page.getByRole("button", { name: "Publish role" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Published");

  // straight away: the role page, the role list and the graph have it
  await alex.goto("/roles/embedded-ui-developer");
  await expect(alex.getByRole("heading", { level: 1, name: "Embedded UI Developer" })).toBeVisible();
  await expect(alex.getByText("The language every interface here is written in.")).toBeVisible();
  await alex.goto("/roles?q=embedded");
  await expect(alex.getByText("1 role matching")).toBeVisible();
  await alex.goto("/explore?focus=embedded-ui-developer");
  await expect(alex.locator("[data-ready=true]")).toHaveAttribute("data-nodes", "2");
  await other.close();

  // the history of the role records who did what
  const history = section(page, "History");
  await page.reload();
  await expect(history).toContainText("Taylor Brooks added role “Embedded UI Developer”");
  await expect(history).toContainText(
    "Taylor Brooks added requirement Embedded UI Developer → TypeScript (critical)",
  );
  await expect(history).toContainText("Taylor Brooks changed role “Embedded UI Developer”"); // published
});

test("a Practice Lead changes a requirement's weight, and the change and its before and after are recorded", async ({
  page,
}) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend/roles/embedded-ui-developer/edit");
  const core = section(page, "Core requirements");
  await core.getByLabel("Weight of TypeScript").selectOption("important");
  await core.getByRole("button", { name: "Save TypeScript" }).click();
  await expect(core.getByRole("status").first()).toContainText("Saved");
  await page.reload();
  await expect(section(page, "History")).toContainText(
    "changed requirement Embedded UI Developer → TypeScript (important)",
  );
  await page.goto("/roles/embedded-ui-developer");
  await expect(page.getByText("Important").first()).toBeVisible();
});

test("a Practice Lead is refused for another practice's role (Scenario 5)", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  for (const path of [
    "/practices/delivery/roles/scrum-master/edit",
    "/practices/frontend/roles/scrum-master/edit",
    "/practices/delivery",
  ]) {
    await page.goto(path);
    await expect(notFound(page), path).toBeVisible();
  }
  // and no Edit link is offered on a role of someone else's practice
  await page.goto("/roles/scrum-master");
  await expect(page.getByRole("heading", { level: 1, name: "Scrum Master" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit this role" })).toHaveCount(0);
  await page.goto("/roles/ux-developer");
  await expect(page.getByRole("link", { name: "Edit this role" })).toBeVisible();
});

test("employees and managers have no editor", async ({ page }) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/practices/frontend/roles/ux-developer/edit");
  await expect(notFound(page)).toBeVisible();
  await page.goto("/roles/ux-developer");
  await expect(page.getByRole("heading", { level: 1, name: "UX Developer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit this role" })).toHaveCount(0);
});

test("the Site Lead may edit any role in an emergency, and it is recorded as one", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/practices/frontend/roles/ux-developer/edit");
  await expect(page.getByRole("note")).toContainText("emergency");
  await page
    .getByLabel("What the role does and the skillset it looks for")
    .fill("Designs and builds the interface layer, with an eye for usability. Updated in an emergency.");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(section(page, "Name and description").getByRole("status")).toContainText("Saved");
  await page.reload();
  await expect(section(page, "History")).toContainText("Jordan Kim changed role “UX Developer”");
  await expect(section(page, "History")).toContainText("(emergency edit)");
});

test("a name that exists is refused, and what was typed stays", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend");
  const form = section(page, "New role");
  await form.getByLabel("Name").fill("scrum  master");
  await form.getByLabel("What does the role do?").fill("A description I do not want to lose.");
  await form.getByRole("button", { name: "Create draft role" }).click();
  await expect(form.getByRole("alert")).toContainText("already exists");
  await expect(form.getByLabel("Name")).toHaveValue("scrum  master");
  await expect(form.getByLabel("What does the role do?")).toHaveValue("A description I do not want to lose.");
});

test("the catalogue: leads add items, duplicates are refused, employees can't", async ({ page, browser }) => {
  await signInAs(page, "Casey Lin");
  await page.goto("/catalogue");
  const add = section(page, "Add to the catalogue");
  await add.getByLabel("Name").fill(" python ");
  await add.getByRole("button", { name: "Add to the catalogue" }).click();
  await expect(add.getByRole("alert")).toContainText("already exists");

  await add.getByLabel("Name").fill("Zig");
  await add.getByLabel("Category (optional)").fill("Language");
  await add.getByRole("button", { name: "Add to the catalogue" }).click();
  await expect(add.getByRole("status")).toContainText("Added “Zig”");
  await page.goto("/catalogue/zig");
  await expect(page.getByRole("heading", { level: 1, name: "Zig" })).toBeVisible();

  const other = await browser.newContext();
  const alex = await other.newPage();
  await signInAs(alex, "Alex Rivera");
  await alex.goto("/catalogue");
  await expect(alex.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
  await expect(alex.getByRole("region", { name: "Add to the catalogue" })).toHaveCount(0);
  await other.close();
});

test("deleting a role asks first, says what will go, and the role is gone afterwards", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend");
  const form = section(page, "New role");
  await form.getByLabel("Name").fill("Throwaway Role");
  await form.getByLabel("What does the role do?").fill("Only here to be deleted.");
  await form.getByRole("button", { name: "Create draft role" }).click();
  await expect(page).toHaveURL(/throwaway-role\/edit$/);
  const core = section(page, "Core requirements");
  await core.getByLabel("Skill or certification").selectOption({ label: "Git" });
  await core.getByRole("button", { name: "Add requirement" }).click();
  await expect(core.getByRole("link", { name: "Git" })).toBeVisible();

  await expect(async () => {
    await page.getByRole("button", { name: "Delete role" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByRole("dialog")).toContainText("1 links");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/throwaway-role\/edit$/);

  await page.getByRole("button", { name: "Delete role" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete role" }).click();
  await expect(page).toHaveURL(/\/practices\/frontend$/);
  // earlier pages stay in the DOM, hidden (Cache Components keeps their state): only what is visible counts
  await expect(page.getByText("Throwaway Role").filter({ visible: true })).toHaveCount(0);
});

test("official paths: add one with a duration, see it on the role page, remove it", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend/roles/embedded-ui-developer/edit");
  const paths = section(page, "Official paths");
  await paths.getByLabel("To").selectOption({ label: "Full-stack Developer" });
  await paths.getByLabel("Typical months").fill("10");
  await paths.getByLabel("Description (optional)").fill("Add the backend.");
  await paths.getByRole("button", { name: "Add path" }).click();
  await expect(paths).toContainText("Embedded UI Developer → Full-stack Developer");
  await expect(paths).toContainText("typically 10 months");
  await page.goto("/roles/embedded-ui-developer");
  await expect(page.getByText("typically 10 months")).toBeVisible();

  await page.goto("/practices/frontend/roles/embedded-ui-developer/edit");
  await section(page, "Official paths")
    .getByRole("button", { name: "Remove the path to Full-stack Developer" })
    .click();
  await expect(section(page, "Official paths")).not.toContainText("Full-stack Developer →");
});

test("specialisations: add one, give it requirements, publish it after the role", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend/roles/embedded-ui-developer/edit");
  const specs = section(page, "Specialisations");
  await specs.getByLabel("New specialisation: name").fill("Wearables");
  await specs.getByLabel("What does it add?").fill("Interfaces for watches and bands.");
  await specs.getByRole("button", { name: "Add specialisation" }).click();
  await expect(specs).toContainText("Embedded UI Developer: Wearables");
  await expect(specs).toContainText("Draft");
  await specs.getByRole("button", { name: "Publish specialisation" }).click();
  await expect(specs).not.toContainText("Draft");
  await page.goto("/roles/embedded-ui-developer");
  await expect(page.getByText("Embedded UI Developer: Wearables", { exact: true })).toBeVisible();
});
