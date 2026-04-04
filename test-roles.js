import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./src/models/user.model.js";
import Record from "./src/models/record.model.js";
import app from "./src/app.js";

const BASE_URL = "http://localhost:4567";
let server;

// ── Test users ──
const testUsers = {
  admin:   { name: "TestAdmin",   email: "testadmin@test.com",   password: "Pass@1234", role: "admin" },
  analyst: { name: "TestAnalyst", email: "testanalyst@test.com", password: "Pass@1234", role: "analyst" },
  viewer:  { name: "TestViewer",  email: "testviewer@test.com",  password: "Pass@1234", role: "viewer" },
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

function log(role, method, route, expectedStatus, actualStatus, note = "") {
  results.push({
    role, method, route,
    expected: expectedStatus,
    actual: actualStatus,
    pass: Array.isArray(expectedStatus)
      ? expectedStatus.includes(actualStatus)
      : actualStatus === expectedStatus,
    note,
  });
}

// ── Setup ──
async function setup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected for testing");
  server = app.listen(4567, () => console.log("Test server on :4567"));

  // Clean old test data
  await User.deleteMany({ email: { $in: Object.values(testUsers).map(u => u.email) } });
  await Record.deleteMany({ notes: "role-test-record" });

  // Seed users & tokens
  for (const [role, u] of Object.entries(testUsers)) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = await User.create({ name: u.name, email: u.email, password: hashed, role: u.role });
    userIds[role] = user._id.toString();
    tokens[role] = jwt.sign({ id: user._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
  }
  console.log("Test users created\n");
}

// ── Teardown ──
async function teardown() {
  await User.deleteMany({ email: { $in: Object.values(testUsers).map(u => u.email) } });
  await Record.deleteMany({ notes: "role-test-record" });
  await User.deleteOne({ email: "tempuser@test.com" });
  await User.deleteOne({ email: "deleteme@test.com" });
  server.close();
  await mongoose.disconnect();
}

// ═════════════════════════════════════════════════════
//  TEST SUITES
// ═════════════════════════════════════════════════════

async function testAuthRoutes() {
  console.log("─── Auth Routes (Public) ───");

  // Register
  const r1 = await req("POST", "/api/auth/register", {
    body: { name: "TempUser", email: "tempuser@test.com", password: "Pass@1234", role: "viewer" },
  });
  log("public", "POST", "/api/auth/register", 201, r1.status);

  // Login
  const r2 = await req("POST", "/api/auth/login", {
    body: { email: "tempuser@test.com", password: "Pass@1234" },
  });
  log("public", "POST", "/api/auth/login", 200, r2.status);

  await User.deleteOne({ email: "tempuser@test.com" });
}

async function testUserRoutes() {
  console.log("─── User Routes (admin-only) ───");

  for (const role of ["admin", "analyst", "viewer"]) {
    const expected = role === "admin" ? 200 : 403;

    // GET /api/users
    const r1 = await req("GET", "/api/users", { token: tokens[role] });
    log(role, "GET", "/api/users", expected, r1.status);

    // PUT /api/users/:id
    const r2 = await req("PUT", `/api/users/${userIds.viewer}`, {
      token: tokens[role], body: { name: "UpdatedViewer" },
    });
    log(role, "PUT", "/api/users/:id", expected, r2.status);
  }

  // DELETE — non-admin should be blocked
  for (const role of ["analyst", "viewer"]) {
    const r = await req("DELETE", `/api/users/${new mongoose.Types.ObjectId()}`, { token: tokens[role] });
    log(role, "DELETE", "/api/users/:id", 403, r.status);
  }

  // Admin delete — create a disposable user
  const temp = await User.create({
    name: "DeleteMe", email: "deleteme@test.com",
    password: await bcrypt.hash("Pass@1234", 10), role: "viewer",
  });
  const r = await req("DELETE", `/api/users/${temp._id}`, { token: tokens.admin });
  log("admin", "DELETE", "/api/users/:id", 200, r.status);
}

async function testRecordRoutes() {
  console.log("─── Record Routes ───");

  const recordBody = {
    userId: userIds.admin, amount: 5000, type: "income",
    category: "salary", date: "2026-01-15", notes: "role-test-record",
  };

  // POST /api/records — route allows admin & analyst, controller blocks non-admin
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("POST", "/api/records", { token: tokens[role], body: recordBody });

    let expected;
    if (role === "admin") expected = 201;
    else if (role === "analyst") expected = 403; // controller blocks
    else expected = 403; // route middleware blocks

    log(role, "POST", "/api/records", expected, r.status);
    if (role === "admin" && r.status === 201) testRecordId = r.data._id;
  }

  // GET /api/records — all authenticated (now returns 200 with pagination)
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/records", { token: tokens[role] });
    log(role, "GET", "/api/records", 200, r.status);
  }

  // GET /api/records?type=income — filter
  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/records", { token: tokens[role], query: { type: "income" } });
    log(role, "GET", "/api/records?type=income", 200, r.status, "filter by type");
  }

  // GET /api/records?search=salary — search
  const sr = await req("GET", "/api/records", { token: tokens.admin, query: { search: "salary" } });
  log("admin", "GET", "/api/records?search=salary", 200, sr.status, "search by keyword");

  // GET /api/records?page=1&limit=5 — pagination
  const pr = await req("GET", "/api/records", { token: tokens.admin, query: { page: 1, limit: 5 } });
  log("admin", "GET", "/api/records?page=1&limit=5", 200, pr.status, "pagination");

  // PUT /api/records/:id — admin only
  if (testRecordId) {
    for (const role of ["admin", "analyst", "viewer"]) {
      const expected = role === "admin" ? 200 : 403;
      const r = await req("PUT", `/api/records/${testRecordId}`, {
        token: tokens[role], body: { amount: 6000 },
      });
      log(role, "PUT", "/api/records/:id", expected, r.status);
    }
  }

  // DELETE /api/records/:id — admin only
  if (testRecordId) {
    for (const role of ["analyst", "viewer"]) {
      const r = await req("DELETE", `/api/records/${testRecordId}`, { token: tokens[role] });
      log(role, "DELETE", "/api/records/:id", 403, r.status);
    }
    const r = await req("DELETE", `/api/records/${testRecordId}`, { token: tokens.admin });
    log("admin", "DELETE", "/api/records/:id", 200, r.status);
  }
}

