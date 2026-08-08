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

  await expect(page.locator("#dialog-message")).toContainText(/request is in|email app is opening/);
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

for (const width of [320, 360, 390]) {
  for (const path of ["/", "/blog/", "/blog/wedding-lawn-games-guide/"]) {
    test(`${path} keeps visible content inside a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      await page.goto(`${baseURL}${path}`);
      await page.waitForTimeout(800);

      const offenders = await page.locator("body *").evaluateAll((elements) =>
        elements.flatMap((element) => {
          if (!(element instanceof HTMLElement)) return [];
          const root = element.getRootNode();
          if (root instanceof ShadowRoot && root.host.tagName === "ASTRO-DEV-TOOLBAR") return [];
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (style.display === "none" || style.visibility === "hidden" || rect.width === 0) return [];
          if (element.closest(".marquee") || element.classList.contains("ambient-video")) return [];
          const viewportOverflow = rect.left < -1 || rect.right > window.innerWidth + 1;
          const internalOverflow = element.scrollWidth > element.clientWidth + 1 && style.overflowX === "visible";
          return viewportOverflow || internalOverflow
            ? [{
                tag: element.tagName,
                className: element.className,
                left: rect.left,
                right: rect.right,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
              }]
            : [];
        }),
      );

      expect(offenders).toEqual([]);
    });
  }
}
