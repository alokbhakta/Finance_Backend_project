import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./src/models/user.model.js";
import Record from "./src/models/record.model.js";
import app from "./src/app.js";

const BASE = "http://localhost:4568";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const server = app.listen(4568);

  // Cleanup
  const emails = ["searchadmin@t.com", "searchanalyst@t.com", "searchviewer@t.com"];
  const notes  = ["search-test-admin", "search-test-viewer"];
  await User.deleteMany({ email: { $in: emails } });
  await Record.deleteMany({ notes: { $in: notes } });

  // Create users
  const pw = await bcrypt.hash("Pass1234", 10);
  const admin   = await User.create({ name: "SAdmin",   email: "searchadmin@t.com",   password: pw, role: "admin" });
  const analyst = await User.create({ name: "SAnalyst", email: "searchanalyst@t.com", password: pw, role: "analyst" });
  const viewer  = await User.create({ name: "SViewer",  email: "searchviewer@t.com",  password: pw, role: "viewer" });

  const tok = (u) => jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

  // Record owned by ADMIN
  await Record.create({ userId: admin._id, amount: 9999, type: "income", category: "bonus", date: "2026-01-01", notes: "search-test-admin", createdBy: admin._id });
  // Record owned by VIEWER
  await Record.create({ userId: viewer._id, amount: 500, type: "expense", category: "groceries", date: "2026-01-01", notes: "search-test-viewer", createdBy: admin._id });

  async function search(token, keyword) {
    const r = await fetch(`${BASE}/api/records?search=${keyword}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    return d.total;
  }

  console.log("\n=== SEARCH: 'bonus' (record owned by admin) ===");
  const a1 = await search(tok(admin),   "bonus");
  const a2 = await search(tok(analyst), "bonus");
  const a3 = await search(tok(viewer),  "bonus");
  console.log(`  Admin   found: ${a1}`);
  console.log(`  Analyst found: ${a2}  (expect >0 if analyst sees all records)`);
  console.log(`  Viewer  found: ${a3}  (expect 0, not their record)`);

  console.log("\n=== SEARCH: 'groceries' (record owned by viewer) ===");
  const b1 = await search(tok(admin),   "groceries");
  const b2 = await search(tok(analyst), "groceries");
  const b3 = await search(tok(viewer),  "groceries");
  console.log(`  Admin   found: ${b1}`);
  console.log(`  Analyst found: ${b2}  (expect >0 if analyst sees all records)`);
  console.log(`  Viewer  found: ${b3}  (expect >0, their own record)`);

  console.log("\n=== VERDICT ===");
  const analystSeesAll = a2 > 0 && b2 > 0;
  const viewerScoped   = a3 === 0 && b3 > 0;
  console.log(`  Analyst can search ALL records: ${analystSeesAll ? "YES ✅" : "NO ❌  (BUG: analyst is restricted to own records only)"}`);
  console.log(`  Viewer scoped to own records:   ${viewerScoped   ? "YES ✅" : "NO ❌"}`);

  // Cleanup
  await User.deleteMany({ email: { $in: emails } });
  await Record.deleteMany({ notes: { $in: notes } });
  server.close();
  await mongoose.disconnect();
}

run();
