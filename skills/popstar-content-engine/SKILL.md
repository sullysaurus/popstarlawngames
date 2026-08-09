---
name: popstar-content-engine
description: Create and update Popstar Lawn Games SEO articles locally from the repository content queue without calling the OpenAI API. Use when asked to draft the next queued post, write a specific queued guide, refresh an existing article, inspect editorial status, or prepare Popstar SEO content for review and publishing.
---

# Popstar Content Engine

Use Codex itself to author the draft. Do not run `npm run seo:draft`, call the OpenAI API, or require `OPENAI_API_KEY`.

## Prepare the brief

1. Resolve the repository root with `git rev-parse --show-toplevel` and work there.
2. Run `npm run content:queue` to inspect priorities and statuses.
3. Run `npm run content:brief -- <queue-id>` for a requested item or `npm run content:brief -- next` for the highest eligible item.
4. Read `reports/seo-dashboard/local-brief.json`, `src/content.config.ts`, the homepage package copy, and the most relevant existing article.
5. Treat conversions and Search Console evidence as stronger than search volume. Treat Keywords Everywhere competition as paid-ad competition, not organic difficulty.

If the brief recommends a landing page, stop and explain that it needs a designed route rather than disguising it as a blog post.

## Research and draft

- Confirm time-sensitive or local factual claims with current primary sources before using them.
- Answer the target query directly near the beginning.
- Write for Raleigh, Durham, Chapel Hill, and Triangle event planners without inventing venue relationships or availability.
- Preserve these verified offers unless the site has changed: Social Set, 3 games, $299; Celebration Set, 5 games, $449; Headliner Set, 8 games, $699; event-day rental up to 8 hours; no guest minimum; hosted custom events from $2,500.
- Never invent statistics, testimonials, policies, inventory, service-area promises, or competitive claims.
- Avoid keyword stuffing, padded introductions, generic AI phrasing, fake quotations, and excessive headings.
- Use `/assets/celebration-set-reference.jpg` for wedding topics and `/assets/social-set-reference.jpg` otherwise, unless a better existing asset is clearly appropriate.
- Link naturally to `/#packages`, `/#availability`, and one or two relevant existing guides.
- Aim for the length the question earns. Prefer a useful 900-word guide over a padded 1,500-word guide.

For a new article, create `src/content/blog/<descriptive-slug>.md` with every field required by `src/content.config.ts`. For an update, locate the exact `targetKeyword`, preserve its original `publishedDate`, add or refresh `updatedDate`, and improve that file rather than creating a competing URL.

## Review gate

Before considering the draft ready:

1. Check that the title, description, H2s, opening answer, and body satisfy the same search intent.
2. Check prices and operational claims against the current site.
3. Check internal links and ensure the call to action fits the article.
4. Run `npm run build` and `npm run test:seo`.
5. Run `npm run content:mark -- <queue-id> drafted <article-path>` only after the article and checks succeed.
6. Show the user the article path, target keyword, evidence used, and anything that needs human verification.

Do not publish, merge, or push unless the user asks. When asked to push, include both the article and `seo/content-state.json` in the commit.
