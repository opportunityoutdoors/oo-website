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
  exit_reason?: string | null;
  role: string | null;
  payment_status: string | null;
  waiver_signed: boolean;
  meeting_date_selected: string | null;
  welcome_packet_sent?: boolean;
  mentor_id?: string | null;
  guardian_registration_id?: string | null;
  created_at?: string | null;
  contacts: {
    id?: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    date_of_birth: string | null;
    background_check_status: string | null;
    background_check_expires_at: string | null;
    email_confirmed_at?: string | null;
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

// ── Positions ────────────────────────────────────────────────────────────────
//
// Where a person IS, as opposed to what they have satisfied. Exactly one at a time, changed
// by a human decision rather than by a requirement resolving on its own.
//
// The stages above conflated these two ideas, which is what produced a pipeline you could
// only walk one way: "payment" is not a place anyone stands. Requirements are still computed
// by computePipeline(); this answers the different question of which column a card is in.

export type Position =
  | "waitlist"
  | "invited"
  | "registered"
  | "ready"
  | "attended"
  | "turned_away"
  | "dropped_out";

export const POSITIONS: { key: Position; label: string; blurb: string }[] = [
  { key: "waitlist", label: "Waitlist", blurb: "awaiting your decision" },
  { key: "invited", label: "Invited", blurb: "awaiting their registration" },
  { key: "registered", label: "Registered", blurb: "requirements outstanding" },
  { key: "ready", label: "Ready", blurb: "cleared and matched" },
  { key: "attended", label: "Attended", blurb: "they came" },
  { key: "turned_away", label: "Turned away", blurb: "our decision" },
  { key: "dropped_out", label: "Dropped out", blurb: "their choice or silence" },
];

/** Why someone left. Mirrors the check constraint in migration 031. */
export const EXIT_REASONS: {
  value: string;
  label: string;
  position: Extract<Position, "turned_away" | "dropped_out">;
  /** Shown in the UI when the reason has a consequence beyond the record. */
  consequence?: string;
}[] = [
  { value: "denied_at_review", label: "Denied at review", position: "turned_away" },
  {
    value: "screening_declined",
    label: "Declined after a background check",
    position: "turned_away",
    consequence: "Adverse action and refund are handled by the screening flow, not here.",
  },
  { value: "removed_for_conduct", label: "Removed for conduct", position: "turned_away" },

  { value: "never_registered", label: "Never registered", position: "dropped_out" },
  { value: "never_paid", label: "Never paid", position: "dropped_out" },
  { value: "stopped_responding", label: "Stopped responding", position: "dropped_out" },
  { value: "cannot_make_it", label: "Told us they cannot make it", position: "dropped_out" },
  {
    value: "withdrew_after_paying",
    label: "Withdrew after paying",
    position: "dropped_out",
    consequence: "Not refunded as a rule. Camp costs are committed in advance.",
  },
  {
    value: "no_show",
    label: "Did not show up",
    position: "dropped_out",
    consequence:
      "The only exit that can happen to someone who cleared everything. Worth knowing: it means the whole process worked and they still did not come.",
  },
];

/**
 * Which column a registration belongs in.
 *
 * Order matters. Exits are checked first because someone who has left the pipeline is not
 * also "registered but unpaid": leaving overrides everything about their progress.
 */
export function position(r: PipelineReg): Position {
  if (r.status === "attended") return "attended";

  // A screening decline is recorded on the CONTACT, not the registration, because it is a
  // decision about a person that outlives any one camp. Without this, a declined person sits
  // in Registered showing "no check", which reads as somebody waiting on paperwork rather
  // than somebody OO has turned away and refunded.
  if (r.contacts?.background_check_status === "declined") return "turned_away";

  if (r.status === "denied") return "turned_away";
  if (r.status === "withdrawn") {
    // The reason decides the column, because a withdrawal and a decline are both recorded
    // as an exit but belong on opposite sides of the board.
    const known = EXIT_REASONS.find((x) => x.value === r.exit_reason);
    return known?.position ?? "dropped_out";
  }

  if (r.status === "waitlist" || r.status === "meeting_rsvp") return "waitlist";
  if (r.status === "approved") return "invited";

  // Registered. Ready means every requirement is met, which is the same rule the welcome
  // packet gate uses, so a card in Ready is exactly a card that can receive one.
  if (r.status === "registered") {
    const done =
      r.waiver_signed &&
      r.payment_status === "paid" &&
      isCleared(r) &&
      isMatched(r);
    return done ? "ready" : "registered";
  }

  return "registered";
}

/** Groups registrations into board columns, preserving input order within each. */
export function byPosition(registrations: PipelineReg[]): Record<Position, PipelineReg[]> {
  const out = Object.fromEntries(
    POSITIONS.map((p) => [p.key, [] as PipelineReg[]])
  ) as Record<Position, PipelineReg[]>;

  for (const r of registrations) out[position(r)].push(r);
  return out;
}

/**
 * Email confirmation applies to signups from this moment on. Everyone who signed up before it
 * (the whole 2026 Deer Camp waitlist) was never sent a link and is approved as before. Decided
 * 2026-10-14: start with the next new event, ask nothing of current enrollees.
 */
export const EMAIL_CONFIRMATION_STARTS = "2026-10-14T00:00:00Z";

/** Whether a signup made at `createdAt` must confirm its email before approval. */
export function confirmationRequired(createdAt: string | null | undefined): boolean {
  return Boolean(createdAt) && new Date(createdAt as string) >= new Date(EMAIL_CONFIRMATION_STARTS);
}

/**
 * True when this person's own email is unconfirmed, which blocks approval. A minor has no
 * email of their own, so it is never true for one: their guardian's card carries it.
 */
export function emailUnconfirmed(r: PipelineReg): boolean {
  if (r.guardian_registration_id) return false;
  if (!confirmationRequired(r.created_at)) return false;
  return !r.contacts?.email_confirmed_at;
}

/**
 * What a person has and still owes, for the badges on their card.
 *
 * Each requirement carries its own wording for both states rather than the card prefixing
 * "no", which produced "no paid".
 */
export function requirements(r: PipelineReg): { label: string; met: boolean }[] {
  const pair = (met: boolean, yes: string, no: string) => ({ label: met ? yes : no, met });

  const reqs = [
    pair(Boolean(r.waiver_signed), "waiver", "no waiver"),
    pair(r.payment_status === "paid", "paid", "unpaid"),
    pair(isCleared(r), "cleared", "no check"),
  ];
  // A mentor needs no mentor, so showing them an unmet "mentor" badge would be a lie.
  if (r.role === "Mentee") reqs.push(pair(isMatched(r), "matched", "no mentor"));
  return reqs;
}

/** Sizes in the order the registration form offers them. */
export const SHIRT_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;

export type ShirtTally = {
  /** Everyone approved or further along, who will be at camp unless they drop out. */
  expected: number;
  /** Of those, registered and paid, which is when their size is final. */
  done: number;
  /** Size counts among the done, in SHIRT_SIZES order, then "Other" for anything else. */
  sizes: { size: string; count: number }[];
  /** Done people with no size on file, who need asking before the order goes in. */
  noSize: number;
};

/**
 * The t-shirt order for a camp. Counts only people registered and paid, the same "paid" rule
 * Ready uses, so the numbers do not move under you once the order is placed. The size is the
 * one on the contact, which the registration form sets.
 */
export function shirtTally(
  registrations: (PipelineReg & { contacts: (PipelineReg["contacts"] & { tshirt_size?: string | null }) | null })[]
): ShirtTally {
  const active = registrations.filter((r) =>
    ["invited", "registered", "ready", "attended"].includes(position(r))
  );
  const done = active.filter(
    (r) => (r.status === "registered" || r.status === "attended") && r.payment_status === "paid"
  );

  const counts = new Map<string, number>();
  let noSize = 0;
  for (const r of done) {
    const raw = r.contacts?.tshirt_size?.trim().toUpperCase();
    if (!raw) {
      noSize += 1;
      continue;
    }
    const size = (SHIRT_SIZES as readonly string[]).includes(raw) ? raw : "Other";
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  const sizes = [...SHIRT_SIZES, "Other"]
    .map((size) => ({ size, count: counts.get(size) ?? 0 }))
    .filter((s) => s.size !== "Other" || s.count > 0);

  return { expected: active.length, done: done.length, sizes, noSize };
}
