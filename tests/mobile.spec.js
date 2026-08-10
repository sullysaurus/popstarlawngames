// @ts-nocheck
import { expect, test } from "@playwright/test";

const baseURL = process.env.POPSTAR_TEST_URL ?? "http://127.0.0.1:4321";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile booking form sends the complete request in one step", async ({ page }) => {
  await page.goto(baseURL);

  await expect(page.locator(".site-header > .button")).toBeVisible();
  await page.locator("#event-date").fill("10/24/2026");
  await page.locator("#event-zip").fill("27601");
  await page.locator("#event-type").selectOption({ label: "Wedding" });
  await page.locator("#event-package").selectOption("The Celebration Set");
  await page.locator('#availability-form input[name="name"]').fill("Taylor Guest");
  await page.locator('#availability-form input[name="email"]').fill("taylor@example.com");
  await page.locator("#booking-submit").click();

  await expect(page.locator("#availability-message")).toContainText(/request is in|email app is opening/);
  await expect(page.locator("#booking-submit")).toBeEnabled();
});

test("package card preselects the same single booking form", async ({ page }) => {
  await page.goto(baseURL);
  await page.locator('[data-package="The Headliner"]').click();
  await expect(page.locator("#event-package")).toHaveValue("The Headliner");
  await expect(page.locator("#availability-form")).toBeVisible();
  await expect(page.locator("#booking-dialog")).toHaveCount(0);
});

test("date request explains missing required details", async ({ page }) => {
  await page.goto(baseURL);
  await page.locator("#availability-form button").click();
  await expect(page.locator("#availability-message")).toContainText("Complete the required fields");
});

test("event date field matches the other mobile inputs", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto(baseURL);

  const bounds = await page.locator("#event-date").evaluate((input) => {
    const inputRect = input.getBoundingClientRect();
    const formRect = input.closest("form").getBoundingClientRect();
    return {
      inputLeft: inputRect.left,
      inputRight: inputRect.right,
      formLeft: formRect.left,
      formRight: formRect.right,
      inputType: input.type,
      minWidth: getComputedStyle(input).minWidth,
      labelOverflow: getComputedStyle(input.closest("label")).overflowX,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(bounds.inputLeft).toBeGreaterThanOrEqual(bounds.formLeft - 1);
  expect(bounds.inputRight).toBeLessThanOrEqual(bounds.formRight + 1);
  expect(bounds.inputType).toBe("text");
  expect(bounds.minWidth).toBe("0px");
  expect(bounds.labelOverflow).toBe("hidden");
  expect(bounds.pageWidth).toBeLessThanOrEqual(bounds.viewportWidth);
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

test("homepage Playbook feature keeps copy below its image on mobile", async ({ page }) => {
  await page.goto(baseURL);
  const layout = await page.locator(".journal-feature").evaluate((card) => {
    const image = card.querySelector("img").getBoundingClientRect();
    const copy = card.querySelector("div").getBoundingClientRect();
    return {
      imageBottom: image.bottom,
      copyTop: copy.top,
      imageHeight: image.height,
      imageWidth: image.width,
      copyBackground: getComputedStyle(card.querySelector("div")).backgroundColor,
    };
  });

  expect(layout.imageBottom).toBeLessThanOrEqual(layout.copyTop + 1);
  expect(layout.imageHeight).toBeLessThanOrEqual(layout.imageWidth * 0.76);
  expect(layout.copyBackground).not.toBe("rgba(0, 0, 0, 0)");
});

for (const width of [320, 360, 390]) {
  for (const path of ["/", "/rentals/", "/blog/", "/blog/wedding-lawn-games-guide/"]) {
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
          if (element.closest(".marquee, .closed") || element.classList.contains("ambient-video")) return [];
          const viewportOverflow = rect.left < -1 || rect.right > window.innerWidth + 1;
          const internalOverflow = element.scrollWidth > element.clientWidth + 1 && style.overflowX === "visible";
          if (element.closest(".booqable-catalog") && !viewportOverflow) return [];
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
