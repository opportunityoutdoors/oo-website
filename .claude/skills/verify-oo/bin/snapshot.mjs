#!/usr/bin/env node
/**
 * Dump the fixture camp's real database state to an evidence file.
 *
 * Take one before driving and one after. The diff is the proof that the action changed
 * what it claimed to change, which a screenshot of a re-rendered board is not.
 *
 * usage: node .claude/skills/verify-oo/bin/snapshot.mjs <label> [runDir]
 *   writes <runDir>/<label>.json, default runDir .verify/latest
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local", quiet: true });

const label = process.argv[2];
if (!label) {
  console.error("usage: snapshot.mjs <label> [runDir]");
  process.exit(1);
}
const runDir = process.argv[3] || ".verify/latest";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: ev } = await db
  .from("events")
  .select("id, title, slug, status")
  .eq("title", "ZZ TEST Fixture Camp")
  .maybeSingle();

if (!ev) {
  console.error("No fixture camp. Run: npm run fixture -- create");
  process.exit(1);
}

const { data: regs } = await db
  .from("registrations")
  .select(
    "id, token, status, role, payment_status, payment_amount, waiver_signed, mentor_id, exit_reason, welcome_packet_sent_at, contacts(first_name, last_name, email, background_check_status)"
  )
  .eq("event_id", ev.id)
  .order("id");

const ids = (regs ?? []).map((r) => r.id);
const { data: timeline, error: tErr } = await db
  .from("registration_events")
  .select("registration_id, kind, from_status, to_status, exit_reason, source, detail, occurred_at")
  .in("registration_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
  .order("occurred_at");
if (tErr) {
  console.error(`reading registration_events: ${tErr.message}`);
  process.exit(1);
}

const people = (regs ?? []).map((r) => ({
  name: `${r.contacts?.first_name} ${r.contacts?.last_name}`,
  token: r.token,
  status: r.status,
  role: r.role,
  payment_status: r.payment_status,
  payment_amount: r.payment_amount,
  waiver_signed: r.waiver_signed,
  matched: Boolean(r.mentor_id),
  exit_reason: r.exit_reason,
  welcome_packet_sent_at: r.welcome_packet_sent_at,
  background_check_status: r.contacts?.background_check_status,
}));

mkdirSync(runDir, { recursive: true });
const path = join(runDir, `${label}.json`);
writeFileSync(path, JSON.stringify({ takenAt: new Date().toISOString(), event: ev, people, timeline }, null, 2));
console.log(`${path}  (${people.length} people, ${timeline?.length ?? 0} timeline rows)`);
