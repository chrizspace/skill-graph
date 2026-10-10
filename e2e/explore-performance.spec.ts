import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

// docs/PLAN.md M8: the overview of a synthetic graph of 2,000 nodes and 20,000 links is interactive in under 2 s.
// The budgets are for a developer machine; CI's shared runners are slower and set their own (see ci.yml).
const READY_MS = Number(process.env.E2E_PERF_READY_MS ?? 2000);
const MIN_FPS = Number(process.env.E2E_PERF_MIN_FPS ?? 25);

test("the overview of 2,000 nodes and 20,000 links is drawn quickly and stays smooth", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAs(page, "Alex Rivera");
  await page.goto("/explore/perf?nodes=2000&links=20000");
  const drawing = page.locator("[data-ready=true]");
  await expect(drawing).toBeVisible({ timeout: 60_000 });
  await expect(drawing).toHaveAttribute("data-nodes", "2000");
  await expect(drawing).toHaveAttribute("data-edges", "20000");

  // from the start of the page load to the first finished drawing (laid out, fitted, painted)
  const readyAt = Number(await drawing.getAttribute("data-ready-at"));
  const layoutMs = Number(await drawing.getAttribute("data-layout-ms"));
  console.log(`overview ready after ${readyAt} ms (layout ${layoutMs} ms)`);
  expect(readyAt, "time until the overview is ready").toBeLessThan(READY_MS);

  // frame rate while dragging and zooming with the mouse
  const box = (await drawing.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const tick = () => {
      w.__frames++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const started = Date.now();
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 0; i < 60; i++) await page.mouse.move(cx + Math.sin(i / 6) * 120, cy + Math.cos(i / 6) * 60);
  await page.mouse.up();
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, i % 2 ? 60 : -60);
  const seconds = (Date.now() - started) / 1000;
  const frames = await page.evaluate(() => (window as unknown as { __frames: number }).__frames);
  const fps = Math.round(frames / seconds);
  console.log(`${fps} frames per second while panning and zooming`);
  expect(fps, "frames per second while panning and zooming").toBeGreaterThanOrEqual(MIN_FPS);
});

test("search and the table stay quick on the big graph", async ({ page }) => {
  await signInAs(page, "Alex Rivera");
  await page.goto("/explore/perf?nodes=2000&links=20000");
  await expect(page.locator("[data-ready=true]")).toBeVisible({ timeout: 60_000 });
  const started = Date.now();
  await page.getByLabel(/^Search/).fill("skill 12");
  await expect(page.getByRole("list", { name: "Search results" }).getByRole("button").first()).toBeVisible();
  expect(Date.now() - started).toBeLessThan(1500);
  await page.getByRole("list", { name: "Search results" }).getByRole("button").first().click();
  await expect(
    page.getByRole("complementary", { name: "Details" }).getByRole("heading").first(),
  ).toBeVisible();
});
