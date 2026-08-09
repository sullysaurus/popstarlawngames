# Popstar SEO command center setup

The system has two guarded workflows:

1. **Nightly SEO dashboard** measures organic performance, enriches a limited keyword set, and creates a prioritized content queue.
2. **Generate reviewed SEO draft** turns an approved queue issue into an Astro Markdown draft and opens a pull request.

No workflow merges a pull request or publishes content. Netlify only publishes a draft after a human merges it into `main`. Drafting uses the repository's `$popstar-content-engine` skill and does not require an OpenAI API key.

## Website dashboard

The private dashboard route is `https://popstarlawngames.com/seo-dashboard/`. Its Astro page contains no analytics data. A Netlify Function authenticates requests and reads the latest nightly report from Netlify Blobs, whose data persists across deploys.

Add these environment variables in **Netlify → Project configuration → Environment variables**. Do not put their values in `netlify.toml` or the repository:

| Name | Purpose |
| --- | --- |
| `SEO_DASHBOARD_USER` | Login username; defaults to `danny` |
| `SEO_DASHBOARD_PASSWORD` | A unique dashboard password |
| `SEO_DASHBOARD_INGEST_TOKEN` | A separate long random token used only by GitHub to upload reports |

Add the same `SEO_DASHBOARD_INGEST_TOKEN` value as a GitHub Actions secret. The non-secret GitHub variable `SEO_DASHBOARD_ENDPOINT` should be `https://popstarlawngames.com/api/seo-dashboard`.

After configuring Netlify variables, trigger a new deploy so Functions receive them. Then manually run **Nightly SEO dashboard** once from GitHub Actions. The report will appear at the protected website route.

## 1. Connect Google Analytics and Search Console

Create one Google Cloud service account and enable both the **Google Analytics Data API** and the **Google Search Console API** in that project. Download its JSON key once.

Grant the service account email access in both products:

- GA4: **Admin → Property access management → Add users → Viewer**
- Search Console: **Settings → Users and permissions → Add user → Full**

The GA4 measurement ID already installed on the site (`G-RKLN3545ZX`) is not the property ID. Find the numeric property ID under **GA4 Admin → Property settings**.

In GitHub, add these under **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `GOOGLE_SERVICE_ACCOUNT_JSON` | The complete downloaded JSON key |
| Variable | `GA4_PROPERTY_ID` | Numeric GA4 property ID, such as `123456789` |
| Variable | `GSC_PROPERTY` | `sc-domain:popstarlawngames.com` |

Treat the JSON key like a password. Never commit it, paste it into an issue, or expose it in a public artifact.

## 2. Connect Keywords Everywhere

Copy the API key from the Keywords Everywhere account and add it as the GitHub Actions secret `KEYWORDS_EVERYWHERE_API_KEY`.

Add `KEYWORDS_EVERYWHERE_DAILY_LIMIT` as a repository variable. The default is `20`, or at most 20 keyword credits per nightly run. Increase it only after reviewing credit usage. The dashboard correctly labels the provider's competition value as **paid-ad competition**, not organic keyword difficulty.

Edit `seo/keyword-seeds.json` to change the commercial and editorial opportunities that receive recurring research. Existing blog target keywords are automatically marked as updates instead of duplicate articles.

## 3. Turn on the editorial queue

By default the nightly run creates the dashboard but does not create GitHub issues. After inspecting the first report, set:

| Variable | Suggested value | Purpose |
| --- | --- | --- |
| `SEO_CREATE_QUEUE_ISSUES` | `true` | Creates issues for high-scoring, not-yet-queued opportunities |
| `SEO_QUEUE_MAX_NEW` | `3` | Maximum new briefs per nightly run |

The workflow creates `content-queue` and `seo` labels. It uses a hidden keyword marker to avoid duplicate issues.

To generate a new guide or update an existing article, review and edit the brief, run the local brief command shown in the issue, and invoke `$popstar-content-engine` in Codex. Transactional landing-page opportunities stay in the queue for a designed page implementation; the engine intentionally refuses to turn them into mismatched blog posts.

## 4. Generate content locally without an OpenAI API bill

Run:

```sh
npm run content:queue
npm run content:brief -- next
```

Then ask Codex: `Use $popstar-content-engine to draft the next queued article locally.` The skill reads the generated brief, authors or updates Astro Markdown directly, runs the editorial/build checks, and records the item as drafted in `seo/content-state.json`. It never calls the OpenAI API and never publishes without review.

To import Keywords Everywhere research without its API, copy `seo/keywords-everywhere-import.example.json` to the ignored file `seo/keywords-everywhere-import.json` and replace the sample rows with exported keyword data. Local imports take precedence over the API.

Before merging every locally generated draft, verify:

- prices, service area, package details, and local facts;
- that the article answers the query instead of padding it;
- its title, description, headings, image, and internal links;
- that it does not compete with an existing page targeting the same intent;
- its conversion path to packages and the availability form.

## 5. Use the downloadable dashboard

The job runs nightly at 08:23 UTC and can also be started from the Actions tab. Open a completed **Nightly SEO dashboard** run and download the `popstar-seo-dashboard-*` artifact. Open `index.html` locally.

Detailed reports upload automatically only for private repositories. If this repository is public and you deliberately accept exposing traffic/query data to anyone who can access Actions artifacts, set `SEO_ALLOW_PUBLIC_REPORTS=true`. The workflow summary itself never prints detailed metrics.

The report includes:

- current and prior-period organic sessions, users, views, and `generate_lead` events;
- Search Console clicks, impressions, queries, positions, and pages with a three-day reporting buffer;
- Keywords Everywhere volume, CPC, trend payload, and paid-ad competition for a capped keyword set;
- a 0–100 editorial priority score based on demand, ranking proximity, business value, page fit, competition, and effort.

The score is a prioritization aid, not a traffic or revenue forecast. Conversion and Search Console evidence should override raw search volume when they disagree.

## Local smoke test

The fixture test does not call any paid or external API:

```sh
npm run test:seo
```

To generate a local live report, export the same environment variables and run:

```sh
npm run seo:dashboard
```

If a connector is missing or denied, the run still produces a dashboard with a visible setup error for that source. It never substitutes synthetic metrics for missing live data.
