import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./src/models/user.model.js";
import Record from "./src/models/record.model.js";
import app from "./src/app.js";

const BASE_URL = "http://localhost:4570";
let server;

// ── Test users ──
const testUsers = {
  admin:   { name: "TestAdmin",   email: "fulltest-admin@test.com",   password: "Pass@1234", role: "admin" },
  analyst: { name: "TestAnalyst", email: "fulltest-analyst@test.com", password: "Pass@1234", role: "analyst" },
  viewer:  { name: "TestViewer",  email: "fulltest-viewer@test.com",  password: "Pass@1234", role: "viewer" },
};

const tokens = {};
const userIds = {};
let testRecordId = null;

// ── HTTP helper ──
async function req(method, path, { token, body, query } = {}) {
  let url = `${BASE_URL}${path}`;
  if (query) url += "?" + new URLSearchParams(query).toString();

  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

// ── Results collector ──
const results = [];

function log(suite, role, method, route, expectedStatus, actualStatus, note = "") {
  results.push({
    suite, role, method, route,
    expected: expectedStatus,
    actual: actualStatus,
    pass: Array.isArray(expectedStatus)
      ? expectedStatus.includes(actualStatus)
      : actualStatus === expectedStatus,
    note,
  });
}

// ══════════════════════════════════════════════════════
//  SETUP & TEARDOWN
// ══════════════════════════════════════════════════════

const testEmails = [
  ...Object.values(testUsers).map(u => u.email),
  "tempuser-fulltest@test.com",
  "deleteme-fulltest@test.com",
];

async function setup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✔ DB connected");
  server = app.listen(4570, () => console.log("✔ Test server on :4570\n"));

  await User.deleteMany({ email: { $in: testEmails } });
  await Record.deleteMany({ notes: { $regex: /^fulltest-/ } });

  for (const [role, u] of Object.entries(testUsers)) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await User.create({ name: u.name, email: u.email, password: hashed, role: u.role });
    userIds[role] = user._id.toString();
    tokens[role] = jwt.sign({ id: user._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
  }
  console.log("✔ Test users seeded\n");
}

async function teardown() {
  await User.deleteMany({ email: { $in: testEmails } });
  await Record.deleteMany({ notes: { $regex: /^fulltest-/ } });
  server.close();
  await mongoose.disconnect();
}

// ══════════════════════════════════════════════════════
//  1. VALIDATION TESTS
// ══════════════════════════════════════════════════════

async function testValidation() {
  console.log("═══ VALIDATION TESTS ═══\n");

  // ── Register validation ──
  console.log("─── Register Validation ───");

  // Missing all fields
  const v1 = await req("POST", "/api/auth/register", { body: {} });
  log("validation", "public", "POST", "/api/auth/register", 400, v1.status, "empty body → 400");

  // Invalid email
  const v2 = await req("POST", "/api/auth/register", {
    body: { name: "Test", email: "not-an-email", password: "Pass@1234" },
  });
  log("validation", "public", "POST", "/api/auth/register", 400, v2.status, "invalid email → 400");

  // Short password
  const v3 = await req("POST", "/api/auth/register", {
    body: { name: "Test", email: "valid@test.com", password: "12" },
  });
  log("validation", "public", "POST", "/api/auth/register", 400, v3.status, "short password → 400");

  // Short name
  const v4 = await req("POST", "/api/auth/register", {
    body: { name: "A", email: "valid@test.com", password: "Pass@1234" },
  });
  log("validation", "public", "POST", "/api/auth/register", 400, v4.status, "short name → 400");

  // Invalid role
  const v5 = await req("POST", "/api/auth/register", {
    body: { name: "Test", email: "valid@test.com", password: "Pass@1234", role: "superadmin" },
  });
  log("validation", "public", "POST", "/api/auth/register", 400, v5.status, "invalid role → 400");

  // Valid register
  const v6 = await req("POST", "/api/auth/register", {
    body: { name: "TempUser", email: "tempuser-fulltest@test.com", password: "Pass@1234", role: "viewer" },
  });
  log("validation", "public", "POST", "/api/auth/register", 201, v6.status, "valid data → 201");

  // ── Login validation ──
  console.log("─── Login Validation ───");

  // Missing email
  const v7 = await req("POST", "/api/auth/login", { body: { password: "Pass@1234" } });
  log("validation", "public", "POST", "/api/auth/login", 400, v7.status, "missing email → 400");

  // Missing password
  const v8 = await req("POST", "/api/auth/login", { body: { email: "tempuser-fulltest@test.com" } });
  log("validation", "public", "POST", "/api/auth/login", 400, v8.status, "missing password → 400");

  // Invalid email format
  const v9 = await req("POST", "/api/auth/login", { body: { email: "bad-email", password: "Pass@1234" } });
  log("validation", "public", "POST", "/api/auth/login", 400, v9.status, "invalid email → 400");

  // Valid login
  const v10 = await req("POST", "/api/auth/login", {
    body: { email: "tempuser-fulltest@test.com", password: "Pass@1234" },
  });
  log("validation", "public", "POST", "/api/auth/login", 200, v10.status, "valid data → 200");

  // ── Record creation validation ──
  console.log("─── Record Validation ───");

  // Missing all fields
  const v11 = await req("POST", "/api/records", { token: tokens.admin, body: {} });
  log("validation", "admin", "POST", "/api/records", 400, v11.status, "empty body → 400");

  // Invalid userId (not MongoId)
  const v12 = await req("POST", "/api/records", {
    token: tokens.admin,
    body: { userId: "not-a-mongo-id", amount: 100, type: "income", category: "test", date: "2026-01-01" },
  });
  log("validation", "admin", "POST", "/api/records", 400, v12.status, "invalid userId → 400");

  // Invalid type
  const v13 = await req("POST", "/api/records", {
    token: tokens.admin,
    body: { userId: userIds.admin, amount: 100, type: "refund", category: "test", date: "2026-01-01" },
  });
  log("validation", "admin", "POST", "/api/records", 400, v13.status, "invalid type → 400");

  // Invalid date
  const v14 = await req("POST", "/api/records", {
    token: tokens.admin,
    body: { userId: userIds.admin, amount: 100, type: "income", category: "test", date: "not-a-date" },
  });
  log("validation", "admin", "POST", "/api/records", 400, v14.status, "invalid date → 400");

  // Non-numeric amount
  const v15 = await req("POST", "/api/records", {
    token: tokens.admin,
    body: { userId: userIds.admin, amount: "abc", type: "income", category: "test", date: "2026-01-01" },
  });
  log("validation", "admin", "POST", "/api/records", 400, v15.status, "non-numeric amount → 400");

  // Valid record creation
  const v16 = await req("POST", "/api/records", {
    token: tokens.admin,
    body: { userId: userIds.admin, amount: 5000, type: "income", category: "salary", date: "2026-01-15", notes: "fulltest-record" },
  });
  log("validation", "admin", "POST", "/api/records", 201, v16.status, "valid data → 201");
  if (v16.status === 201) testRecordId = v16.data._id;

  // ── Record update validation ──
  console.log("─── Record Update Validation ───");

  // Invalid param id
  const v17 = await req("PUT", "/api/records/not-a-valid-id", {
    token: tokens.admin, body: { amount: 6000 },
  });
  log("validation", "admin", "PUT", "/api/records/:id", 400, v17.status, "invalid param id → 400");

  // Invalid type in update
  if (testRecordId) {
    const v18 = await req("PUT", `/api/records/${testRecordId}`, {
      token: tokens.admin, body: { type: "refund" },
    });
    log("validation", "admin", "PUT", "/api/records/:id", 400, v18.status, "invalid type in body → 400");
  }

  // ── Record delete validation ──
  const v19 = await req("DELETE", "/api/records/not-a-valid-id", { token: tokens.admin });
  log("validation", "admin", "DELETE", "/api/records/:id", 400, v19.status, "invalid param id → 400");

  // ── GET records query validation ──
  console.log("─── GET Records Query Validation ───");

  const v26 = await req("GET", "/api/records", { token: tokens.admin, query: { startDate: "not-a-date" } });
  log("validation", "admin", "GET", "/api/records?startDate", 400, v26.status, "invalid startDate → 400");

  const v27 = await req("GET", "/api/records", { token: tokens.admin, query: { endDate: "not-a-date" } });
  log("validation", "admin", "GET", "/api/records?endDate", 400, v27.status, "invalid endDate → 400");

  const v28 = await req("GET", "/api/records", { token: tokens.admin, query: { type: "refund" } });
  log("validation", "admin", "GET", "/api/records?type", 400, v28.status, "invalid type query → 400");

  const v29 = await req("GET", "/api/records", { token: tokens.admin, query: { page: "-1" } });
  log("validation", "admin", "GET", "/api/records?page", 400, v29.status, "negative page → 400");

  const v30 = await req("GET", "/api/records", { token: tokens.admin, query: { limit: "200" } });
  log("validation", "admin", "GET", "/api/records?limit", 400, v30.status, "limit > 100 → 400");

  // ── User update validation ──
  console.log("─── User Validation ───");

  // Invalid param id
  const v20 = await req("PUT", "/api/users/not-a-valid-id", {
    token: tokens.admin, body: { name: "Updated" },
  });
  log("validation", "admin", "PUT", "/api/users/:id", 400, v20.status, "invalid param id → 400");

  // Invalid role in update
  const v21 = await req("PUT", `/api/users/${userIds.viewer}`, {
    token: tokens.admin, body: { role: "superadmin" },
  });
  log("validation", "admin", "PUT", "/api/users/:id", 400, v21.status, "invalid role → 400");

  // Invalid status in update
  const v22 = await req("PUT", `/api/users/${userIds.viewer}`, {
    token: tokens.admin, body: { status: "banned" },
  });
  log("validation", "admin", "PUT", "/api/users/:id", 400, v22.status, "invalid status → 400");

  // Invalid email in update
  const v23 = await req("PUT", `/api/users/${userIds.viewer}`, {
    token: tokens.admin, body: { email: "not-an-email" },
  });
  log("validation", "admin", "PUT", "/api/users/:id", 400, v23.status, "invalid email → 400");

  // Valid user update
  const v24 = await req("PUT", `/api/users/${userIds.viewer}`, {
    token: tokens.admin, body: { name: "UpdatedViewer" },
  });
  log("validation", "admin", "PUT", "/api/users/:id", 200, v24.status, "valid data → 200");

  // ── User delete validation ──
  const v25 = await req("DELETE", "/api/users/not-a-valid-id", { token: tokens.admin });
  log("validation", "admin", "DELETE", "/api/users/:id", 400, v25.status, "invalid param id → 400");

  // Clean up temp user
  await User.deleteOne({ email: "tempuser-fulltest@test.com" });
}

// ══════════════════════════════════════════════════════
//  2. ROLE-BASED ACCESS TESTS
// ══════════════════════════════════════════════════════

async function testRoleAccess() {
  console.log("\n═══ ROLE-BASED ACCESS TESTS ═══\n");

  // ── Auth routes (public) ──
  console.log("─── Auth Routes (Public) ───");
  const r1 = await req("POST", "/api/auth/register", {
    body: { name: "TempUser", email: "tempuser-fulltest@test.com", password: "Pass@1234", role: "viewer" },
  });
  log("role", "public", "POST", "/api/auth/register", 201, r1.status);

  const r2 = await req("POST", "/api/auth/login", {
    body: { email: "tempuser-fulltest@test.com", password: "Pass@1234" },
  });
  log("role", "public", "POST", "/api/auth/login", 200, r2.status);
  await User.deleteOne({ email: "tempuser-fulltest@test.com" });

  // ── User routes (admin-only) ──
  console.log("─── User Routes ───");
  for (const role of ["admin", "analyst", "viewer"]) {
    const expected = role === "admin" ? 200 : 403;
    const g = await req("GET", "/api/users", { token: tokens[role] });
    log("role", role, "GET", "/api/users", expected, g.status);

    const u = await req("PUT", `/api/users/${userIds.viewer}`, {
      token: tokens[role], body: { name: "UpdatedViewer" },
    });
    log("role", role, "PUT", "/api/users/:id", expected, u.status);
  }

  for (const role of ["analyst", "viewer"]) {
    const d = await req("DELETE", `/api/users/${new mongoose.Types.ObjectId()}`, { token: tokens[role] });
    log("role", role, "DELETE", "/api/users/:id", 403, d.status);
  }

  const disposable = await User.create({
    name: "DeleteMe", email: "deleteme-fulltest@test.com",
    password: await bcrypt.hash("Pass@1234", 10), role: "viewer",
  });
  const dd = await req("DELETE", `/api/users/${disposable._id}`, { token: tokens.admin });
  log("role", "admin", "DELETE", "/api/users/:id", 200, dd.status);

  // ── Record routes ──
  console.log("─── Record Routes ───");

  // Ensure a record exists for tests  
  let recordForTest = testRecordId;
  if (!recordForTest) {
    const cr = await req("POST", "/api/records", {
      token: tokens.admin,
      body: { userId: userIds.admin, amount: 5000, type: "income", category: "salary", date: "2026-01-15", notes: "fulltest-record" },
    });
    if (cr.status === 201) recordForTest = cr.data._id;
  }

  // POST — admin only can actually create
  for (const role of ["admin", "analyst", "viewer"]) {
    const body = { userId: userIds.admin, amount: 3000, type: "expense", category: "rent", date: "2026-02-01", notes: "fulltest-rolepost" };
    const r = await req("POST", "/api/records", { token: tokens[role], body });
    let expected;
    if (role === "admin") expected = 201;
    else if (role === "analyst") expected = 403;
    else expected = 403;
    log("role", role, "POST", "/api/records", expected, r.status);
    if (role === "admin" && r.status === 201) {
      // clean up extra record
      await Record.findByIdAndDelete(r.data._id);
    }
  }

  // GET — all authenticated
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/records", { token: tokens[role] });
    log("role", role, "GET", "/api/records", 200, r.status);
  }

  // GET with type filter
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/records", { token: tokens[role], query: { type: "income" } });
    log("role", role, "GET", "/api/records?type=income", 200, r.status, "filter by type");
  }

  // GET with search
  const sr = await req("GET", "/api/records", { token: tokens.admin, query: { search: "salary" } });
  log("role", "admin", "GET", "/api/records?search=salary", 200, sr.status, "search");

  // GET with pagination
  const pr = await req("GET", "/api/records", { token: tokens.admin, query: { page: 1, limit: 5 } });
  log("role", "admin", "GET", "/api/records?page=1&limit=5", 200, pr.status, "pagination");

  // GET with date filter
  const dr = await req("GET", "/api/records", { token: tokens.admin, query: { startDate: "2026-01-01", endDate: "2026-12-31" } });
  log("role", "admin", "GET", "/api/records?startDate&endDate", 200, dr.status, "date filter");

  // PUT — admin only
  if (recordForTest) {
    for (const role of ["admin", "analyst", "viewer"]) {
      const expected = role === "admin" ? 200 : 403;
      const r = await req("PUT", `/api/records/${recordForTest}`, {
        token: tokens[role], body: { amount: 6000 },
      });
      log("role", role, "PUT", "/api/records/:id", expected, r.status);
    }
  }

  // DELETE — admin only
  if (recordForTest) {
    for (const role of ["analyst", "viewer"]) {
      const r = await req("DELETE", `/api/records/${recordForTest}`, { token: tokens[role] });
      log("role", role, "DELETE", "/api/records/:id", 403, r.status);
    }
    const r = await req("DELETE", `/api/records/${recordForTest}`, { token: tokens.admin });
    log("role", "admin", "DELETE", "/api/records/:id", 200, r.status);
    testRecordId = null;
  }

  // ── Dashboard ──
  console.log("─── Dashboard Routes ───");
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/dashboard/summary", { token: tokens[role] });
    log("role", role, "GET", "/api/dashboard/summary", 200, r.status);
  }

  // ── Dashboard Trends ──
  console.log("─── Dashboard Trends ───");
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/dashboard/trends", { token: tokens[role] });
    log("role", role, "GET", "/api/dashboard/trends", 200, r.status);
  }

  // ── Unauthenticated ──
  console.log("─── Unauthenticated Access ───");
  for (const [method, path] of [["GET", "/api/users"], ["GET", "/api/records"], ["POST", "/api/records"], ["GET", "/api/dashboard/summary"], ["GET", "/api/dashboard/trends"]]) {
    const r = await req(method, path);
    log("role", "none", method, path, 401, r.status, "no token");
  }
}

