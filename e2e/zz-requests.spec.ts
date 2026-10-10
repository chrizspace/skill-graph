import { expect, test, type Page } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

// M10: change requests. Runs after zz-practice-edit (it changes roles the other specs count).

test.describe.configure({ mode: "serial" });

const section = (page: Page, name: string | RegExp) => page.getByRole("region", { name });
const main = (page: Page) => page.locator("main");

/**
 * Chooses a kind of change, fills it in and adds it. All of it is retried together: before the page is interactive a
 * choice is lost, and the fields of the kind that was meant aren't there yet, so each step is short.
 */
async function addChange(page: Page, kind: string | null, fill: () => Promise<void>, shows: string | RegExp) {
  await expect(async () => {
    page.setDefaultTimeout(1500);
    if (kind) await page.getByLabel("Kind of change").selectOption(kind);
    await fill();
    await page.getByRole("button", { name: "Add to the request" }).click();
    await expect(
      section(page, "Changes in this request").getByRole("listitem").filter({ hasText: shows }),
    ).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  page.setDefaultTimeout(0);
}

async function send(page: Page, reason: string) {
  await page.getByLabel(/^Why\?/).fill(reason);
  await page.getByRole("button", { name: "Send the request" }).click();
  await expect(page).toHaveURL(/\/requests\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

async function requireItem(page: Page, item: string, weight: string, note = "") {
  await page.getByLabel("Skill or certification", { exact: true }).selectOption({ label: item });
  await page.getByLabel("Weight", { exact: true }).selectOption(weight);
  if (note) await page.getByLabel("Why it matters (optional)").fill(note);
}

let approvedId = "";

test("Scenario 4: a manager sends feedback, the Practice Lead approves it, the role changes and the audit log links to the request", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/requests/new?practice=frontend&role=ux-developer");
  await addChange(
    page,
    null,
    () => requireItem(page, "Docker", "nice", "Prototypes run in containers"),
    "Require “Docker” as Nice to have",
  );
  approvedId = await send(page, "Our UX people run prototypes in containers every day.");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("UX Developer");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Open");
  await expect(main(page)).toContainText("Require “Docker” as Nice to have (Prototypes run in containers)");
  await expect(main(page)).toContainText("Our UX people run prototypes in containers every day.");
  // the author can't decide on their own request
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);

  // the lead finds it in the inbox and approves it
  const lead = await (await browser.newContext()).newPage();
  await signInAs(lead, "Taylor Brooks");
  await lead.goto("/requests");
  await expect(section(lead, /^Inbox/)).toContainText("UX Developer");
  await lead.goto(`/requests/${approvedId}`);
  await lead.getByLabel(/^Note to the author/).fill("Good point: prototypes are part of the job.");
  await lead.getByRole("button", { name: "Approve" }).click();
  await expect(lead.getByRole("heading", { level: 1 })).toContainText("Approved");
  await expect(section(lead, "What it changed")).toContainText(
    "added requirement UX Developer → Docker (nice)",
  );

  // the role changed, at once, and the history says it came from the request
  await lead.goto("/roles/ux-developer");
  await expect(lead.getByRole("link", { name: "Docker" }).first()).toBeVisible();
  await lead.goto("/practices/frontend/roles/ux-developer/edit");
  await expect(
    section(lead, "History").getByRole("link", { name: "(via a request)" }).first(),
  ).toHaveAttribute("href", `/requests/${approvedId}`);

  // the author sees the decision and the note
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approved");
  await expect(main(page)).toContainText("by Taylor Brooks");
  await expect(main(page)).toContainText("Good point: prototypes are part of the job.");
  await lead.context().close();
});

test("asking for information, the author's answer, and a rejection with a reason", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/requests/new?practice=frontend&role=ux-developer");
  await addChange(
    page,
    "remove_requirement",
    async () => {
      await page
        .getByLabel("Requirement", { exact: true })
        .selectOption({ label: "Figma Foundation (Important)" });
    },
    "Stop requiring “Figma Foundation”",
  );
  const id = await send(page, "Not every UX project uses Figma.");

  const lead = await (await browser.newContext()).newPage();
  await signInAs(lead, "Taylor Brooks");
  await lead.goto(`/requests/${id}`);
  // a reason is required both to ask and to reject
  await lead.getByRole("button", { name: "Reject" }).click();
  await expect(main(lead).getByRole("alert")).toContainText("Say why");
  await lead.getByLabel(/^Note to the author/).fill("Which projects don't use it?");
  await lead.getByRole("button", { name: "Ask for information" }).click();
  await expect(lead.getByRole("heading", { level: 1 })).toContainText("Needs information");

  // the author answers, and it goes back to open
  await page.goto(`/requests/${id}`);
  await expect(main(page)).toContainText("Which projects don't use it?");
  await expect(page.getByRole("status").first()).toContainText("answer below");
  await page.getByLabel("Comment", { exact: true }).fill("Mostly the client work in the north team.");
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Open");

  await lead.goto(`/requests/${id}`);
  await lead.getByLabel(/^Note to the author/).fill("Figma is how designs are handed over; it stays.");
  await lead.getByRole("button", { name: "Reject" }).click();
  await expect(lead.getByRole("heading", { level: 1 })).toContainText("Rejected");

  await page.goto(`/requests/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Rejected");
  await expect(main(page)).toContainText("Figma is how designs are handed over; it stays.");
  // nothing was applied, and a decided request takes no more comments
  await page.goto("/roles/ux-developer");
  await expect(page.getByRole("link", { name: "Figma Foundation" }).first()).toBeVisible();
  await page.goto(`/requests/${id}`);
  await expect(page.getByRole("button", { name: "Add comment" })).toHaveCount(0);
  await lead.context().close();
});

test("a proposal for a new specialisation becomes a draft, and so does a proposal for a new role", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/requests/new?practice=frontend&role=full-stack-developer");
  await addChange(
    page,
    "propose_specialization",
    async () => {
      await page.getByLabel("Name", { exact: true }).fill("Serverless");
      await page.getByLabel("What does it add?").fill("Full-stack work on functions and managed services.");
    },
    "Propose a new specialisation “Serverless”",
  );
  const specId = await send(page, "Half our full-stack work is serverless now.");

  await page.goto("/requests/new?practice=frontend&role=new");
  await addChange(
    page,
    null,
    async () => {
      await page.getByLabel("Name", { exact: true }).fill("Design Systems Engineer");
      await page.getByLabel("What does the role do?").fill("Builds and maintains the component library.");
    },
    "Propose a new role “Design Systems Engineer”",
  );
  const roleId = await send(page, "We have a component library and nobody owns it.");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A new role");

  const lead = await (await browser.newContext()).newPage();
  await signInAs(lead, "Taylor Brooks");
  for (const id of [specId, roleId]) {
    await lead.goto(`/requests/${id}`);
    await lead.getByRole("button", { name: "Approve" }).click();
    await expect(lead.getByRole("heading", { level: 1 })).toContainText("Approved");
  }
  // both are drafts for the lead to complete: visible in the editor, not on the role pages
  await lead.goto("/practices/frontend");
  await expect(lead.getByText("Design Systems Engineer")).toBeVisible();
  await expect(lead.getByText("Draft").first()).toBeVisible();
  await lead.goto("/practices/frontend/roles/full-stack-developer/edit");
  await expect(section(lead, "Specialisations")).toContainText("Full-stack Developer: Serverless");
  await expect(section(lead, "Specialisations")).toContainText("Draft");
  await page.goto("/roles/full-stack-developer");
  await expect(page.getByRole("heading", { level: 1, name: "Full-stack Developer" })).toBeVisible();
  await expect(page.getByText("Serverless")).toHaveCount(0);
  await lead.context().close();
});

test("a request that no longer applies can't be approved, and nothing is changed", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Morgan Lee");
  const ids: string[] = [];
  for (const why of ["First.", "Second."]) {
    await page.goto("/requests/new?practice=frontend&role=ux-developer");
    await addChange(
      page,
      null,
      () => requireItem(page, "Terraform", "nice"),
      "Require “Terraform” as Nice to have",
    );
    ids.push(await send(page, why));
  }
  const lead = await (await browser.newContext()).newPage();
  await signInAs(lead, "Taylor Brooks");
  await lead.goto(`/requests/${ids[0]}`);
  await lead.getByRole("button", { name: "Approve" }).click();
  await expect(lead.getByRole("heading", { level: 1 })).toContainText("Approved");

  await lead.goto(`/requests/${ids[1]}`);
  await expect(lead.getByRole("note").first()).toContainText("No longer applies");
  await lead.getByRole("button", { name: "Approve" }).click();
  await expect(main(lead).getByRole("alert")).toContainText("No longer applies");
  await expect(main(lead).getByRole("alert")).toContainText("already requires");
  await expect(lead.getByRole("heading", { level: 1 })).toContainText("Open");

  // the author takes it back
  await page.goto(`/requests/${ids[1]}`);
  await page.getByRole("button", { name: "Withdraw this request" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Withdrawn");
  await lead.context().close();
});

test("who can see a request: the author, the practice's leads and the Site Lead", async ({ browser }) => {
  const open = async (who: string, path: string) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAs(page, who);
    await page.goto(path);
    return { page, close: () => context.close() };
  };
  const path = `/requests/${approvedId}`;
  for (const who of ["Alex Rivera", "Riley Nowak", "Casey Lin", "Robin Weiss"]) {
    const s = await open(who, path);
    await expect(notFound(s.page), who).toBeVisible();
    await s.close();
  }
  for (const who of ["Morgan Lee", "Taylor Brooks", "Jordan Kim"]) {
    const s = await open(who, path);
    await expect(s.page.getByRole("heading", { level: 1 }), who).toContainText("UX Developer");
    await s.close();
  }
  // employees have no Requests page at all
  const alex = await open("Alex Rivera", "/requests");
  await expect(notFound(alex.page)).toBeVisible();
  await alex.close();
});

test("the Site Lead can step in and decide, and is told it is an emergency", async ({ page }) => {
  await signInAs(page, "Riley Nowak");
  await page.goto("/requests/new?practice=delivery&role=project-manager");
  await addChange(
    page,
    "update_requirement",
    async () => {
      await page
        .getByLabel("Requirement", { exact: true })
        .selectOption({ label: "Estimation (Nice to have)" });
      await page.getByLabel("New weight").selectOption("important");
    },
    "For “Estimation”: make it Important",
  );
  const id = await send(page, "Project Managers estimate every week.");

  const sl = await (await page.context().browser()!.newContext()).newPage();
  await signInAs(sl, "Jordan Kim");
  await sl.goto("/requests");
  await expect(section(sl, /^Inbox/)).toContainText("Project Manager");
  await sl.goto(`/requests/${id}`);
  await expect(sl.getByRole("note").first()).toContainText("emergency");
  await sl.getByRole("button", { name: "Approve" }).click();
  await expect(sl.getByRole("heading", { level: 1 })).toContainText("Approved");
  await expect(section(sl, "What it changed")).toContainText(
    "changed requirement Project Manager → Estimation (important)",
  );
  await expect(section(sl, "What it changed")).toContainText("(emergency)");
  await sl.context().close();
});

test("the seeded examples are there: the open Playwright request and the rejected one with its reason", async ({
  page,
  browser,
}) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/requests");
  await expect(section(page, /^Inbox/)).toContainText("Playwright");
  await page.getByText(/^Decided \(/).click();
  await expect(main(page)).toContainText("Frontend Developer");

  const morgan = await (await browser.newContext()).newPage();
  await signInAs(morgan, "Morgan Lee");
  await morgan.goto("/requests");
  await expect(section(morgan, /^My requests/)).toContainText("Rejected");
  await morgan.getByRole("link", { name: /Stop requiring “Accessibility”/ }).click();
  await expect(main(morgan)).toContainText("Accessibility stays Important");
  await morgan.context().close();
});
