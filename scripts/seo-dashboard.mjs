import fs from "node:fs/promises";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { renderDashboard, renderSummary, scoreQueue } from "./seo-dashboard-lib.mjs";

const root = path.resolve(import.meta.dirname, "..");
const args = new Map(process.argv.slice(2).reduce((pairs, value, index, all) => value.startsWith("--") ? [...pairs, [value, all[index + 1]?.startsWith("--") ? true : all[index + 1] ?? true]] : pairs, []));
const outputDir = path.resolve(root, args.get("--output") === true || !args.get("--output") ? "reports/seo-dashboard" : args.get("--output"));
const fixturePath = args.get("--fixture");

const iso = (date) => date.toISOString().slice(0, 10);
const daysAgo = (days) => new Date(Date.now() - days * 86400000);
const periods = {
  gaCurrent: {startDate: iso(daysAgo(28)), endDate: iso(daysAgo(1))},
  gaPrevious: {startDate: iso(daysAgo(56)), endDate: iso(daysAgo(29))},
  gscCurrent: {startDate: iso(daysAgo(30)), endDate: iso(daysAgo(3))},
  gscPrevious: {startDate: iso(daysAgo(58)), endDate: iso(daysAgo(31))},
};

async function readServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return JSON.parse(await fs.readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  return null;
}

async function googleToken(credentials) {
  const auth = new GoogleAuth({credentials, scopes: ["https://www.googleapis.com/auth/analytics.readonly", "https://www.googleapis.com/auth/webmasters.readonly"]});
  return auth.getAccessToken();
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

function metricMap(report) {
  const result = {};
  for (const metric of report?.rows?.[0]?.metricValues || []) {
    const index = report.rows[0].metricValues.indexOf(metric);
    const name = report.metricHeaders?.[index]?.name;
    if (name) result[name] = Number(metric.value || 0);
  }
  return result;
}

function rowsFromGa(report) {
  return (report.rows || []).map((row) => ({
    dimensions: Object.fromEntries((row.dimensionValues || []).map((value, index) => [report.dimensionHeaders?.[index]?.name, value.value])),
    metrics: Object.fromEntries((row.metricValues || []).map((value, index) => [report.metricHeaders?.[index]?.name, Number(value.value || 0)])),
  }));
}

async function gaReport(property, token, body) {
  return apiJson(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"}, body: JSON.stringify(body),
  });
}

async function fetchGa4(token) {
  const rawProperty = process.env.GA4_PROPERTY_ID;
  if (!rawProperty) throw new Error("GA4_PROPERTY_ID is not configured");
  const property = rawProperty.replace(/^properties\//, "");
  const organicFilter = {filter: {fieldName: "sessionDefaultChannelGroup", stringFilter: {matchType: "EXACT", value: "Organic Search"}}};
  const metrics = ["sessions", "totalUsers", "screenPageViews", "engagementRate"].map((name) => ({name}));
  const leadFilter = {andGroup: {expressions: [organicFilter, {filter: {fieldName: "eventName", stringFilter: {matchType: "EXACT", value: "generate_lead"}}}]}};
  const [currentOverview, previousOverview, landingPages, currentLeads, previousLeads] = await Promise.all([
    gaReport(property, token, {dateRanges: [periods.gaCurrent], metrics, dimensionFilter: organicFilter}),
    gaReport(property, token, {dateRanges: [periods.gaPrevious], metrics, dimensionFilter: organicFilter}),
    gaReport(property, token, {dateRanges: [periods.gaCurrent], dimensions: [{name: "landingPagePlusQueryString"}], metrics: [{name: "sessions"}, {name: "totalUsers"}, {name: "keyEvents"}], dimensionFilter: organicFilter, orderBys: [{metric: {metricName: "sessions"}, desc: true}], limit: 25}),
    gaReport(property, token, {dateRanges: [periods.gaCurrent], metrics: [{name: "eventCount"}], dimensionFilter: leadFilter}),
    gaReport(property, token, {dateRanges: [periods.gaPrevious], metrics: [{name: "eventCount"}], dimensionFilter: leadFilter}),
  ]);
  const current = metricMap(currentOverview);
  const previous = metricMap(previousOverview);
  current.leads = Number(currentLeads.rows?.[0]?.metricValues?.[0]?.value || 0);
  previous.leads = Number(previousLeads.rows?.[0]?.metricValues?.[0]?.value || 0);
  return {current, previous, landingPages: rowsFromGa(landingPages), property};
}

async function gscReport(property, token, dateRange, dimensions = []) {
  return apiJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
    body: JSON.stringify({...dateRange, dimensions, rowLimit: 25000, dataState: "final"}),
  });
}

const totalSearchRows = (rows = []) => rows.reduce((total, row) => ({clicks: total.clicks + Number(row.clicks || 0), impressions: total.impressions + Number(row.impressions || 0)}), {clicks: 0, impressions: 0});

