import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { slugify } from "./seo-dashboard-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const issueFile = process.argv[2];
if (!issueFile) throw new Error("Usage: node scripts/generate-content-draft.mjs <issue.json>");
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
const issue = JSON.parse(await fs.readFile(issueFile, "utf8"));
const block = issue.body?.match(/```json seo-brief\s*([\s\S]*?)```/);
if (!block) throw new Error("The issue does not contain a valid `json seo-brief` block");
const brief = JSON.parse(block[1]);
if (brief.action === "landing-page" || brief.type === "landing-page") throw new Error("Landing-page briefs require a designed page template and cannot be generated as blog posts");
const slug = slugify(brief.title || brief.keyword);
const blogDirectory = path.join(root, "src/content/blog");
let destination = path.join(blogDirectory, `${slug}.md`);
let existingContent = "";
if (brief.action === "update") {
  for (const file of (await fs.readdir(blogDirectory)).filter((name) => /\.mdx?$/.test(name))) {
    const candidate = await fs.readFile(path.join(blogDirectory, file), "utf8");
    const keyword = candidate.match(/^targetKeyword:\s*["']?([^\n"']+)/m)?.[1]?.trim().toLowerCase();
    if (keyword === String(brief.keyword).trim().toLowerCase()) {
      destination = path.join(blogDirectory, file);
      existingContent = candidate;
      break;
    }
  }
  if (!existingContent) throw new Error(`No existing article targets "${brief.keyword}"`);
} else {
  try { await fs.access(destination); throw new Error(`Refusing to overwrite existing article: ${destination}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

const client = new OpenAI();
const response = await client.responses.create({
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  instructions: `You are the senior editor for Popstar Lawn Games, a premium lawn-game rental company serving Raleigh, Durham, Chapel Hill, and the Triangle in North Carolina. Write helpful, specific content in a polished, energetic voice. The service delivers, sets up, and picks up premium games. Current packages are Social Set: 3 games for $299; Celebration Set: 5 games for $449; Headliner Set: 8 games for $699. Rentals are event-day, up to 8 hours, with no guest minimum. Hosted custom events start at $2,500. Never invent statistics, testimonials, venue relationships, availability, policies, or local facts. Do not keyword-stuff. Do not use generic AI phrases. Return Markdown body only: no frontmatter, no H1, no preamble. Use useful H2 sections, concise paragraphs, occasional bullets, internal links to /#packages and /#availability where natural, and finish with a practical call to action.`,
  input: `${existingContent ? "Revise the existing article using the reviewed brief. Preserve useful factual material while improving its answer and structure.\n\nEXISTING ARTICLE:\n" + existingContent + "\n\n" : "Create the article from this reviewed editorial brief.\n"}EDITORIAL BRIEF:\n${JSON.stringify(brief, null, 2)}\nAim for 1,100–1,600 words. Answer the primary question early.`,
});
const body = response.output_text?.trim();
if (!body || body.length < 1200) throw new Error("The generated draft was unexpectedly short");
if (/(<\/?script\b|^---\s*$|^import\s)/im.test(body)) throw new Error("The generated draft contained unsafe or invalid Markdown constructs");
const plain = body.replace(/[#*_>`\[\]()!-]/g, " ");
const wordCount = plain.trim().split(/\s+/).length;
const readingTime = Math.max(3, Math.ceil(wordCount / 220));
const description = `${brief.title}. Practical planning advice from Popstar Lawn Games for polished events across the Triangle.`.slice(0, 155).replace(/"/g, "'");
const image = brief.category === "Weddings" ? "/assets/celebration-set-reference.jpg" : "/assets/social-set-reference.jpg";
const safe = (value) => String(value).replace(/"/g, "'").replace(/\n/g, " ");
const today = new Date().toISOString().slice(0, 10);
const originalDate = existingContent.match(/^publishedDate:\s*([^\n]+)/m)?.[1]?.trim() || today;
const originalImage = existingContent.match(/^image:\s*["']?([^\n"']+)/m)?.[1]?.trim() || image;
const featured = existingContent.match(/^featured:\s*(true|false)/m)?.[1] || "false";
const updatedDate = existingContent ? `updatedDate: ${today}\n` : "";
const frontmatter = `---\ntitle: "${safe(brief.title)}"\ndescription: "${safe(description)}"\npublishedDate: ${originalDate}\n${updatedDate}category: "${safe(brief.category || "Planning")}"\ntargetKeyword: "${safe(brief.keyword)}"\nfeatured: ${featured}\nimage: "${originalImage}"\nimageAlt: "Premium lawn games arranged for a polished Triangle event"\nreadingTime: "${readingTime} minute read"\n---\n\n`;
await fs.writeFile(destination, `${frontmatter}${body}\n`);
console.log(path.relative(root, destination));
