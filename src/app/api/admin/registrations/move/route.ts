import { NextRequest, NextResponse } from "next/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { EXIT_REASONS, type Position } from "@/lib/camp-pipeline";
import { unconfirmedNames, unconfirmedRefusal } from "@/lib/email-confirmation";
import { approveRegistrations } from "@/lib/email/approval";
import { logRegistrationEvent } from "@/lib/registration-log";

// Moving a card between columns on the camp board.
//
// Every move is logged, including backwards ones. Being able to go back is the point of the
// rework; recording it is what makes that safe rather than merely possible.

/**
 * Which registration status each column writes.
 *
 * READY IS ABSENT ON PURPOSE. Ready is not a place anyone is put, it is a place they arrive:
 * it means every requirement is met, and requirements are facts about waivers, payments and
 * background checks rather than something an admin can assert. Dropping a card there would
 * either be a lie or a no-op, so the drop is refused with an explanation instead.
 *
 * Dragging INTO Registered is allowed, and a card that then satisfies everything will move
 * itself into Ready on the next render. That is the correct direction of causation.
 */
const POSITION_STATUS: Partial<Record<Position, string>> = {
  waitlist: "waitlist",
  invited: "approved",
  registered: "registered",
  attended: "attended",
  turned_away: "denied",
  dropped_out: "withdrawn",
};

export async function POST(req: NextRequest) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const registrationId =
    typeof body.registrationId === "string" ? body.registrationId : null;
  const to = body.to as Position;
  const exitReason = typeof body.exitReason === "string" ? body.exitReason : null;
  const note = typeof body.note === "string" ? body.note.trim() : null;

  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
  }

  if (to === "ready") {
    return NextResponse.json(
      {
        error:
          "Ready is not somewhere you can put someone. It means every requirement is met, " +
          "so a person moves there on their own once their waiver, payment, background check " +
          "and mentor are all in place.",
      },
      { status: 400 }
    );
  }

  const status = POSITION_STATUS[to];
  if (!status) {
    return NextResponse.json({ error: "Unknown column." }, { status: 400 });
  }

  const leaving = to === "turned_away" || to === "dropped_out";

  if (leaving) {
    const known = EXIT_REASONS.find((x) => x.value === exitReason);
    if (!known) {
      return NextResponse.json(
        { error: "Choose a reason before moving someone out of the pipeline." },
        { status: 400 }
      );
    }
    if (known.position !== to) {
      return NextResponse.json(
        { error: `"${known.label}" does not belong in that column.` },
        { status: 400 }
      );
    }
  }

  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from("registrations")
    .select("id, status, contact_id, contacts(background_check_status)")
    .eq("id", registrationId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // A screening decline is a decision with an FCRA notice and a refund behind it, recorded
  // against the contact rather than this registration. Dragging a card must not quietly
  // undo it: the person would move back onto the board still carrying 'declined', and the
  // welcome packet gate would keep refusing them for reasons the board no longer shows.
  const contact = Array.isArray(current.contacts) ? current.contacts[0] : current.contacts;
  if (contact?.background_check_status === "declined" && !leaving) {
    return NextResponse.json(
      {
        error:
          "This person was declined after a background check. That decision is not reversed " +
          "by moving a card, and they cannot take part while it stands.",
      },
      { status: 400 }
    );
  }

  // Same gate as the bulk approve in ../route.ts.
  if (status === "approved") {
    const names = await unconfirmedNames(supabase, [registrationId]);
    if (names.length) {
      return NextResponse.json({ error: unconfirmedRefusal(names) }, { status: 400 });
    }
  }

  const patch: Record<string, unknown> = { status };

  if (leaving) {
    patch.exit_reason = exitReason;
    patch.exited_at = new Date().toISOString();
    patch.exited_by = member.id;
  } else {
    // Coming back into the pipeline clears the exit, so a returning person does not carry a
    // stale "never paid" around with them.
    patch.exit_reason = null;
    patch.exited_at = null;
    patch.exited_by = null;
  }

  // Guarded on the status we read, so two admins dragging the same card at once cannot both
  // apply. Same pattern as the screening review path.
  const { data: updated, error: updateError } = await supabase
    .from("registrations")
    .update(patch)
    .eq("id", registrationId)
    .eq("status", current.status)
    .select("id");

  if (updateError || !updated?.length) {
    return NextResponse.json(
      {
        error:
          updateError?.message ??
          "Somebody else moved this card while you were dragging it. Reload and try again.",
      },
      { status: 409 }
    );
  }

  // After the move, not before. A log of moves that did not happen is worse than no log.
  const { error: logError } = await supabase.from("registration_events").insert({
    registration_id: registrationId,
    kind: "status_change",
    source: "admin",
    from_status: current.status,
    to_status: status,
    exit_reason: leaving ? exitReason : null,
    moved_by: member.id,
    note: note || null,
  });

  if (logError) {
    // Never fatal: the move is already applied and undoing it to preserve a log would be a
    // worse outcome than a gap in the log. Loud, because that gap is real.
    console.error(
      `Registration ${registrationId} moved ${current.status} -> ${status} but the move was ` +
        `NOT logged: ${logError.message}`
    );
  }

  // A card dragged into Invited is an approval, the same as the bulk Approve: a token, linked
  // minors carried along, and the invite email. Before 2026-10-20 it only changed the status,
  // so the person had no registration link and was never told.
  if (status === "approved") {
    const { minors, emailed, failed } = await approveRegistrations(supabase, [registrationId]);
    await Promise.all(
      minors.map((m) =>
        logRegistrationEvent({
          registrationId: m.id,
          kind: "status_change",
          source: "admin",
          actorId: member.id,
          fromStatus: m.fromStatus,
          toStatus: status,
        })
      )
    );
    return NextResponse.json({ ok: true, status, logged: !logError, emailed, failed });
  }

  return NextResponse.json({ ok: true, status, logged: !logError });
}
