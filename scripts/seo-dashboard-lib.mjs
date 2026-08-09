const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function normalizeKeyword(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function slugify(value = "") {
  return normalizeKeyword(value).replace(/\s+/g, "-");
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}

export function scoreQueue(seeds, keywordData = [], searchQueries = [], existingKeywords = []) {
  const keywordMap = new Map(keywordData.map((row) => [normalizeKeyword(row.keyword), row]));
  const queryMap = new Map(searchQueries.map((row) => [normalizeKeyword(row.keys?.[0] || row.query), row]));
  const existing = new Set(existingKeywords.map(normalizeKeyword));
  const volumes = keywordData.map((row) => Number(row.volume || row.vol || 0));
  const maxVolume = Math.max(10, ...volumes);

  return seeds.map((seed) => {
    const key = normalizeKeyword(seed.keyword);
    const ke = keywordMap.get(key) || {};
    const gsc = queryMap.get(key) || {};
    const volume = Number(ke.volume ?? ke.vol ?? 0);
    const position = Number(gsc.position || 0);
    const impressions = Number(gsc.impressions || 0);
    const competition = Number(ke.competition ?? 0.5);
    const demand = volume ? clamp(Math.log10(volume + 1) / Math.log10(maxVolume + 1)) * 5 : impressions ? 3 : 1;
    const proximity = position >= 4 && position <= 20 ? 5 : position > 0 && position < 40 ? 3 : impressions ? 2 : 1;
    const business = Number(seed.businessValue || 3);
    const fit = Number(seed.pageFit || 3);
    const competitionReverse = 1 + (1 - clamp(competition)) * 4;
    const effortReverse = 6 - Number(seed.effort || 3);
    const score = Math.round((demand / 5) * 25 + (proximity / 5) * 20 + (business / 5) * 25 + (fit / 5) * 15 + (competitionReverse / 5) * 10 + (effortReverse / 5) * 5);
    const hasExisting = existing.has(key);

    return {
      ...seed,
      id: slugify(seed.keyword),
      score,
      action: hasExisting ? "update" : seed.type === "landing-page" ? "landing-page" : "create",
      metrics: {
        monthlyVolume: volume || null,
        cpc: ke.cpc?.value ?? ke.cpc ?? null,
        paidCompetition: Number.isFinite(competition) ? competition : null,
        gscClicks: Number(gsc.clicks || 0),
        gscImpressions: impressions,
        gscPosition: position || null,
      },
      evidence: volume || impressions
        ? "Prioritized with live keyword or Search Console evidence."
        : "Seed opportunity; validate with live data before drafting.",
    };
  }).sort((a, b) => b.score - a.score);
}

const formatNumber = (value, digits = 0) => value == null ? "—" : Number(value).toLocaleString("en-US", {maximumFractionDigits: digits});
const delta = (current, previous) => previous ? ((current - previous) / previous) * 100 : null;

export function renderDashboard(data) {
  const organic = data.ga4?.current || {};
  const prior = data.ga4?.previous || {};
  const cards = [
    ["Organic sessions", organic.sessions, delta(organic.sessions, prior.sessions)],
    ["Organic users", organic.totalUsers, delta(organic.totalUsers, prior.totalUsers)],
    ["Organic page views", organic.screenPageViews, delta(organic.screenPageViews, prior.screenPageViews)],
    ["Organic leads", organic.leads, delta(organic.leads, prior.leads)],
    ["Search clicks", data.gsc?.totals?.clicks, delta(data.gsc?.totals?.clicks, data.gsc?.previousTotals?.clicks)],
    ["Search impressions", data.gsc?.totals?.impressions, delta(data.gsc?.totals?.impressions, data.gsc?.previousTotals?.impressions)],
  ];
  const statusRows = Object.entries(data.status).map(([name, state]) => `<li><span>${escapeHtml(name.toUpperCase())}</span><strong class="${state.ok ? "ok" : "warn"}">${state.ok ? "Connected" : escapeHtml(state.message || "Not configured")}</strong></li>`).join("");
  const cardRows = cards.map(([label, value, change]) => `<article class="metric"><small>${label}</small><b>${formatNumber(value)}</b><span class="${change == null ? "muted" : change >= 0 ? "up" : "down"}">${change == null ? "No comparison" : `${change >= 0 ? "+" : ""}${formatNumber(change, 1)}% vs prior period`}</span></article>`).join("");
  const queueRows = data.queue.map((item) => `<tr><td><span class="score">${item.score}</span></td><td><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.keyword)}</small></td><td><span class="pill">${escapeHtml(item.action)}</span></td><td>${escapeHtml(item.workflow?.status || "queued")}</td><td>${formatNumber(item.metrics.monthlyVolume)}</td><td>${formatNumber(item.metrics.gscImpressions)}</td><td>${item.metrics.gscPosition ? formatNumber(item.metrics.gscPosition, 1) : "—"}</td></tr>`).join("");
  const queryRows = (data.gsc?.queries || []).slice(0, 12).map((row) => `<tr><td><b>${escapeHtml(row.keys?.[0] || row.query || "")}</b></td><td>${formatNumber(row.clicks)}</td><td>${formatNumber(row.impressions)}</td><td>${formatNumber(row.position, 1)}</td></tr>`).join("") || `<tr><td colspan="4" class="empty">Connect Search Console to see live queries.</td></tr>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Popstar SEO Command Center</title><style>
  :root{--ink:#171717;--paper:#fffaf0;--yellow:#ffd438;--blue:#245bd7;--coral:#ff604f;--line:#171717;--muted:#6c675d}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.45 system-ui,-apple-system,sans-serif}header{padding:42px max(24px,calc((100vw - 1180px)/2));background:var(--yellow);border-bottom:4px solid var(--line)}header p{margin:.2rem 0;text-transform:uppercase;letter-spacing:.18em;font-weight:800}h1{font:900 clamp(2.5rem,7vw,5.5rem)/.9 Georgia,serif;margin:.35rem 0}main{max-width:1180px;margin:auto;padding:28px 24px 80px}h2{font:900 2rem/1 Georgia,serif;margin:42px 0 18px}.status{display:grid;grid-template-columns:repeat(3,1fr);padding:0;list-style:none;border:3px solid var(--line);background:#fff}.status li{padding:14px 18px;display:flex;justify-content:space-between;gap:10px}.status li+li{border-left:2px solid var(--line)}.status span,.metric small,td small{display:block;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem;font-weight:800}.ok{color:#137333}.warn{color:#a14500}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.metric{border:3px solid var(--line);box-shadow:6px 6px 0 var(--line);padding:20px;background:#fff}.metric b{display:block;font:900 2.6rem/1 Georgia,serif;margin:12px 0}.up{color:#137333}.down{color:#b3261e}.muted,.empty{color:var(--muted)}.table-wrap{overflow:auto;border:3px solid var(--line);background:#fff}table{width:100%;border-collapse:collapse;min-width:720px}th,td{text-align:left;padding:13px;border-bottom:1px solid #d8d1c3}th{background:var(--blue);color:#fff;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem}.score{display:grid;place-items:center;width:42px;height:42px;background:var(--yellow);border:2px solid var(--line);border-radius:50%;font-weight:900}.pill{display:inline-block;background:#e8eeff;border:1px solid var(--blue);padding:3px 8px;border-radius:99px;font-size:.8rem}.note{padding:16px 18px;background:#fff0c2;border-left:6px solid var(--coral)}footer{margin-top:50px;color:var(--muted);font-size:.85rem}@media(max-width:760px){.metrics{grid-template-columns:1fr 1fr}.status{grid-template-columns:1fr}.status li+li{border-left:0;border-top:2px solid var(--line)}}@media(max-width:480px){.metrics{grid-template-columns:1fr}}
  </style></head><body><header><p>Popstar Lawn Games</p><h1>SEO Command Center</h1><p>Updated ${escapeHtml(data.generatedAt)}</p></header><main><ul class="status">${statusRows}</ul><section class="metrics">${cardRows}</section><h2>Content queue</h2><p class="note">The priority score combines demand, ranking proximity, business value, page fit, paid-ad competition, and effort. It is a planning signal—not a traffic forecast. Drafts require review before publishing.</p><div class="table-wrap"><table><thead><tr><th>Score</th><th>Opportunity</th><th>Action</th><th>Status</th><th>Monthly volume</th><th>GSC impressions</th><th>Position</th></tr></thead><tbody>${queueRows}</tbody></table></div><h2>Search opportunities</h2><div class="table-wrap"><table><thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th><th>Position</th></tr></thead><tbody>${queryRows}</tbody></table></div><footer>Data windows intentionally exclude the newest days because Search Console reporting is delayed. Keywords Everywhere competition is paid-ad competition, not organic SEO difficulty.</footer></main></body></html>`;
}

export function renderSummary(data) {
  const connected = Object.entries(data.status).map(([key, value]) => `- ${key.toUpperCase()}: ${value.ok ? "connected" : value.message}`).join("\n");
  const queue = data.queue.slice(0, 5).map((item, index) => `${index + 1}. **${item.title}** — ${item.score}/100, ${item.action}`).join("\n");
  return `# Popstar SEO nightly report\n\nGenerated ${data.generatedAt}\n\n## Connections\n\n${connected}\n\n## Top content opportunities\n\n${queue}\n\n> Priority scores guide editorial review; they are not traffic forecasts. No content was auto-published.\n`;
}
