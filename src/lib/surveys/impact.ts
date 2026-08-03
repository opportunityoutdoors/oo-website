import { SCALE_KEYS, type ScaleKey } from "./questions";
import { SCALE_SHORT_LABELS, type ResponseRow } from "./analytics";

// Impact metrics, structured as the three tiers the R3 evaluation standard uses.
//
//   Tier 1  Outputs   what we delivered. Necessary for reporting, not evidence of impact.
//   Tier 2  Outcomes  what changed in people, pre to post.
//   Tier 3  Impact    whether behaviour actually changed, measured at six months.
//
// The distinction is the whole point. The previous dashboard reported four outputs and
// called it impact, including a "participants served" figure that silently counted
// volunteer mentors alongside the people they were serving.
//
// Every derived number carries the sample it rests on. With single-digit cohorts a mean
// presented without n is misleading regardless of intent.

export type RegistrationRow = {
  id: string;
  contact_id: string;
  event_id: string;
  status: string;
  role: string | null;
  guardian_registration_id: string | null;
};

export type EventRow = {
  id: string;
  title: string;
  event_type: string;
  date_start: string | null;
  date_end: string | null;
};

export type ContactRow = { id: string; city: string | null };

const MENTOR = "Mentor";

/** Camps are mentorship under the sector definition; community days are not. */
export function isCamp(eventType: string): boolean {
  return eventType === "hunt-camp" || eventType === "fish-camp";
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function pct(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 100);
}

/* ─────────────────────────── Tier 1: outputs ─────────────────────────── */

export type Outputs = {
  eventsHeld: number;
  campsHeld: number;
  communityHeld: number;
  /** Participants only. Mentors are counted separately and never folded in. */
  peopleServed: number;
  uniquePeople: number;
  youthServed: number;
  mentorAttendances: number;
  uniqueMentors: number;
  /** Mentor attendances multiplied by event length: the in-kind figure for a grant. */
  volunteerDays: number;
  communitiesReached: number;
};

export function computeOutputs(
  events: EventRow[],
  registrations: RegistrationRow[],
  contacts: Map<string, ContactRow>,
  now = Date.now()
): Outputs {
  const held = events.filter((e) => {
    const ended = e.date_end || e.date_start;
    return ended && new Date(ended).getTime() < now;
  });

  const eventById = new Map(events.map((e) => [e.id, e]));
  const attended = registrations.filter((r) => r.status === "attended");

  const participants = attended.filter((r) => r.role !== MENTOR);
  const mentors = attended.filter((r) => r.role === MENTOR);

  // Length in days, inclusive, so a single-day event counts as one.
  const lengthOf = (e: EventRow | undefined): number => {
    if (!e?.date_start) return 1;
    const start = new Date(e.date_start).getTime();
    const end = new Date(e.date_end || e.date_start).getTime();
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  };

  const volunteerDays = mentors.reduce(
    (sum, r) => sum + lengthOf(eventById.get(r.event_id)),
    0
  );

  const cities = new Set(
    participants
      .map((r) => contacts.get(r.contact_id)?.city?.trim())
      .filter((c): c is string => Boolean(c))
  );

  return {
    eventsHeld: held.length,
    campsHeld: held.filter((e) => isCamp(e.event_type)).length,
    communityHeld: held.filter((e) => !isCamp(e.event_type)).length,
    peopleServed: participants.length,
    uniquePeople: new Set(participants.map((r) => r.contact_id)).size,
    // Minors are registered against a guardian rather than by age, which is the only
    // signal we hold.
    youthServed: participants.filter((r) => r.guardian_registration_id).length,
    mentorAttendances: mentors.length,
    uniqueMentors: new Set(mentors.map((r) => r.contact_id)).size,
    volunteerDays,
    communitiesReached: cities.size,
  };
}

/* ────────────────────────── Tier 2: outcomes ─────────────────────────── */

export type ScaleOutcome = {
  key: ScaleKey;
  label: string;
  preMean: number | null;
  postMean: number | null;
  /** Matched per-participant change, pre to post. */
  delta: number | null;
  matched: number;
  /** Matched change pre to six-month follow-up: did the gain hold? */
  retained: number | null;
  retainedMatched: number;
};

export type Outcomes = {
  scales: ScaleOutcome[];
  /** The single most important outcome for a mentorship organisation. */
  mentorshipMultiplier: ScaleOutcome | null;
  preCount: number;
  postCount: number;
  followupCount: number;
  recommendMean: number | null;
  recommendCount: number;
  metExpectationsMean: number | null;
  interestsGained: number;
};

function scaleValue(row: ResponseRow, key: ScaleKey): number | null {
  const col = {
    comfortSolo: "comfort_solo",
    comfortFindingSpots: "comfort_finding_spots",
    comfortPublicLand: "comfort_public_land",
    comfortTakingOthers: "comfort_taking_others",
    knowledgeFocus: "knowledge_focus",
    conservationInvolvement: "conservation_involvement",
  }[key] as keyof ResponseRow;
  const v = row[col];
  return typeof v === "number" ? v : null;
}

