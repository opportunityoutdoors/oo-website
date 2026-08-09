#!/usr/bin/env node
/**
 * A known camp, with known people, in known states.
 *
 * WHY THIS EXISTS
 *
 * Manual testing until now meant hand-editing a live contact's row with SQL, walking a
 * flow, then hand-restoring it from a value copied into a chat message. That was done eight
 * times in one afternoon. One mistyped restore and a real person's screening status is
 * quietly wrong, with nothing to catch it.
 *
 * Everything here is prefixed ZZ TEST and uses +fixture plus-addressed emails, so it sorts
 * to the bottom of every list, is obvious in the admin, and can be removed wholesale.
 *
 * USAGE
 *   node scripts/test-fixture.mjs status     what exists right now
 *   node scripts/test-fixture.mjs create     build the camp and its people
 *   node scripts/test-fixture.mjs destroy    remove every trace of it
 *   node scripts/test-fixture.mjs reset      destroy then create
 *
 * SAFETY
 *   - destroy only ever deletes rows whose email matches the fixture pattern, or the event
 *     whose title matches the fixture title. It cannot touch a real registrant.
 *   - It refuses to run against a live Stripe key, because a fixture that can move real
 *     money is not a fixture.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const EVENT_TITLE = "ZZ TEST Fixture Camp";
const EVENT_SLUG = "zz-test-fixture-camp";
const EMAIL_DOMAIN = "+fixture@opportunityoutdoors.org";

/**
 * A real inbox that fixture mail can reach, e.g. you@gmail.com.
 *
 * Every fixture person gets a distinct plus-addressed variant of it, so they are all
 * distinguishable in the admin and all land in one place.
 *
 * WHY THIS IS NOT OPTIONAL IN PRACTICE. The first version used undeliverable +fixture
 * addresses on the org's own domain, with a note in TESTING.md warning not to trigger any
 * mail. That warning lasted exactly one test: paying a fixture registration sends a
 * confirmation email automatically, with no send button to avoid. Two addresses hard
 * bounced and landed on Resend's suppression list.
 *
 * A rule that depends on remembering it is not a rule. Deliverable addresses remove the
 * hazard rather than documenting it.
 */
const INBOX = process.env.FIXTURE_EMAIL || null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
  );
  process.exit(1);
}

