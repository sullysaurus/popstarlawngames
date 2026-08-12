import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { dailyKeywordBatch, escapeHtml, renderDashboard, scoreQueue } from "../scripts/seo-dashboard-lib.mjs";

const exec = promisify(execFile);

test("queue scoring ranks strong commercial opportunities and marks existing content", async () => {
  const fixture = JSON.parse(await fs.readFile(new URL("./fixtures/seo-dashboard.json", import.meta.url), "utf8"));
  const queue = scoreQueue(fixture.seeds, fixture.keywords, fixture.gsc.queries, fixture.existingKeywords);
  assert.equal(queue[0].keyword, "lawn game rentals raleigh nc");
  assert.equal(queue.find((item) => item.keyword.includes("how many"))?.action, "update");
  assert.ok(queue.every((item) => item.score >= 0 && item.score <= 100));
});

test("dashboard fixture produces a responsive report and queue JSON", async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), "popstar-seo-"));
  await exec(process.execPath, ["scripts/seo-dashboard.mjs", "--fixture", "tests/fixtures/seo-dashboard.json", "--output", output], {cwd: path.resolve(import.meta.dirname, "..")});
  const [html, queue] = await Promise.all([fs.readFile(path.join(output, "index.html"), "utf8"), fs.readFile(path.join(output, "content-queue.json"), "utf8")]);
  assert.match(html, /SEO Command Center/);
  assert.match(html, /Organic sessions/);
  assert.match(html, /Content queue/);
  assert.equal(JSON.parse(queue).length, 2);
});

test("dashboard HTML escaping prevents injected markup", () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("keyword batches rotate through the full queue and wrap cleanly", () => {
  const keywords = ["one", "two", "three", "four", "five"];
  assert.deepEqual(dailyKeywordBatch(keywords, 2, new Date("1970-01-01T00:00:00Z")), ["one", "two"]);
  assert.deepEqual(dailyKeywordBatch(keywords, 2, new Date("1970-01-02T00:00:00Z")), ["three", "four"]);
  assert.deepEqual(dailyKeywordBatch(keywords, 2, new Date("1970-01-03T00:00:00Z")), ["five", "one"]);
});

test("connected Search Console has an accurate zero-query empty state", () => {
  const html = renderDashboard({
    generatedAt: "2026-08-12T00:00:00.000Z",
    status: {ga4: {ok: true}, gsc: {ok: true}, keywords: {ok: true}},
    ga4: {current: {}, previous: {}},
    gsc: {totals: {}, previousTotals: {}, queries: []},
    queue: [],
  });
  assert.match(html, /Search Console is connected\. No queries have impressions/);
  assert.doesNotMatch(html, /Connect Search Console to see live queries/);
});

test("the scheduled article calendar has one unique post per day", async () => {
  const blogDirectory = path.resolve(import.meta.dirname, "../src/content/blog");
  const files = (await fs.readdir(blogDirectory)).filter((file) => file.endsWith(".md"));
  const posts = await Promise.all(files.map(async (file) => {
    const content = await fs.readFile(path.join(blogDirectory, file), "utf8");
    return {
      file,
      date: content.match(/^publishedDate:\s*([^\n]+)/m)?.[1]?.trim(),
      keyword: content.match(/^targetKeyword:\s*["']([^"']+)/m)?.[1]?.trim(),
    };
  }));
  assert.equal(posts.length, 50);
  assert.equal(new Set(posts.map((post) => post.keyword)).size, 50);
  assert.equal(new Set(posts.map((post) => post.date)).size, 50);
  const scheduledDates = posts.map((post) => post.date).filter((date) => date >= "2026-08-13").sort();
  assert.equal(scheduledDates.length, 47);
  assert.equal(scheduledDates[0], "2026-08-13");
  assert.equal(scheduledDates.at(-1), "2026-09-28");
  scheduledDates.forEach((date, index) => {
    const expected = new Date(Date.UTC(2026, 7, 13 + index)).toISOString().slice(0, 10);
    assert.equal(date, expected);
  });
});
