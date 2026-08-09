// @ts-nocheck
import { expect, test } from "@playwright/test";
import fixture from "./fixtures/seo-dashboard.json" with { type: "json" };

const baseURL = process.env.DASHBOARD_TEST_URL ?? "http://127.0.0.1:8888";
const report = {
  ...fixture,
  generatedAt: new Date().toISOString(),
  queue: fixture.seeds.map((seed, index) => ({
    ...seed,
    id: seed.keyword.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    score: 82 - index * 7,
    action: seed.type === "landing-page" ? "landing-page" : "create",
    workflow: {status: "queued"},
    metrics: {monthlyVolume: fixture.keywords[index]?.volume || null, gscPosition: fixture.gsc.queries[index]?.position || null},
  })),
};

test.beforeEach(async ({ request }) => {
  const response = await request.put(`${baseURL}/api/seo-dashboard`, {
    headers: {Authorization: "Bearer local-test-ingest"},
    data: report,
  });
  expect(response.ok()).toBeTruthy();
});

for (const viewport of [{width: 390, height: 844}, {width: 1440, height: 1000}]) {
  test(`protected dashboard works at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${baseURL}/seo-dashboard/`);
    await expect(page.locator("#login-panel")).toBeVisible();
    await page.locator("#dashboard-password").fill("local-test-password");
    await page.locator("#dashboard-login button").click();
    await expect(page.locator("#dashboard")).toBeVisible();
    await expect(page.locator("#login-panel")).toBeHidden();
    await expect(page.locator("#metric-sessions")).toHaveText("120");
    await expect(page.locator("#queue-body tr")).toHaveCount(2);
    const widths = await page.evaluate(() => ({page: document.documentElement.scrollWidth, viewport: innerWidth}));
    expect(widths.page).toBeLessThanOrEqual(widths.viewport);
    if (viewport.width === 1440) await page.screenshot({path: "/private/tmp/popstar-dashboard-desktop.png", fullPage: true});
  });
}