// A fixture that can charge a real card is not a fixture. Checked before anything else.
if ((process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_")) {
  console.error(
    "STRIPE_SECRET_KEY is a LIVE key. Refusing to run: test fixtures must never sit\n" +
      "alongside live payment credentials. Switch .env.local to a test key first."
  );
  process.exit(1);
}

if (!INBOX) {
  console.warn(
    "warning: FIXTURE_EMAIL is not set, so fixture people get undeliverable addresses.\n" +
      "         Anything that sends them mail will HARD BOUNCE and be suppressed by Resend.\n" +
      "         Paying a fixture registration sends a confirmation automatically, so this\n" +
      "         is easy to trip. Set FIXTURE_EMAIL=you@gmail.com in .env.local.\n"
  );
}

const db = createClient(url, key, { auth: { persistSession: false } });

/**
 * The people, and what each one is for.
 *
 * Chosen to cover every branch the welcome packet gate and the pipeline funnel care about,
 * so one `create` gives a camp that exercises all of them at once.
 */
const PEOPLE = [
  {
    key: "ready",
    first: "Ada",
    last: "Ready",
    dob: "1990-04-02",
    role: "Mentee",
    status: "registered",
    paid: true,
    waiver: true,
    check: "clear",
    purpose: "Passes every stage. Should receive a welcome packet.",
  },
  {
    key: "mentor",
    first: "Bo",
    last: "Mentor",
    dob: "1985-11-20",
    role: "Mentor",
    status: "registered",
    paid: true,
    waiver: true,
    check: "clear",
    purpose: "Cleared mentor. Needs no mentor of their own.",
  },
  {
    key: "flagged",
    first: "Cy",
    last: "Flagged",
    dob: "1992-06-15",
    role: "Mentee",
    status: "registered",
    paid: true,
    waiver: true,
    check: "flagged",
    purpose: "Awaiting a panel decision. Must NOT receive a packet.",
  },
  {
    key: "declined",
    first: "Di",
    last: "Declined",
    dob: "1988-02-09",
    role: "Mentee",
    status: "registered",
    paid: true,
    waiver: true,
    check: "declined",
    purpose: "Declined and left in the event on purpose, so the gate catches them.",
  },
  {
    key: "unscreened",
    first: "Eli",
    last: "Unscreened",
    dob: "1995-09-30",
    role: "Mentee",
    status: "registered",
    paid: true,
    waiver: true,
    check: "none",
    purpose: "Paid but never screened. Should show an 'order check' action.",
  },
  {
    key: "nodob",
    first: "Fay",
    last: "Nodob",
    dob: null,
    role: "Mentee",
    status: "registered",
    paid: true,
    waiver: true,
    check: "none",
    purpose: "No date of birth, so age is unknown and they cannot be cleared.",
  },
  {
    key: "unpaid",
    first: "Gus",
    last: "Unpaid",
    dob: "1991-01-05",
    role: "Mentee",
    status: "registered",
    paid: false,
    waiver: true,
    check: "none",
    purpose: "Registered but has not paid. Blocks at the payment stage.",
  },
  {
    key: "invited",
    first: "Ivy",
    last: "Invited",
    dob: "1994-03-22",
    role: "Mentee",
    status: "approved",
    paid: false,
    waiver: false,
    check: "clear",
    purpose:
      "Approved and invited, has NOT registered. Use their token to walk the registration form.",
  },
  {
    key: "waitlist",
    first: "Hana",
    last: "Waitlist",
    dob: "1993-07-11",
    role: "Mentee",
    status: "waitlist",
    paid: false,
    waiver: false,
    check: "none",
    purpose: "Still on the waitlist. Blocks at the very first stage.",
  },
];

function email(p) {
  if (!INBOX) return `zz.${p.key}${EMAIL_DOMAIN}`;
  const [local, domain] = INBOX.split("@");
  return `${local}+zz.${p.key}@${domain}`;
}

function yearFromNow() {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

async function findEvent() {
  const { data } = await db.from("events").select("id, title").eq("title", EVENT_TITLE).maybeSingle();
  return data;
}

async function status() {
  const ev = await findEvent();
  const { data: contacts } = await db
    .from("contacts")
    .select("id, email")
    .like("email", `%${EMAIL_DOMAIN}`);

  console.log(`event    : ${ev ? `${ev.title} (${ev.id})` : "not present"}`);
  console.log(`contacts : ${contacts?.length ?? 0}`);

  if (ev) {
    const { data: regs } = await db
      .from("registrations")
      .select("id, status, payment_status, contacts(first_name, last_name, background_check_status)")
      .eq("event_id", ev.id);

    for (const r of regs ?? []) {
      const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
      console.log(
        `  ${`${c?.first_name} ${c?.last_name}`.padEnd(18)} ${String(r.status).padEnd(12)} ` +
          `${String(r.payment_status ?? "-").padEnd(10)} check=${c?.background_check_status}`
      );
    }
  }
}

async function destroy() {
  const ev = await findEvent();

  if (ev) {
    // Registrations first: they reference both the event and the contacts.
    const { error } = await db.from("registrations").delete().eq("event_id", ev.id);
    if (error) throw new Error(`deleting registrations: ${error.message}`);
    await db.from("events").delete().eq("id", ev.id);
  }

  // Scoped to the fixture email pattern, so this can never reach a real person however
  // wrong anything else has gone.
  const { data: contacts } = await db
    .from("contacts")
    .select("id")
    .like("email", `%${EMAIL_DOMAIN}`);

  for (const c of contacts ?? []) {
    await db.from("background_check_reviews").delete().eq("contact_id", c.id);
    await db.from("registrations").delete().eq("contact_id", c.id);
  }
  await db.from("contacts").delete().like("email", `%${EMAIL_DOMAIN}`);

  // Contacts created under FIXTURE_EMAIL do not match the pattern above, so they are removed
  // by their own plus-addressed pattern rather than left orphaned.
  if (INBOX) {
    const [local, domain] = INBOX.split("@");
    const pattern = `${local}+zz.%@${domain}`;
    const { data: mine } = await db.from("contacts").select("id").like("email", pattern);
    for (const c of mine ?? []) {
      await db.from("background_check_reviews").delete().eq("contact_id", c.id);
      await db.from("registrations").delete().eq("contact_id", c.id);
    }
    await db.from("contacts").delete().like("email", pattern);
  }

  console.log(`Removed the fixture camp and ${contacts?.length ?? 0} fixture contact(s).`);
}

async function create() {
  if (await findEvent()) {
    console.error(`"${EVENT_TITLE}" already exists. Run destroy or reset first.`);
    process.exit(1);
  }

  const { data: ev, error: evError } = await db
    .from("events")
    .insert({
      title: EVENT_TITLE,
      slug: EVENT_SLUG,
      event_type: "hunt-camp",
      status: "registration-open",
      // Far enough out that nothing reads as urgent, close enough to be "upcoming".
      date_start: daysFromNow(45),
      date_end: daysFromNow(47),
      location: "ZZ TEST location",
      registration_fee: 75,
      camp_locations: [{ label: "ZZ TEST meeting point" }],
    })
    .select("id")
    .single();

  if (evError) throw new Error(`creating event: ${evError.message}`);

  let mentorRegId = null;

  for (const p of PEOPLE) {
    const { data: contact, error: cErr } = await db
      .from("contacts")
      .insert({
        email: email(p),
        first_name: p.first,
        last_name: p.last,
        date_of_birth: p.dob,
        tshirt_size: "L",
        background_check_status: p.check,
        background_check_expires_at: p.check === "clear" ? yearFromNow() : null,
        background_check_completed_at: p.check === "clear" ? new Date().toISOString() : null,
        // A provider reference only where a check was actually run. The refund path infers
        // whether a check fee was charged from this, so it must not be set on someone who
        // never had one.
        background_check_id: ["clear", "flagged", "declined"].includes(p.check)
          ? `zz-fixture-${p.key}`
          : null,
        background_check_provider: p.check === "none" ? null : "volunteerbadge",
      })
      .select("id")
      .single();

    if (cErr) throw new Error(`creating contact ${p.key}: ${cErr.message}`);

    const { data: reg, error: rErr } = await db
      .from("registrations")
      .insert({
        contact_id: contact.id,
        event_id: ev.id,
        status: p.status,
        role: p.role,
        payment_status: p.paid ? "paid" : null,
        payment_amount: p.paid ? 75 : null,
        waiver_signed: p.waiver,
        meeting_date_selected: p.status === "waitlist" ? null : "ZZ TEST slot",
        token: `zz-fixture-${p.key}`,
        // Deliberately no stripe_payment_id. Without one the refund path reports that it
        // cannot refund automatically, which is the correct answer for fake money and stops
        // a fixture ever pointing at a real payment intent.
        mentor_id: p.role === "Mentee" ? mentorRegId : null,
      })
      .select("id")
      .single();

    if (rErr) throw new Error(`creating registration ${p.key}: ${rErr.message}`);
    if (p.role === "Mentor") mentorRegId = reg.id;
  }

  // The mentor is created third, so the two mentees before it were inserted without one.
  // Matching them afterwards is what makes the camp reach the matched stage.
  await db
    .from("registrations")
    .update({ mentor_id: mentorRegId })
    .eq("event_id", ev.id)
    .eq("role", "Mentee")
    .is("mentor_id", null)
    .neq("status", "waitlist");

  console.log(`Created "${EVENT_TITLE}" with ${PEOPLE.length} people.\n`);
  for (const p of PEOPLE) {
    console.log(`  ${`${p.first} ${p.last}`.padEnd(18)} ${p.purpose}`);
  }
  console.log(`\n  /admin/events/${ev.id}`);
}

const command = process.argv[2];

try {
  if (command === "status") await status();
  else if (command === "create") await create();
  else if (command === "destroy") await destroy();
  else if (command === "reset") {
    await destroy();
    await create();
  } else {
    console.error("usage: node scripts/test-fixture.mjs <status|create|destroy|reset>");
    process.exit(1);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
