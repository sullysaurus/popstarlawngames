import { timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status,
  headers: {"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers},
});

function matches(left = "", right = "") {
  const first = Buffer.from(left);
  const second = Buffer.from(right);
  return first.length === second.length && timingSafeEqual(first, second);
}

function basicCredentials(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    return separator === -1 ? null : [decoded.slice(0, separator), decoded.slice(separator + 1)];
  } catch { return null; }
}

export default async (request) => {
  const store = getStore({name: "popstar-seo-dashboard", consistency: "strong"});

  if (request.method === "PUT") {
    const expectedToken = process.env.SEO_DASHBOARD_INGEST_TOKEN;
    const suppliedToken = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!expectedToken) return json({error: "Dashboard ingestion is not configured"}, 503);
    if (!matches(suppliedToken, expectedToken)) return json({error: "Unauthorized"}, 401);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 1_500_000) return json({error: "Report is too large"}, 413);
    let report;
    try { report = await request.json(); } catch { return json({error: "Invalid JSON"}, 400); }
    if (!report?.generatedAt || !Array.isArray(report?.queue) || !report?.status) return json({error: "Invalid dashboard report"}, 422);
    await store.setJSON("latest", report, {metadata: {generatedAt: report.generatedAt}});
    return json({ok: true, generatedAt: report.generatedAt});
  }

  if (request.method !== "GET") return json({error: "Method not allowed"}, 405, {Allow: "GET, PUT"});
  const expectedUser = process.env.SEO_DASHBOARD_USER || "danny";
  const expectedPassword = process.env.SEO_DASHBOARD_PASSWORD;
  if (!expectedPassword) return json({error: "Dashboard access is not configured"}, 503);
  const credentials = basicCredentials(request);
  if (!credentials || !matches(credentials[0], expectedUser) || !matches(credentials[1], expectedPassword)) {
    return json({error: "Unauthorized"}, 401, {"WWW-Authenticate": 'Basic realm="Popstar SEO", charset="UTF-8"'});
  }
  const report = await store.get("latest", {type: "json"});
  if (!report) return json({error: "No report has been uploaded yet"}, 404);
  return json(report);
};

export const config = {path: "/api/seo-dashboard"};
