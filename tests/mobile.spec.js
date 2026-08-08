// @ts-nocheck
import { expect, test } from "@playwright/test";

const baseURL = process.env.POPSTAR_TEST_URL ?? "http://127.0.0.1:4321";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile booking flow preserves event details and reaches a send path", async ({ page }) => {
  await page.goto(baseURL);

  await expect(page.locator(".site-header > .button")).toBeVisible();
  await page.locator("#event-date").fill("2026-10-24");
  await page.locator("#event-zip").fill("27601");
  await page.locator("#event-type").selectOption({ label: "Wedding" });
  await page.locator("#availability-form button").click();

  await page.locator(".package-select").first().click();
  await expect(page.locator("#booking-dialog")).toBeVisible();
  await expect(page.locator("#selected-event-date")).toHaveValue("2026-10-24");
  await expect(page.locator("#selected-event-zip")).toHaveValue("27601");
  await expect(page.locator("#selected-event-type")).toHaveValue("Wedding");

  await page.locator('#booking-form input[name="name"]').fill("Taylor Guest");
  await page.locator('#booking-form input[name="email"]').fill("taylor@example.com");
  await page.locator("#booking-submit").click();

  await expect(page.locator("#dialog-message")).toContainText("email app is opening");
  await expect(page.locator("#booking-submit")).toBeEnabled();
});

test("mobile blog layouts do not overflow or float the editorial note", async ({ page }) => {
  await page.goto(`${baseURL}/blog/`);
  const listMetrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    notePosition: getComputedStyle(document.querySelector(".blog-hero-note")).position,
  }));
  expect(listMetrics.bodyWidth).toBeLessThanOrEqual(listMetrics.viewportWidth);
  expect(listMetrics.notePosition).toBe("static");

  await page.goto(`${baseURL}/blog/wedding-lawn-games-guide/`);
  const articleMetrics = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    asidePosition: getComputedStyle(document.querySelector(".post-aside")).position,
  }));
  expect(articleMetrics.bodyWidth).toBeLessThanOrEqual(articleMetrics.viewportWidth);
  expect(articleMetrics.asidePosition).toBe("static");
});
