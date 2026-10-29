import { createServiceClient } from "@/lib/supabase/server";

// Writing to the registration timeline.
//
// One helper rather than an insert at each call site, because the value of this log is that
// it is COMPLETE. A transition that forgets to log is not a small gap: it is a profile that
// confidently shows a sequence with a hole in it, which is worse than showing nothing,
// because a reader has no way to tell the difference.
//
// Never throws. A failed log must not roll back the thing it was describing: refusing a
// payment because its audit row would not write is the wrong trade every time. Failures are
// logged loudly to the console instead, which is a gap somebody can find.

export type EventKind =
  | "created"
  | "status_change"
  | "meeting_selected"
  | "registered"
  | "waiver_signed"
  | "paid"
  | "refunded"
  | "check_ordered"
  | "check_reminder"
  | "check_result"
  | "panel_decision"
  | "matched"
  | "packet_sent"
  | "attended"
  | "registration_reminder";

export type LogInput = {
  registrationId: string;
  kind: EventKind;
  /**
   * Who caused it.
   *
   * 'system' means a webhook or a cron with no human behind it, and must leave actorId null.
   * The distinction matters when reading a timeline months later: "nobody did this, it
   * happened" is different from "we do not know who did this".
   */
  source: "admin" | "system" | "participant";
  actorId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  exitReason?: string | null;
  /** An amount, a provider result, a mentor's name. Anything that is not a status. */
  detail?: string | null;
  note?: string | null;
};

export async function logRegistrationEvent(input: LogInput): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("registration_events").insert({
      registration_id: input.registrationId,
      kind: input.kind,
      source: input.source,
      moved_by: input.source === "system" ? null : (input.actorId ?? null),
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      exit_reason: input.exitReason ?? null,
      detail: input.detail ?? null,
      note: input.note ?? null,
    });

    if (error) {
      console.error(
        `TIMELINE GAP: could not log ${input.kind} for registration ${input.registrationId}: ${error.message}`
      );
    }
  } catch (err) {
    console.error(
      `TIMELINE GAP: could not log ${input.kind} for registration ${input.registrationId}:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/** Several registrations, one kind. Used by the bulk actions, which are the common case. */
export async function logRegistrationEvents(
  registrationIds: string[],
  rest: Omit<LogInput, "registrationId">
): Promise<void> {
  await Promise.all(
    registrationIds.map((registrationId) =>
      logRegistrationEvent({ ...rest, registrationId })
    )
  );
}
