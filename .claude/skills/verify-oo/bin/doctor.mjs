#!/usr/bin/env node
/**
 * Read-only. Answers one question: is this instance worth driving?
 *
 * Checks nothing it cannot observe. Every line prints what it actually saw, because a
 * doctor that says "ok" without naming the value it read is the green signal this
 * project keeps getting burned by.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

config({ path: ".env.local", quiet: true });

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3000";
let failed = 0;

function ok(label, detail) {
  console.log(`  ok    ${label.padEnd(22)} ${detail}`);
}
function bad(label, detail) {
  failed += 1;
  console.log(`  FAIL  ${label.padEnd(22)} ${detail}`);
}

console.log(`\nverify-oo doctor  (${BASE})\n`);

// 1. Which accounts is this pointed at. Reading these back is the point.
const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ref = supaUrl.replace(/^https:\/\//, "").split(".")[0];
if (ref) ok("supabase project", `${ref}  (expect ffivubkouyqzvebuxflf)`);
else bad("supabase project", "NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
if (stripeKey.startsWith("sk_test_")) ok("stripe key", "sk_test_… (test mode)");
else bad("stripe key", `${stripeKey.slice(0, 8)}… is not a test key. Stop.`);

if (process.env.FIXTURE_EMAIL) ok("FIXTURE_EMAIL", process.env.FIXTURE_EMAIL);
else bad("FIXTURE_EMAIL", "unset, so fixture mail hard bounces onto Resend suppression");

// 2. Which build is running.
try {
  const sha = execSync("git rev-parse --short HEAD").toString().trim();
  const dirty = execSync("git status --porcelain").toString().trim().length > 0;
  ok("checkout", `${sha}${dirty ? " (dirty working tree)" : ""}`);
} catch {
  bad("checkout", "not a git checkout");
}

// 3. Is the port ours, not some other Next app.
try {
  const res = await fetch(BASE + "/", { redirect: "manual" });
  const html = await res.text();
  if (html.includes("Opportunity Outdoors")) ok("dev server", `${res.status}, page names Opportunity Outdoors`);
  else bad("dev server", `${res.status}, but the page does not mention Opportunity Outdoors. Another app owns this port.`);
} catch (err) {
  bad("dev server", `${BASE} did not answer (${err.message}). Start it first.`);
}

// 4. Is the fixture camp there, and what can we drive.
if (ref && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const db = createClient(supaUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: ev, error } = await db
    .from("events")
    .select("id, title, slug")
    .eq("title", "ZZ TEST Fixture Camp")
    .maybeSingle();

  if (error) bad("supabase read", error.message);
  else if (!ev) bad("fixture camp", "absent. Run: npm run fixture -- create");
  else {
    const { data: regs } = await db
      .from("registrations")
      .select("id, token, status, contacts(first_name, last_name)")
      .eq("event_id", ev.id);
    ok("fixture camp", `${regs?.length ?? 0} people, board at ${BASE}/admin/events/${ev.id}`);
    console.log("");
    for (const r of regs ?? []) {
      const c = r.contacts;
      console.log(`        ${`${c?.first_name} ${c?.last_name}`.padEnd(18)} ${String(r.status).padEnd(12)} token=${r.token}`);
    }
  }
} else {
  bad("supabase read", "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
}

console.log(failed === 0 ? "\nHealthy. Drive it.\n" : `\n${failed} problem(s). Fix before driving.\n`);
process.exit(failed === 0 ? 0 : 1);
