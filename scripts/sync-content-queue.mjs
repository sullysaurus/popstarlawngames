import fs from "node:fs/promises";

const enabled = String(process.env.SEO_CREATE_QUEUE_ISSUES || "").toLowerCase() === "true";
if (!enabled) {
  console.log("Issue sync is off. Set SEO_CREATE_QUEUE_ISSUES=true to enable it.");
  process.exit(0);
}

const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
const token = process.env.GITHUB_TOKEN;
if (!owner || !repo || !token) throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required");
const queuePath = process.argv[2] || "reports/seo-dashboard/content-queue.json";
const queue = JSON.parse(await fs.readFile(queuePath, "utf8"));
const headers = {Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"};

async function github(route, options = {}) {
  const response = await fetch(`https://api.github.com${route}`, {...options, headers: {...headers, ...options.headers}});
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0, 400)}`);
  return response.status === 204 ? null : response.json();
}

for (const [name, color, description] of [
  ["content-queue", "245bd7", "SEO opportunities waiting for editorial review"],
  ["seo", "ffd438", "Search optimization work"],
  ["draft-approved", "ff604f", "Generate a reviewed content draft PR"],
]) {
  try { await github(`/repos/${owner}/${repo}/labels`, {method: "POST", body: JSON.stringify({name, color, description})}); } catch (error) { if (!String(error.message).startsWith("422")) throw error; }
}

const issues = await github(`/repos/${owner}/${repo}/issues?state=all&labels=content-queue&per_page=100`);
const existingMarkers = new Set(issues.map((issue) => issue.body?.match(/<!-- seo-keyword:([^>]+) -->/)?.[1]?.trim()).filter(Boolean));
const maxNew = Math.max(1, Math.min(10, Number(process.env.SEO_QUEUE_MAX_NEW || 3)));
let created = 0;

for (const item of queue) {
  if (created >= maxNew || item.score < 55 || existingMarkers.has(item.keyword)) continue;
  const brief = {
    keyword: item.keyword, title: item.title, type: item.type, category: item.category,
    intent: item.intent, outline: item.outline, score: item.score, action: item.action,
    metrics: item.metrics, evidence: item.evidence,
  };
  const draftStep = item.action === "landing-page" ? "3. Create a designed landing page from this brief; the blog-draft generator intentionally rejects landing pages." : "3. Add the `draft-approved` label to generate a draft PR.";
  const body = `<!-- seo-keyword:${item.keyword} -->\n## Editorial brief\n\n- **Target keyword:** ${item.keyword}\n- **Recommended action:** ${item.action}\n- **Priority score:** ${item.score}/100 (planning signal, not a traffic forecast)\n- **Intent:** ${item.intent}\n- **Evidence:** ${item.evidence}\n\n## Proposed outline\n\n${item.outline.map((heading) => `- ${heading}`).join("\n")}\n\n## Workflow\n\n1. Validate the opportunity and angle.\n2. Edit this brief if needed.\n${draftStep}\n4. Review facts, voice, internal links, and conversion path before merging.\n\n\`\`\`json seo-brief\n${JSON.stringify(brief, null, 2)}\n\`\`\`\n`;
  const issue = await github(`/repos/${owner}/${repo}/issues`, {method: "POST", body: JSON.stringify({title: `[SEO] ${item.title}`, body, labels: ["content-queue", "seo"]})});
  console.log(`Created #${issue.number}: ${item.title}`);
  created += 1;
}
console.log(`Content queue sync complete: ${created} issue(s) created.`);
