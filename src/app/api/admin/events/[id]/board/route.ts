import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { boardMembers } from "@/lib/board/members";
import { findContactByEmail } from "@/lib/contacts/find";
import { STAFF_ROLE } from "@/lib/camp-pipeline";
import { sendApprovalEmails } from "@/lib/email/approval";
import { logRegistrationEvent } from "@/lib/registration-log";

// The board on one camp: who is going, and as what.
//
// A board member goes as a Mentor, who walks the normal mentor path (registration invite,
// waiver, background check, mentees), or as Staff, who owes nothing and is Ready at once.
// Decided 2026-10-14. Board members come from Sanity; board_links ties each to a contact.

type Reg = { id: string; role: string | null; status: string; payment_status: string | null };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const supabase = createServiceClient();

  const members = await boardMembers();
  const { data: links } = await supabase
    .from("board_links")
    .select("sanity_id, contact_id, contacts(email)")
    .in("sanity_id", members.map((m) => m.id));
  const linkBySanity = new Map((links ?? []).map((l) => [l.sanity_id as string, l]));

  const contactIds = (links ?? []).map((l) => l.contact_id as string);
  const { data: regs } = contactIds.length
    ? await supabase
        .from("registrations")
        .select("id, contact_id, role, status")
        .eq("event_id", eventId)
        .in("contact_id", contactIds)
    : { data: [] };
  const regByContact = new Map((regs ?? []).map((r) => [r.contact_id as string, r]));

  return NextResponse.json({
    members: members.map((m) => {
      const link = linkBySanity.get(m.id);
      const c = link ? (Array.isArray(link.contacts) ? link.contacts[0] : link.contacts) : null;
      const reg = link ? regByContact.get(link.contact_id as string) : undefined;
      return {
        ...m,
        email: (c as { email: string | null } | null)?.email ?? null,
        registration: reg ? { id: reg.id, role: reg.role, status: reg.status } : null,
      };
    }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const supabase = createServiceClient();
  const body = await request.json().catch(() => null);
  const sanityId = typeof body?.sanityId === "string" ? body.sanityId : "";

  const board = await boardMembers();
  const person = board.find((m) => m.id === sanityId);
  if (!person) return NextResponse.json({ error: "Not a board member." }, { status: 400 });

  // ── Link this board member to a contact, by email ──
  if (body.action === "link") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    let contact = await findContactByEmail(supabase, email);
    if (!contact) {
      const [first, ...rest] = person.name.replace(/"[^"]*"\s*/g, "").trim().split(/\s+/);
      const { data, error } = await supabase
        .from("contacts")
        .insert({ email, first_name: first, last_name: rest.join(" ") || null, source: "Board Member" })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      contact = data;
    }
    const { error } = await supabase
      .from("board_links")
      .upsert({ sanity_id: sanityId, contact_id: contact!.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ linked: true });
  }

  // ── Set how this board member is going: "Mentor", "Staff", or null for not going ──
  if (body.action !== "set") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const as: "Mentor" | "Staff" | null = body.as === "Mentor" || body.as === STAFF_ROLE ? body.as : null;

  const { data: link } = await supabase
    .from("board_links")
    .select("contact_id")
    .eq("sanity_id", sanityId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "Link an email for this board member first." }, { status: 400 });

  const { data: existing } = await supabase
    .from("registrations")
    .select("id, role, status, payment_status")
    .eq("event_id", eventId)
    .eq("contact_id", link.contact_id)
    .maybeSingle<Reg>();

  const log = (id: string, from: string | null, to: string, detail: string) =>
    logRegistrationEvent({
      registrationId: id,
      kind: "status_change",
      source: "admin",
      actorId: member.id,
      fromStatus: from,
      toStatus: to,
      detail,
    });

  if (as === null) {
    if (!existing) return NextResponse.json({ ok: true });
    // Only undo what this panel did. Someone who paid or attended leaves through the board,
    // with a reason, like anyone else.
    if (existing.payment_status === "paid" || existing.status === "attended") {
      return NextResponse.json(
        { error: "They have already paid or attended. Move their card out on the board instead." },
        { status: 400 }
      );
    }
    await supabase.from("registrations").update({ mentor_id: null }).eq("mentor_id", existing.id);
    const { error } = await supabase.from("registrations").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (as === STAFF_ROLE) {
    if (existing?.role === STAFF_ROLE) return NextResponse.json({ ok: true });
    const patch = { role: STAFF_ROLE, status: "registered", is_board_member: true, mentor_id: null };
    if (existing) {
      // A mentor turned staff has no mentees any more.
      await supabase.from("registrations").update({ mentor_id: null }).eq("mentor_id", existing.id);
      const { error } = await supabase.from("registrations").update(patch).eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await log(existing.id, existing.status, "registered", "Board member set to staff");
    } else {
      const { data, error } = await supabase
        .from("registrations")
        .insert({ ...patch, contact_id: link.contact_id, event_id: eventId })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await log(data.id, null, "registered", "Board member added as staff");
    }
    return NextResponse.json({ ok: true });
  }

  // Mentor: approved, with a registration token, and sent the normal invite.
  if (existing?.role === "Mentor") return NextResponse.json({ ok: true });
  const token = randomBytes(24).toString("hex");
  const patch = { role: "Mentor", status: "approved", token, is_board_member: true };
  let regId: string;
  if (existing) {
    const { error } = await supabase.from("registrations").update(patch).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    regId = existing.id;
    await log(regId, existing.status, "approved", "Board member set to mentor");
  } else {
    const { data, error } = await supabase
      .from("registrations")
      .insert({ ...patch, contact_id: link.contact_id, event_id: eventId })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    regId = data.id;
    await log(regId, null, "approved", "Board member added as mentor");
  }

  const { data: invite } = await supabase
    .from("registrations")
    .select("token, contacts(email, first_name), events(title, slug, cost)")
    .eq("id", regId)
    .single();
  try {
    await sendApprovalEmails(invite ? [invite as never] : []);
  } catch (err) {
    console.error("Board mentor invite error:", err);
    return NextResponse.json({ ok: true, warning: "Added, but the invite email failed to send." });
  }
  return NextResponse.json({ ok: true, invited: true });
}
