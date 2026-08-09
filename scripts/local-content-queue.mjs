import fs from "node:fs/promises";
import path from "node:path";
import { scoreQueue, slugify } from "./seo-dashboard-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const statePath = path.join(root, "seo/content-state.json");
const reportQueuePath = path.join(root, "reports/seo-dashboard/content-queue.json");
const command = process.argv[2] || "list";
const argument = process.argv[3] || "next";

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function existingKeywords() {
  const directory = path.join(root, "src/content/blog");
  const files = (await fs.readdir(directory)).filter((file) => /\.mdx?$/.test(file));
  const contents = await Promise.all(files.map((file) => fs.readFile(path.join(directory, file), "utf8")));
  return contents.map((content) => content.match(/^targetKeyword:\s*["']?([^\n"']+)/m)?.[1]?.trim()).filter(Boolean);
}

async function loadQueue() {
  const state = await readJson(statePath, {});
  let queue = await readJson(reportQueuePath, null);
  if (!queue) {
    const seeds = await readJson(path.join(root, "seo/keyword-seeds.json"), []);
    queue = scoreQueue(seeds, [], [], await existingKeywords());
  }
  return queue.map((item) => ({...item, workflow: state[item.id] || {status: "queued"}}));
}

const queue = await loadQueue();

if (command === "list") {
  console.table(queue.map((item) => ({score: item.score, status: item.workflow.status, action: item.action, id: item.id, keyword: item.keyword})));
  process.exit(0);
}

if (command === "brief") {
  const eligible = queue.filter((item) => item.action !== "landing-page" && !["drafted", "published"].includes(item.workflow.status));
  const item = argument === "next" ? eligible[0] : queue.find((candidate) => candidate.id === argument || candidate.keyword === argument);
  if (!item) throw new Error(`No eligible content item found for "${argument}"`);
  if (item.action === "landing-page") throw new Error("This opportunity needs a designed landing page, not a blog draft");
  const brief = {
    id: item.id || slugify(item.keyword), title: item.title, keyword: item.keyword, type: item.type,
    action: item.action, category: item.category, intent: item.intent, outline: item.outline,
    score: item.score, metrics: item.metrics, evidence: item.evidence,
  };
  const output = path.join(root, "reports/seo-dashboard/local-brief.json");
  await fs.mkdir(path.dirname(output), {recursive: true});
  await fs.writeFile(output, JSON.stringify(brief, null, 2));
  console.log(path.relative(root, output));
  process.exit(0);
}

if (command === "mark") {
  const status = process.argv[4];
  const articlePath = process.argv[5] || null;
  if (!queue.some((item) => item.id === argument)) throw new Error(`Unknown queue id: ${argument}`);
  if (!new Set(["queued", "drafted", "published", "skipped"]).has(status)) throw new Error("Status must be queued, drafted, published, or skipped");
  const state = await readJson(statePath, {});
  state[argument] = {status, articlePath, updatedAt: new Date().toISOString()};
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  console.log(`${argument}: ${status}`);
  process.exit(0);
}

throw new Error("Usage: local-content-queue.mjs <list|brief|mark> [id|next] [status] [article-path]");
