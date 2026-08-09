import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { escapeHtml, scoreQueue } from "../scripts/seo-dashboard-lib.mjs";

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