async function testDashboardRoutes() {
  console.log("─── Dashboard Routes ───");

  for (const role of ["admin", "analyst", "viewer"]) {
    const r = await req("GET", "/api/dashboard/summary", { token: tokens[role] });
    log(role, "GET", "/api/dashboard/summary", 200, r.status);
  }
}

async function testUnauthenticated() {
  console.log("─── Unauthenticated Access ───");

  const routes = [
    ["GET",  "/api/users"],
    ["GET",  "/api/records"],
    ["POST", "/api/records"],
    ["GET",  "/api/dashboard/summary"],
  ];
  for (const [method, path] of routes) {
    const r = await req(method, path);
    log("none", method, path, 401, r.status, "no token");
  }
}

// ═════════════════════════════════════════════════════
//  REPORT
// ═════════════════════════════════════════════════════

function printReport() {
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total  = results.length;

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                              ROLE-BASED ACCESS TEST REPORT                                         ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝\n");
  console.log(`  Total: ${total}  |  PASSED: ${passed}  |  FAILED: ${failed}\n`);

  const hdr = "  " + [
    "Role".padEnd(10), "Method".padEnd(8), "Route".padEnd(35),
    "Expected".padEnd(12), "Actual".padEnd(8), "Status".padEnd(8), "Note",
  ].join("│ ");
  const div = "  " + "─".repeat(115);

  console.log(hdr);
  console.log(div);

  for (const r of results) {
    const st = r.pass ? "✅ PASS" : "❌ FAIL";
    const exp = Array.isArray(r.expected) ? r.expected.join("/") : String(r.expected);
    console.log("  " + [
      r.role.padEnd(10), r.method.padEnd(8), r.route.padEnd(35),
      exp.padEnd(12), String(r.actual).padEnd(8), st.padEnd(8), r.note,
    ].join("│ "));
  }

  console.log(div);

  // Per-role summary
  console.log("\n── Summary Per Role ──\n");
  for (const role of [...new Set(results.map(r => r.role))]) {
    const rr = results.filter(r => r.role === role);
    const p = rr.filter(r => r.pass).length;
    const f = rr.filter(r => !r.pass).length;
    console.log(`  ${f === 0 ? "✅" : "⚠️"} ${role.padEnd(10)} — ${p} passed, ${f} failed out of ${rr.length}`);
  }

  // Failed details
  if (failed > 0) {
    console.log("\n── Failed Routes Detail ──\n");
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ❌ [${r.role}] ${r.method} ${r.route} — expected ${r.expected}, got ${r.actual} ${r.note ? `(${r.note})` : ""}`);
    }
  }

  console.log("\n" + "═".repeat(100) + "\n");
}

// ═════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════

async function main() {
  try {
    await setup();
    await testAuthRoutes();
    await testUserRoutes();
    await testRecordRoutes();
    await testDashboardRoutes();
    await testUnauthenticated();
    printReport();
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await teardown();
    process.exit(0);
  }
}

main();
