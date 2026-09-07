#!/usr/bin/env node
// A tiny stand-in for Supabase Auth + PostgREST so the UI can be exercised
// without network access to the real project. It serves fixed fixtures with
// basic PostgREST filter support. Not used in production.
//
//   node scripts/mock-supabase.mjs            # listens on :54321
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run dev
//
// Sign in by setting the cookie printed at startup (see scripts/qa-screenshots.mjs).

import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 54321);
const TZ = "America/New_York";
const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const daysAgoKey = (d) => {
  const dt = new Date(now.getTime() - d * 86400 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(dt);
};

export const ME = "11111111-1111-4111-8111-111111111111";
const TEAMMATE = "22222222-2222-4222-8222-222222222222";
const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const user = {
  id: ME,
  aud: "authenticated",
  role: "authenticated",
  email: "darby@example.com",
  email_confirmed_at: hoursAgo(500),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: hoursAgo(500),
  updated_at: hoursAgo(1),
};

const b64url = (s) => Buffer.from(s).toString("base64url");
const jwt = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
  JSON.stringify({
    sub: ME,
    email: user.email,
    role: "authenticated",
    aud: "authenticated",
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(now.getTime() / 1000) + 365 * 86400,
    session_id: randomUUID(),
  }),
)}.mock`;

export const session = {
  access_token: jwt,
  refresh_token: "mock-refresh",
  token_type: "bearer",
  expires_in: 365 * 86400,
  expires_at: Math.floor(now.getTime() / 1000) + 365 * 86400,
  user,
};

export const COOKIE_NAME = "sb-localhost-auth-token";
export const COOKIE_VALUE = "base64-" + b64url(JSON.stringify(session));

// ---------- fixtures ----------

const organizations = [
  { id: ORG, name: "Rivera Electric", timezone: TZ, currency: "USD", plan: "free", seat_limit: 2, created_at: hoursAgo(500), updated_at: hoursAgo(1) },
];

const memberships = [
  { id: "m-owner", organization_id: ORG, user_id: ME, role: "owner", invited_email: null, invite_token: randomUUID(), accepted_at: hoursAgo(500), removed_at: null, created_at: hoursAgo(500), updated_at: hoursAgo(500), organizations: organizations[0] },
  { id: "m-member", organization_id: ORG, user_id: TEAMMATE, role: "member", invited_email: "sam@example.com", invite_token: randomUUID(), accepted_at: hoursAgo(300), removed_at: null, created_at: hoursAgo(310), updated_at: hoursAgo(300), organizations: organizations[0] },
];

const clients = [
  { id: "c-1", organization_id: ORG, name: "Hernandez family", email: null, phone: null, notes: null, created_at: hoursAgo(400), updated_at: hoursAgo(400) },
  { id: "c-2", organization_id: ORG, name: "Blue Fern Café", email: null, phone: null, notes: null, created_at: hoursAgo(300), updated_at: hoursAgo(300) },
];

const jobsBase = [
  { id: "j-1", organization_id: ORG, client_id: "c-1", name: "Kitchen remodel", billing_type: "hourly", hourly_rate_cents: 7500, fixed_price_cents: null, estimated_minutes: 20 * 60, status: "active", notes: "Panel upgrade first, then outlets.", created_at: hoursAgo(400), updated_at: hoursAgo(2) },
  { id: "j-2", organization_id: ORG, client_id: "c-2", name: "Patio lighting", billing_type: "fixed", hourly_rate_cents: null, fixed_price_cents: 185000, estimated_minutes: null, status: "active", notes: null, created_at: hoursAgo(300), updated_at: hoursAgo(30) },
  { id: "j-3", organization_id: ORG, client_id: null, name: "Garage subpanel", billing_type: "hourly", hourly_rate_cents: 8000, fixed_price_cents: null, estimated_minutes: null, status: "archived", notes: null, created_at: hoursAgo(900), updated_at: hoursAgo(200) },
];
const jobs = jobsBase.map((j) => ({ ...j, clients: clients.find((c) => c.id === j.client_id) ?? null }));
const jobRef = (id) => jobs.find((j) => j.id === id);

const entry = (id, jobId, userId, startH, durH, notes, source = "timer") => {
  const started = new Date(now.getTime() - startH * 3600 * 1000);
  const stopped = durH === null ? null : new Date(started.getTime() + durH * 3600 * 1000);
  return {
    id, organization_id: ORG, job_id: jobId, user_id: userId,
    started_at: started.toISOString(), stopped_at: stopped?.toISOString() ?? null,
    duration_seconds: durH === null ? null : Math.round(durH * 3600), notes, source,
    created_at: started.toISOString(), updated_at: (stopped ?? started).toISOString(), jobs: jobRef(jobId),
  };
};

const time_entries = [
  entry("t-running", "j-1", ME, 0.7, null, null),
  entry("t-1", "j-1", ME, 5, 2.25, "Ran new circuit to island"),
  entry("t-2", "j-2", ME, 9, 1.5, null, "manual"),
  entry("t-3", "j-1", TEAMMATE, 6, 3, "Pulled wire"),
  entry("t-4", "j-1", ME, 30, 4.5, null),
  entry("t-5", "j-2", TEAMMATE, 32, 2, "Trenching"),
  entry("t-6", "j-3", ME, 24 * 20, 6, "Old job"),
];

const expenses = [
  { id: "x-1", organization_id: ORG, job_id: "j-1", user_id: ME, amount_cents: 31200, spent_on: daysAgoKey(0), category: "materials", description: "Wire, boxes, breakers", receipt_path: null, created_at: hoursAgo(3), updated_at: hoursAgo(3) },
  { id: "x-2", organization_id: ORG, job_id: null, user_id: ME, amount_cents: 6450, spent_on: daysAgoKey(1), category: "fuel", description: null, receipt_path: null, created_at: hoursAgo(28), updated_at: hoursAgo(28) },
  { id: "x-3", organization_id: ORG, job_id: "j-2", user_id: TEAMMATE, amount_cents: 42000, spent_on: daysAgoKey(1), category: "subcontractor", description: "Trenching crew", receipt_path: null, created_at: hoursAgo(30), updated_at: hoursAgo(30) },
].map((x) => ({ ...x, jobs: x.job_id ? jobRef(x.job_id) : null }));

const audit_events = [
  {
    id: "a-1", organization_id: ORG, actor_user_id: ME, table_name: "time_entries", record_id: "t-1", action: "update",
    before: { id: "t-1", job_id: "j-1", started_at: time_entries[1].started_at, stopped_at: new Date(new Date(time_entries[1].started_at).getTime() + 2 * 3600 * 1000).toISOString(), notes: null },
    after: { id: "t-1", job_id: "j-1", started_at: time_entries[1].started_at, stopped_at: time_entries[1].stopped_at, notes: "Ran new circuit to island" },
    created_at: hoursAgo(2),
  },
  {
    id: "a-2", organization_id: ORG, actor_user_id: ME, table_name: "expenses", record_id: "x-1", action: "update",
    before: { id: "x-1", amount_cents: 28000, spent_on: daysAgoKey(0), job_id: "j-1", category: "materials", description: "Wire and boxes" },
    after: { id: "x-1", amount_cents: 31200, spent_on: daysAgoKey(0), job_id: "j-1", category: "materials", description: "Wire, boxes, breakers" },
    created_at: hoursAgo(1),
  },
];

const tables = { organizations, memberships, clients, jobs, time_entries, expenses, audit_events };

// MOCK_EMPTY=1 keeps only the org and owner, for exercising empty states.
if (process.env.MOCK_EMPTY) {
  memberships.splice(1);
  for (const t of ["clients", "jobs", "time_entries", "expenses", "audit_events"]) tables[t].length = 0;
}

// ---------- PostgREST-ish filtering ----------

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function matches(row, col, expr) {
  let negate = false;
  if (expr.startsWith("not.")) { negate = true; expr = expr.slice(4); }
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1);
  const v = row[col];
  let result;
  switch (op) {
    case "eq": result = String(v) === raw; break;
    case "neq": result = String(v) !== raw; break;
    case "is": result = raw === "null" ? v === null || v === undefined : String(v) === raw; break;
    case "gt": result = v !== null && String(v) > raw; break;
    case "gte": result = v !== null && String(v) >= raw; break;
    case "lt": result = v !== null && String(v) < raw; break;
    case "lte": result = v !== null && String(v) <= raw; break;
    case "in": result = raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(v)); break;
    case "ilike": result = typeof v === "string" && new RegExp("^" + raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/%/g, ".*") + "$", "i").test(v); break;
    default: result = true;
  }
  return negate ? !result : result;
}

function query(table, sp) {
  let rows = [...(tables[table] ?? [])];
  for (const [k, v] of sp.entries()) {
    if (RESERVED.has(k)) continue;
    rows = rows.filter((r) => matches(r, k, v));
  }
  const order = sp.get("order");
  if (order) {
    const keys = order.split(",").map((o) => { const [c, d] = o.split("."); return [c, d === "desc" ? -1 : 1]; });
    rows.sort((a, b) => { for (const [c, d] of keys) { if (a[c] < b[c]) return -d; if (a[c] > b[c]) return d; } return 0; });
  }
  const limit = Number(sp.get("limit"));
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

// ---------- server ----------

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => { try { resolve(s ? JSON.parse(s) : null); } catch { resolve(null); } });
});

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  if (process.env.MOCK_LOG) console.log(req.method, req.url);

  // Auth
  if (p === "/auth/v1/user") return json(res, 200, user);
  if (p === "/auth/v1/token") return json(res, 200, session);
  if (p === "/auth/v1/logout") { res.writeHead(204); return res.end(); }
  if (p === "/auth/v1/signup" || p === "/auth/v1/otp" || p === "/auth/v1/verify") return json(res, 200, { user, session: null });
  if (p.startsWith("/auth/v1/")) return json(res, 200, {});

  // RPC
  if (p.startsWith("/rest/v1/rpc/")) {
    const fn = p.slice("/rest/v1/rpc/".length);
    if (fn === "invite_preview") return json(res, 200, [{ organization_name: "Rivera Electric", invited_email: "sam@example.com", state: "pending" }]);
    if (fn === "create_organization" || fn === "accept_invite") return json(res, 200, ORG);
    return json(res, 200, null);
  }

  if (p.startsWith("/rest/v1/")) {
    const table = p.slice("/rest/v1/".length);
    const accept = req.headers.accept ?? "";
    const wantsObject = accept.includes("vnd.pgrst.object");
    const prefer = req.headers.prefer ?? "";

    if (req.method === "GET" || req.method === "HEAD") {
      const rows = query(table, url.searchParams);
      const headers = prefer.includes("count=") ? { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } : {};
      if (req.method === "HEAD") { res.writeHead(200, { "Content-Type": "application/json", ...headers }); return res.end(); }
      if (wantsObject) {
        if (rows.length !== 1) return json(res, 406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" });
        return json(res, 200, rows[0], headers);
      }
      return json(res, 200, rows, headers);
    }

    const body = await readBody(req);
    if (req.method === "POST") {
      const rows = (Array.isArray(body) ? body : [body ?? {}]).map((r) => ({ id: randomUUID(), created_at: now.toISOString(), updated_at: now.toISOString(), ...r }));
      tables[table]?.push(...rows);
      return json(res, 201, wantsObject ? rows[0] : rows);
    }
    if (req.method === "PATCH") {
      const rows = query(table, url.searchParams).map((r) => Object.assign(r, body));
      return json(res, 200, wantsObject ? rows[0] ?? null : rows);
    }
    if (req.method === "DELETE") {
      const rows = query(table, url.searchParams);
      if (tables[table]) tables[table] = tables[table].filter((r) => !rows.includes(r));
      return json(res, 200, rows);
    }
  }

  json(res, 404, { message: "not found" });
}).listen(PORT, () => {
  console.log(`mock supabase on http://localhost:${PORT}`);
  console.log(`cookie ${COOKIE_NAME}=${COOKIE_VALUE.slice(0, 40)}…`);
});
