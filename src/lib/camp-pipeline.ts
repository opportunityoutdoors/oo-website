import { evaluateEligibility, mayParticipate } from "./background-check/eligibility";

// The camp sequence, in one definition.
//
//   waitlist -> zoom -> approved/invited -> registered -> waiver -> paid
//            -> background check -> matched -> welcome packet
//
// Shared by the pipeline panel and the registrant table deliberately. They are the same
// question asked twice: the panel says how many are stuck at a stage, the table says who.
// Two copies of these predicates would eventually disagree, and the first anyone would know
// is a count that does not match the list under it.

export type PipelineReg = {
  id: string;
  status: string;
  role: string | null;
  payment_status: string | null;
  waiver_signed: boolean;
  meeting_date_selected: string | null;
  welcome_packet_sent?: boolean;
  mentor_id?: string | null;
  guardian_registration_id?: string | null;
  contacts: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    date_of_birth: string | null;
    background_check_status: string | null;
    background_check_expires_at: string | null;
  } | null;
};

export type StageKey =
  | "waitlist"
  | "meeting"
  | "approved"
  | "registered"
  | "waiver"
  | "paid"
  | "screening"
  | "matched"
  | "packet";

export type Stage = {
  key: StageKey;
  label: string;
  /** How many reached this stage. */
  done: number;
  /** Out of how many reached the stage before it. */
  of: number;
  /** Registrations that have not cleared this stage. The actionable set. */
  stuck: PipelineReg[];
  /** Why they are stuck, in words. */
  note?: string;
};

export function nameOf(r: PipelineReg): string {
  const c = r.contacts;
  return [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Unknown";
}

export function isCleared(r: PipelineReg): boolean {
  const c = r.contacts;
  return mayParticipate(
    evaluateEligibility({
      dateOfBirth: c?.date_of_birth ?? null,
      status: (c?.background_check_status ?? "none") as never,
      expiresAt: c?.background_check_expires_at ?? null,
    })
  );
}

/** A mentor needs no mentor, and a minor is matched through the guardian they arrived with. */
export function isMatched(r: PipelineReg): boolean {
  if (r.role !== "Mentee") return true;
  return Boolean(r.mentor_id || r.guardian_registration_id);
}

export type Pipeline = {
  stages: Stage[];
  /** Everyone still in play. Denied people have left. */
  active: PipelineReg[];
  /** Passed every stage. */
  through: PipelineReg[];
  /** Passed every stage and has not had a packet. Guardianed minors are emailed via their guardian. */
  sendable: PipelineReg[];
  sent: PipelineReg[];
  /** DISTINCT people not yet through. Never the sum of the stuck lists, which double counts. */
  notThrough: PipelineReg[];
};

export function computePipeline(registrations: PipelineReg[]): Pipeline {
  const active = registrations.filter((r) => r.status !== "denied");

  const pastWaitlist = active.filter((r) => r.status !== "waitlist");
  const met = active.filter(
    (r) =>
      r.meeting_date_selected ||
      ["approved", "registered", "attended"].includes(r.status)
  );
  const approved = active.filter((r) =>
    ["approved", "registered", "attended"].includes(r.status)
  );
  const registered = active.filter((r) => ["registered", "attended"].includes(r.status));
  const signed = registered.filter((r) => r.waiver_signed);
  const paid = registered.filter((r) => r.payment_status === "paid");
  const cleared = paid.filter(isCleared);
  const matched = cleared.filter(isMatched);
  const sent = matched.filter((r) => r.welcome_packet_sent);
  const sendable = matched.filter((r) => !r.welcome_packet_sent && !r.guardian_registration_id);

  const stages: Stage[] = [
    {
      key: "waitlist",
      label: "Waitlist",
      done: pastWaitlist.length,
      of: active.length,
      stuck: active.filter((r) => r.status === "waitlist"),
      note: "waiting to be moved on",
    },
    {
      key: "meeting",
      label: "Zoom meeting",
      done: met.length,
      of: pastWaitlist.length,
      stuck: pastWaitlist.filter((r) => !met.includes(r)),
      note: "no meeting slot chosen",
    },
    {
      key: "approved",
      label: "Approved / invited",
      done: approved.length,
      of: met.length,
      stuck: met.filter((r) => !approved.includes(r)),
      note: "met but not yet approved or invited",
    },
    {
      key: "registered",
      label: "Registered",
      done: registered.length,
      of: approved.length,
      stuck: approved.filter((r) => !registered.includes(r)),
      note: "invited but has not completed the form",
    },
    {
      key: "waiver",
      label: "Waiver signed",
      done: signed.length,
      of: registered.length,
      stuck: registered.filter((r) => !r.waiver_signed),
      note: "waiver not signed",
    },
    {
      key: "paid",
      label: "Paid",
      done: paid.length,
      of: registered.length,
      stuck: registered.filter((r) => r.payment_status !== "paid"),
      note: "not paid",
    },
    {
      key: "screening",
      label: "Background check",
      done: cleared.length,
      of: paid.length,
      stuck: paid.filter((r) => !isCleared(r)),
      note: "not cleared to attend",
    },
    {
      key: "matched",
      label: "Matched",
      done: matched.length,
      of: cleared.length,
      stuck: cleared.filter((r) => !isMatched(r)),
      note: "needs a mentor",
    },
    {
      key: "packet",
      label: "Welcome packet",
      done: sent.length,
      of: matched.length,
      stuck: sendable,
      note: "cleared every stage, packet not sent",
    },
  ];

  // `matched` is the last gate before sending, and reaching it means every earlier stage was
  // passed, so anyone outside it is not through.
  const notThrough = active.filter((r) => !matched.includes(r));

  return { stages, active, through: matched, sendable, sent, notThrough };
}