// ══════════════════════════════════════════════════════
//  3. SEARCH ROLE-SCOPING TESTS
// ══════════════════════════════════════════════════════

async function testSearchScoping() {
  console.log("\n═══ SEARCH ROLE-SCOPING TESTS ═══\n");

  // Create test records
  await Record.create({
    userId: new mongoose.Types.ObjectId(userIds.admin), amount: 9999, type: "income",
    category: "bonus", date: "2026-01-01", notes: "fulltest-search-admin", createdBy: new mongoose.Types.ObjectId(userIds.admin),
  });
  await Record.create({
    userId: new mongoose.Types.ObjectId(userIds.viewer), amount: 500, type: "expense",
    category: "groceries", date: "2026-01-01", notes: "fulltest-search-viewer", createdBy: new mongoose.Types.ObjectId(userIds.admin),
  });

  async function search(token, keyword) {
    const r = await req("GET", "/api/records", { token, query: { search: keyword } });
    return r.data?.total ?? 0;
  }

  // Search "bonus" — admin's record
  const a1 = await search(tokens.admin,   "bonus");
  const a2 = await search(tokens.analyst, "bonus");
  const a3 = await search(tokens.viewer,  "bonus");

  log("search", "admin",   "GET", "/api/records?search=bonus", true, a1 > 0, "admin finds admin's record");
  log("search", "analyst", "GET", "/api/records?search=bonus", true, a2 > 0, "analyst finds admin's record");
  log("search", "viewer",  "GET", "/api/records?search=bonus", true, a3 === 0, "viewer can't see admin's record");

  // Search "groceries" — viewer's record
  const b1 = await search(tokens.admin,   "groceries");
  const b2 = await search(tokens.analyst, "groceries");
  const b3 = await search(tokens.viewer,  "groceries");

  log("search", "admin",   "GET", "/api/records?search=groceries", true, b1 > 0, "admin finds viewer's record");
  log("search", "analyst", "GET", "/api/records?search=groceries", true, b2 > 0, "analyst finds viewer's record");
  log("search", "viewer",  "GET", "/api/records?search=groceries", true, b3 > 0, "viewer finds own record");
}

