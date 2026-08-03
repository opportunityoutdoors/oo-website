import { SCALE_KEYS, type ScaleKey } from "./questions";

// Shared math for the event Stats tab and the year-to-date rollup on the dashboard.
//
// The headline number is the MATCHED delta: averaged per participant across people who
// answered both the pre and the post, not the difference of two independent averages.
// Those are not the same thing. If the people who bother to answer afterward are the ones
// who had the best time, an unmatched comparison flatters the result; matching removes
// that bias because every person in the number is their own control.
//
// Mentors are excluded from the headline delta. A volunteer who has hunted for twenty
// years starts and finishes near the top of every scale, so including them drags the
// average toward zero and understates what actually happened to the participants. Their
// responses are still counted and reported separately.

/** Column names on survey_responses, keyed by the camelCase question key. */
export const SCALE_COLUMNS: Record<ScaleKey, string> = {
  comfortSolo: "comfort_solo",
  comfortFindingSpots: "comfort_finding_spots",
  comfortPublicLand: "comfort_public_land",
  comfortTakingOthers: "comfort_taking_others",
  knowledgeFocus: "knowledge_focus",
  conservationInvolvement: "conservation_involvement",
};

/** Short labels for the dashboard, where the full question text is too long. */
export const SCALE_SHORT_LABELS: Record<ScaleKey, string> = {
  comfortSolo: "Going out solo",
  comfortFindingSpots: "Finding spots",
  comfortPublicLand: "Using public land",
  comfortTakingOthers: "Taking someone else",
  knowledgeFocus: "Species knowledge",
  conservationInvolvement: "Conservation involvement",
};

export type ResponseRow = {
  registration_id: string;
  contact_id: string;
  event_id: string;
  kind: "pre" | "post" | "followup";
  comfort_solo: number | null;
  comfort_finding_spots: number | null;
  comfort_public_land: number | null;
  comfort_taking_others: number | null;
  knowledge_focus: number | null;
  conservation_involvement: number | null;
  interests: string[] | null;
  answers: Record<string, unknown> | null;
};

export type ScaleStat = {
  key: ScaleKey;
  label: string;
  preMean: number | null;
  postMean: number | null;
  /** Matched per-participant change. Null when nobody answered both sides. */
  delta: number | null;
  /** How many people the delta is computed over. */
  matched: number;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

function scaleValue(row: ResponseRow, key: ScaleKey): number | null {
  const v = row[SCALE_COLUMNS[key] as keyof ResponseRow];
  return typeof v === "number" ? v : null;
}

/**
 * Per-scale pre mean, post mean, and matched delta.
 *
 * `excludeRegistrationIds` drops mentors from the delta while leaving them in the raw
 * means, so the Stats tab can show both without running the query twice.
 */
export function computeScaleStats(
  rows: ResponseRow[],
  excludeRegistrationIds: Set<string> = new Set()
): ScaleStat[] {
  const pre = rows.filter((r) => r.kind === "pre");
  const post = rows.filter((r) => r.kind === "post");

  const postByRegistration = new Map(post.map((r) => [r.registration_id, r]));

  return SCALE_KEYS.map((key) => {
    const preValues = pre
      .map((r) => scaleValue(r, key))
      .filter((v): v is number => v !== null);
    const postValues = post
      .map((r) => scaleValue(r, key))
      .filter((v): v is number => v !== null);

    const changes: number[] = [];
    for (const preRow of pre) {
      if (excludeRegistrationIds.has(preRow.registration_id)) continue;
      const postRow = postByRegistration.get(preRow.registration_id);
      if (!postRow) continue;
      const a = scaleValue(preRow, key);
      const b = scaleValue(postRow, key);
      if (a === null || b === null) continue;
      changes.push(b - a);
    }

    return {
      key,
      label: SCALE_SHORT_LABELS[key],
      preMean: round1(mean(preValues)),
      postMean: round1(mean(postValues)),
      delta: round1(mean(changes)),
      matched: changes.length,
    };
  });
}

/** Interest counts before and after, plus what was newly picked up. */
export function computeInterestShift(rows: ResponseRow[]) {
  const preCounts = new Map<string, number>();
  const postCounts = new Map<string, number>();

  const bump = (m: Map<string, number>, k: string) =>
    m.set(k, (m.get(k) || 0) + 1);

  for (const r of rows) {
    const target = r.kind === "pre" ? preCounts : postCounts;
    for (const i of r.interests || []) bump(target, i);
  }

  // Interests a participant did not select before the event but did after. This is the
  // board's "interest in other activities" measure.
  const preByRegistration = new Map(
    rows.filter((r) => r.kind === "pre").map((r) => [r.registration_id, r])
  );
  const gained = new Map<string, number>();

  for (const postRow of rows.filter((r) => r.kind === "post")) {
    const preRow = preByRegistration.get(postRow.registration_id);
    if (!preRow) continue;
    const before = new Set(preRow.interests || []);
    for (const i of postRow.interests || []) {
      if (!before.has(i)) bump(gained, i);
    }
  }

  const keys = new Set([...preCounts.keys(), ...postCounts.keys()]);
  return [...keys]
    .map((interest) => ({
      interest,
      pre: preCounts.get(interest) || 0,
      post: postCounts.get(interest) || 0,
      gained: gained.get(interest) || 0,
    }))
    .sort((a, b) => b.post - a.post || b.pre - a.pre);
}

function numberAnswer(row: ResponseRow, key: string): number | null {
  const v = row.answers?.[key];
  return typeof v === "number" ? v : null;
}

function textAnswer(row: ResponseRow, key: string): string | null {
  const v = row.answers?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Post-only extras: recommend, met-expectations, free text, and follow-up interest. */
export function computePostExtras(rows: ResponseRow[]) {
  const post = rows.filter((r) => r.kind === "post");

  const recommend = post
    .map((r) => numberAnswer(r, "recommend"))
    .filter((v): v is number => v !== null);
  const met = post
    .map((r) => numberAnswer(r, "metExpectations"))
    .filter((v): v is number => v !== null);

  const followUp = new Map<string, number>();
  for (const r of post) {
    const list = r.answers?.followUp;
    if (!Array.isArray(list)) continue;
    for (const f of list) {
      if (typeof f === "string") followUp.set(f, (followUp.get(f) || 0) + 1);
    }
  }

  return {
    recommendMean: round1(mean(recommend)),
    recommendCount: recommend.length,
    metExpectationsMean: round1(mean(met)),
    metExpectationsCount: met.length,
    favoriteParts: post
      .map((r) => textAnswer(r, "favoritePart"))
      .filter((v): v is string => v !== null),
    followUp: [...followUp.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Pre-only free text, for reading what people showed up wanting. */
export function computeExpectations(rows: ResponseRow[]): string[] {
  return rows
    .filter((r) => r.kind === "pre")
    .map((r) => textAnswer(r, "expectations"))
    .filter((v): v is string => v !== null);
}