export function computeOutcomes(
  rows: ResponseRow[],
  excludeRegistrationIds: Set<string> = new Set()
): Outcomes {
  const usable = rows.filter((r) => !excludeRegistrationIds.has(r.registration_id));

  const pre = usable.filter((r) => r.kind === "pre");
  const post = usable.filter((r) => r.kind === "post");
  const followup = usable.filter((r) => r.kind === "followup");

  const postBy = new Map(post.map((r) => [r.registration_id, r]));
  const followBy = new Map(followup.map((r) => [r.registration_id, r]));

  const scales: ScaleOutcome[] = SCALE_KEYS.map((key) => {
    const changes: number[] = [];
    const retainedChanges: number[] = [];

    for (const preRow of pre) {
      const a = scaleValue(preRow, key);
      if (a === null) continue;

      const postRow = postBy.get(preRow.registration_id);
      if (postRow) {
        const b = scaleValue(postRow, key);
        if (b !== null) changes.push(b - a);
      }

      const followRow = followBy.get(preRow.registration_id);
      if (followRow) {
        const c = scaleValue(followRow, key);
        if (c !== null) retainedChanges.push(c - a);
      }
    }

    return {
      key,
      label: SCALE_SHORT_LABELS[key],
      preMean: mean(pre.map((r) => scaleValue(r, key)).filter((v): v is number => v !== null)),
      postMean: mean(post.map((r) => scaleValue(r, key)).filter((v): v is number => v !== null)),
      delta: mean(changes),
      matched: changes.length,
      retained: mean(retainedChanges),
      retainedMatched: retainedChanges.length,
    };
  });

  // Interests picked up between pre and post that were not selected before.
  const preBy = new Map(pre.map((r) => [r.registration_id, r]));
  let interestsGained = 0;
  for (const p of post) {
    const before = new Set(preBy.get(p.registration_id)?.interests || []);
    for (const i of p.interests || []) if (!before.has(i)) interestsGained++;
  }

  const num = (r: ResponseRow, k: string) => {
    const v = r.answers?.[k];
    return typeof v === "number" ? v : null;
  };

  const recommend = post.map((r) => num(r, "recommend")).filter((v): v is number => v !== null);
  const met = post.map((r) => num(r, "metExpectations")).filter((v): v is number => v !== null);

  return {
    scales,
    mentorshipMultiplier: scales.find((s) => s.key === "comfortTakingOthers") || null,
    preCount: pre.length,
    postCount: post.length,
    followupCount: followup.length,
    recommendMean: mean(recommend),
    recommendCount: recommend.length,
    metExpectationsMean: mean(met),
    interestsGained,
  };
}

/* ─────────────────────────── Tier 3: impact ──────────────────────────── */

export type Impact = {
  responded: number;
  /** Went out independently since the event. The retention proxy. */
  stillGoingOut: number;
  stillGoingOutPct: number | null;
  /** Took somebody else out. The recruitment multiplier. */
  tookSomeoneOut: number;
  tookSomeoneOutPct: number | null;
  boughtLicense: number;
  boughtLicensePct: number | null;
  wouldMentor: number;
  wouldMentorPct: number | null;
  /** Attended more than one event, measured across all time rather than per year. */
  returningParticipants: number;
  barriers: string[];
};

export function computeImpact(
  rows: ResponseRow[],
  allTimeAttendance: RegistrationRow[],
  excludeRegistrationIds: Set<string> = new Set()
): Impact {
  const followup = rows.filter(
    (r) => r.kind === "followup" && !excludeRegistrationIds.has(r.registration_id)
  );

  const str = (r: ResponseRow, k: string) => {
    const v = r.answers?.[k];
    return typeof v === "string" ? v : null;
  };

  // "Planning to" is explicitly not counted as going out. Intent is not behaviour, and
  // the whole reason for this tier is to stop treating the two as the same thing.
  const wentOut = followup.filter((r) =>
    ["several", "once_or_twice"].includes(str(r, "wentOut") || "")
  ).length;

  const tookSomeone = followup.filter((r) => str(r, "tookSomeoneOut") === "yes").length;
  const license = followup.filter((r) => str(r, "boughtLicense") === "yes").length;
  const mentor = followup.filter((r) => str(r, "wouldMentor") === "yes").length;

  const perContact = new Map<string, number>();
  for (const r of allTimeAttendance) {
    if (r.status !== "attended" || r.role === MENTOR) continue;
    perContact.set(r.contact_id, (perContact.get(r.contact_id) || 0) + 1);
  }

  const n = followup.length;

  return {
    responded: n,
    stillGoingOut: wentOut,
    stillGoingOutPct: pct(wentOut, n),
    tookSomeoneOut: tookSomeone,
    tookSomeoneOutPct: pct(tookSomeone, n),
    boughtLicense: license,
    boughtLicensePct: pct(license, n),
    wouldMentor: mentor,
    wouldMentorPct: pct(mentor, n),
    returningParticipants: [...perContact.values()].filter((c) => c > 1).length,
    barriers: followup
      .map((r) => str(r, "whatWouldHelp"))
      .filter((v): v is string => Boolean(v && v.trim())),
  };
}