// ══════════════════════════════════════════════════════
//  REPORT
// ══════════════════════════════════════════════════════

function printReport() {
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total  = results.length;

  console.log("\n\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                    COMPREHENSIVE TEST REPORT                                                       ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log(`║  Total: ${String(total).padEnd(5)} │  PASSED: ${String(passed).padEnd(5)} │  FAILED: ${String(failed).padEnd(55)}║`);
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝\n");

  for (const suite of ["validation", "role", "search"]) {
    const suiteResults = results.filter(r => r.suite === suite);
    if (suiteResults.length === 0) continue;

    const suitePassed = suiteResults.filter(r => r.pass).length;
    const suiteFailed = suiteResults.filter(r => !r.pass).length;

    const titles = { validation: "INPUT VALIDATION", role: "ROLE-BASED ACCESS", search: "SEARCH ROLE-SCOPING" };
    console.log(`\n┌─── ${titles[suite]} (${suitePassed}/${suiteResults.length} passed) ${"─".repeat(80)}┐\n`);

    const hdr = "  " + [
      "Role".padEnd(10), "Method".padEnd(8), "Route".padEnd(35),
      "Exp".padEnd(7), "Got".padEnd(7), "Status".padEnd(9), "Note",
    ].join("│ ");
    console.log(hdr);
    console.log("  " + "─".repeat(120));

    for (const r of suiteResults) {
      const st = r.pass ? "✅ PASS" : "❌ FAIL";
      const exp = String(r.expected).padEnd(7);
      const got = String(r.actual).padEnd(7);
      console.log("  " + [
        r.role.padEnd(10), r.method.padEnd(8), r.route.padEnd(35),
        exp, got, st.padEnd(9), r.note,
      ].join("│ "));
    }

    if (suiteFailed > 0) {
      console.log(`\n  ⚠️  ${suiteFailed} FAILED:`);
      for (const r of suiteResults.filter(r => !r.pass)) {
        console.log(`     ❌ [${r.role}] ${r.method} ${r.route} — expected ${r.expected}, got ${r.actual} (${r.note})`);
      }
    }
  }

  // ── Per-role summary ──
  console.log("\n\n┌─── SUMMARY PER ROLE ──────────────────────────────────┐\n");
  for (const role of [...new Set(results.map(r => r.role))]) {
    const rr = results.filter(r => r.role === role);
    const p = rr.filter(r => r.pass).length;
    const f = rr.filter(r => !r.pass).length;
    console.log(`  ${f === 0 ? "✅" : "⚠️ "} ${role.padEnd(10)} — ${p} passed, ${f} failed out of ${rr.length}`);
  }

  // ── Per-suite summary ──
  console.log("\n┌─── SUMMARY PER SUITE ─────────────────────────────────┐\n");
  for (const suite of ["validation", "role", "search"]) {
    const sr = results.filter(r => r.suite === suite);
    const p = sr.filter(r => r.pass).length;
    const f = sr.filter(r => !r.pass).length;
    console.log(`  ${f === 0 ? "✅" : "⚠️ "} ${suite.padEnd(12)} — ${p} passed, ${f} failed out of ${sr.length}`);
  }

  console.log("\n" + "═".repeat(120) + "\n");
}

// ══════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════

async function main() {
  try {
    await setup();
    await testValidation();
    await testRoleAccess();
    await testSearchScoping();
    printReport();
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await teardown();
    process.exit(0);
  }
}

main();