async function fetchGsc(token) {
  const property = process.env.GSC_PROPERTY || "sc-domain:popstarlawngames.com";
  const [queries, pages, daily, priorDaily] = await Promise.all([
    gscReport(property, token, periods.gscCurrent, ["query"]),
    gscReport(property, token, periods.gscCurrent, ["page"]),
    gscReport(property, token, periods.gscCurrent, ["date"]),
    gscReport(property, token, periods.gscPrevious, ["date"]),
  ]);
  return {property, queries: queries.rows || [], pages: pages.rows || [], daily: daily.rows || [], totals: totalSearchRows(daily.rows), previousTotals: totalSearchRows(priorDaily.rows)};
}

async function fetchKeywords(keywords) {
  if (!process.env.KEYWORDS_EVERYWHERE_API_KEY) throw new Error("KEYWORDS_EVERYWHERE_API_KEY is not configured");
  const requestedLimit = Number(process.env.KEYWORDS_EVERYWHERE_DAILY_LIMIT || 20);
  const limit = Math.max(1, Math.min(100, requestedLimit));
  const form = new URLSearchParams({dataSource: "gkp", country: "us", currency: "usd"});
  keywords.slice(0, limit).forEach((keyword) => form.append("kw[]", keyword));
  const payload = await apiJson("https://api.keywordseverywhere.com/v1/get_keyword_data", {method: "POST", headers: {Authorization: `Bearer ${process.env.KEYWORDS_EVERYWHERE_API_KEY}`, "Content-Type": "application/x-www-form-urlencoded"}, body: form});
  return (payload.data || []).map((row) => ({keyword: row.keyword, volume: Number(row.vol || 0), cpc: row.cpc, competition: Number(row.competition || 0), trend: row.trend || []}));
}

async function existingTargetKeywords() {
  const directory = path.join(root, "src/content/blog");
  const files = await fs.readdir(directory);
  const contents = await Promise.all(files.filter((file) => /\.mdx?$/.test(file)).map((file) => fs.readFile(path.join(directory, file), "utf8")));
  return contents.map((content) => content.match(/^targetKeyword:\s*["']?([^\n"']+)/m)?.[1]?.trim()).filter(Boolean);
}

async function buildReport() {
  if (fixturePath && fixturePath !== true) {
    const fixture = JSON.parse(await fs.readFile(path.resolve(root, fixturePath), "utf8"));
    return {...fixture, generatedAt: new Date().toISOString(), queue: scoreQueue(fixture.seeds, fixture.keywords, fixture.gsc.queries, fixture.existingKeywords)};
  }

  const seeds = JSON.parse(await fs.readFile(path.join(root, "seo/keyword-seeds.json"), "utf8"));
  const status = {ga4: {ok: false}, gsc: {ok: false}, keywords: {ok: false}};
  let ga4 = {current: {}, previous: {}, landingPages: []};
  let gsc = {queries: [], pages: [], daily: [], totals: {}, previousTotals: {}};
  let keywords = [];
  let token;
  try {
    const credentials = await readServiceAccount();
    if (!credentials) throw new Error("Google service account is not configured");
    token = await googleToken(credentials);
  } catch (error) {
    status.ga4.message = status.gsc.message = error.message;
  }
  if (token) {
    try { ga4 = await fetchGa4(token); status.ga4 = {ok: true}; } catch (error) { status.ga4.message = error.message; }
    try { gsc = await fetchGsc(token); status.gsc = {ok: true}; } catch (error) { status.gsc.message = error.message; }
  }
  try {
    const candidates = [...new Set([...gsc.queries.map((row) => row.keys?.[0]), ...seeds.map((seed) => seed.keyword)].filter(Boolean))];
    keywords = await fetchKeywords(candidates);
    status.keywords = {ok: true};
  } catch (error) { status.keywords.message = error.message; }

  const existingKeywords = await existingTargetKeywords();
  return {generatedAt: new Date().toISOString(), periods, status, ga4, gsc, keywords, queue: scoreQueue(seeds, keywords, gsc.queries, existingKeywords)};
}

const data = await buildReport();
await fs.mkdir(outputDir, {recursive: true});
await Promise.all([
  fs.writeFile(path.join(outputDir, "data.json"), JSON.stringify(data, null, 2)),
  fs.writeFile(path.join(outputDir, "content-queue.json"), JSON.stringify(data.queue, null, 2)),
  fs.writeFile(path.join(outputDir, "index.html"), renderDashboard(data)),
  fs.writeFile(path.join(outputDir, "summary.md"), renderSummary(data)),
]);
console.log(`SEO dashboard written to ${outputDir}`);
for (const [name, state] of Object.entries(data.status)) console.log(`${name}: ${state.ok ? "connected" : state.message}`);
