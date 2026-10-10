import { expect, test } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

test("an employee has no team, practice or site pages", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  for (const path of ["/team", "/practices/frontend", "/site", "/site/audit", "/requests"]) {
    await page.goto(path);
    await expect(notFound(page), path).toBeVisible();
  }
  await page.goto("/");
  await expect(page.getByRole("link", { name: "My team" })).toHaveCount(0);
});

test("a manager sees the team and requests, not the site", async ({ page }) => {
  await signInAs(page, "Morgan Lee");
  await page.goto("/team");
  await expect(page.getByRole("heading", { name: "My team" })).toBeVisible();
  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: "Change requests" })).toBeVisible();
  await page.goto("/site");
  await expect(notFound(page)).toBeVisible();
});

test("a Practice Lead sees their own practice only", async ({ page }) => {
  await signInAs(page, "Taylor Brooks");
  await page.goto("/practices/frontend");
  await expect(page.getByRole("heading", { name: "Frontend Practice" })).toBeVisible();
  await page.goto("/practices/delivery");
  await expect(notFound(page)).toBeVisible();
  await page.goto("/site");
  await expect(notFound(page)).toBeVisible();
});

test("the Site Lead sees the site pages and every practice", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await page.goto("/practices/delivery");
  await expect(page.getByRole("heading", { name: "Delivery Management" })).toBeVisible();
  await page.goto("/team");
  await expect(notFound(page)).toBeVisible();
});
