// Question definitions shared by the pre survey (embedded in the registration forms), the
// post survey page, and the server-side validation on both.
//
// Design rules, in order of importance:
//
//  1. The six scales are asked IDENTICALLY pre and post. The delta is the product, so any
//     wording drift between the two would measure the question change rather than the
//     participant. The original Google Forms surveys drifted here ("how involved are you"
//     pre vs "how much do you intend to be involved" post), which quietly made that pair
//     invalid. Both now use the same present-tense wording.
//
//  2. Wording matches the original Google Forms ("How comfortable are you...", anchored
//     "Not comfortable" to "Extremely comfortable") so new responses stay comparable to
//     the historical data collected before the website existed.
//
//  3. Only the noun changes by event type, never the scale or the meaning. A hunt camp
//     asks about hunting, a fish camp about fishing, a community day about getting
//     outdoors. Pre and post are always the same event, so a pair always matches.
//
//  4. Nothing the system already knows is asked: name, email, which event, its date, its
//     type, the person's role. Nor years of experience, which cannot change over one
//     weekend and so would produce a meaningless delta. That belongs on the profile.

import { ALL_INTEREST_VALUES } from "@/lib/constants/interests";

export type SurveyKind = "pre" | "post" | "followup";

/** Matches the event_type enum in Supabase; anything else falls back to generic wording. */
export type EventKind = "hunt-camp" | "fish-camp" | "community" | "workshop" | string;

export const SCALE_MIN = 1;
export const SCALE_MAX = 10;

/** The six measured dimensions. Keys map 1:1 to columns on survey_responses. */
export const SCALE_KEYS = [
  "comfortSolo",
  "comfortFindingSpots",
  "comfortPublicLand",
  "comfortTakingOthers",
  "knowledgeFocus",
  "conservationInvolvement",
] as const;

export type ScaleKey = (typeof SCALE_KEYS)[number];

export type SurveyAnswers = Record<ScaleKey, number> & {
  interests: string[];
  /** Pre only. */
  expectations?: string;
  /** Post only. */
  metExpectations?: number;
  favoritePart?: string;
  recommend?: number;
  followUp?: string[];
  /**
   * Follow-up only. These are the Tier 3 behaviour measures: the R3 standard treats
   * continued participation, not attendance or immediate confidence, as the outcome.
   * `wentOut` and `tookSomeoneOut` are the two that matter most, the second being the
   * recruitment multiplier that Opportunity Outdoors' whole theory of change rests on.
   */
  wentOut?: string;
  tookSomeoneOut?: string;
  boughtLicense?: string;
  wouldMentor?: string;
  whatWouldHelp?: string;
};

export type ScaleQuestion = {
  key: ScaleKey;
  label: string;
  lowLabel: string;
  highLabel: string;
};

const COMFORT_ANCHORS = {
  lowLabel: "Not comfortable",
  highLabel: "Extremely comfortable",
};

type Wording = {
  solo: string;
  findingSpots: string;
  publicLand: string;
  takingOthers: string;
  knowledge: string;
};

const HUNT: Wording = {
  solo: "How comfortable are you hunting on your own?",
  findingSpots: "How comfortable are you finding public land spots to hunt?",
  publicLand: "How comfortable are you hunting public lands?",
  takingOthers: "How comfortable are you taking someone hunting with you?",
  knowledge:
    "How knowledgeable do you feel about the species we are hunting at this camp?",
};

const FISH: Wording = {
  solo: "How comfortable are you fishing on your own?",
  findingSpots: "How comfortable are you finding public water to fish?",
  publicLand: "How comfortable are you fishing public waters?",
  takingOthers: "How comfortable are you taking someone fishing with you?",
  knowledge:
    "How knowledgeable do you feel about the fishing we are doing at this camp?",
};

const GENERAL: Wording = {
  solo: "How comfortable are you heading outdoors on your own?",
  findingSpots:
    "How comfortable are you finding public land and water to get out on?",
  publicLand: "How comfortable are you actually getting out and using it?",
  takingOthers: "How comfortable are you bringing someone else out with you?",
  knowledge: "How knowledgeable do you feel about what this event covers?",
};

function wordingFor(eventKind: EventKind): Wording {
  if (eventKind === "hunt-camp") return HUNT;
  if (eventKind === "fish-camp") return FISH;
  return GENERAL;
}

/**
 * The six scales, worded for this event type. Identical for pre and post by design:
 * `kind` is deliberately not a parameter here.
 */
export function scaleQuestions(eventKind: EventKind): ScaleQuestion[] {
  const w = wordingFor(eventKind);
  return [
    { key: "comfortSolo", label: w.solo, ...COMFORT_ANCHORS },
    { key: "comfortFindingSpots", label: w.findingSpots, ...COMFORT_ANCHORS },
    { key: "comfortPublicLand", label: w.publicLand, ...COMFORT_ANCHORS },
    { key: "comfortTakingOthers", label: w.takingOthers, ...COMFORT_ANCHORS },
    {
      key: "knowledgeFocus",
      label: w.knowledge,
      lowLabel: "Not at all",
      highLabel: "Extremely knowledgeable",
    },
    {
      key: "conservationInvolvement",
      // Same present tense on both kinds. See rule 1 above.
      label: "How involved are you with conservation in NC?",
      lowLabel: "Not involved at all",
      highLabel: "Very involved",
    },
  ];
}

export const INTERESTS_QUESTION = {
  label: "What are you interested in learning more about?",
  hint: "Select everything that applies. We ask again afterward to see what shifted.",
};

export const EXPECTATIONS_QUESTION = {
  label: "What are you hoping to get out of this?",
};

export const MET_EXPECTATIONS_QUESTION = {
  label: "Did this meet your expectations?",
  lowLabel: "Not at all",
  highLabel: "Exceeded them",
};

export const FAVORITE_PART_QUESTION = {
  label: "What was your favorite part?",
};

export const RECOMMEND_QUESTION = {
  label: "How likely are you to recommend this to a friend?",
  lowLabel: "Not likely",
  highLabel: "Very likely",
};

/* ─── Follow-up only: the Tier 3 behaviour questions ─── */

/**
 * Wording swaps by event type the same way the scales do. "Since camp, have you been
 * hunting on your own?" is a question somebody can answer without thinking; a generic
 * version is not.
 */
export function followupQuestions(eventKind: EventKind) {
  const w = wordingFor(eventKind);
  const activity =
    eventKind === "hunt-camp"
      ? "hunting"
      : eventKind === "fish-camp"
        ? "fishing"
        : "out";

  return {
    wentOut: {
      key: "wentOut" as const,
      label: `Since the event, have you been ${activity} on your own?`,
      options: [
        { label: "Yes, several times", value: "several" },
        { label: "Yes, once or twice", value: "once_or_twice" },
        { label: "Not yet, but I plan to", value: "planning" },
        { label: "No", value: "no" },
      ],
    },
    tookSomeoneOut: {
      key: "tookSomeoneOut" as const,
      label: `Have you taken someone else ${activity} since then?`,
      options: [
        { label: "Yes", value: "yes" },
        { label: "Not yet, but I'd like to", value: "would_like" },
        { label: "No", value: "no" },
      ],
    },
    boughtLicense: {
      key: "boughtLicense" as const,
      label: "Have you bought a hunting or fishing license since the event?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "I already had one", value: "already_had" },
        { label: "No", value: "no" },
      ],
    },
    wouldMentor: {
      key: "wouldMentor" as const,
      label: "Would you be interested in mentoring someone yourself?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "Maybe, not yet", value: "maybe" },
        { label: "No", value: "no" },
      ],
    },
    whatWouldHelp: {
      key: "whatWouldHelp" as const,
      label: `What would help you get ${activity} more often?`,
    },
    // Unused by the form but kept alongside so the wording stays in one place.
    _solo: w.solo,
  };
}

const FOLLOWUP_VALUE_SETS: Record<string, string[]> = {
  wentOut: ["several", "once_or_twice", "planning", "no"],
  tookSomeoneOut: ["yes", "would_like", "no"],
  boughtLicense: ["yes", "already_had", "no"],
  wouldMentor: ["yes", "maybe", "no"],
};

export const FOLLOW_UP_OPTIONS = [
  { label: "I'd like to attend another event", value: "another_event" },
  { label: "I'd like to apply to a camp", value: "camp" },
  { label: "I'd be interested in mentoring someday", value: "mentor" },
  { label: "I'd like to volunteer", value: "volunteer" },
];

const FOLLOW_UP_VALUES = FOLLOW_UP_OPTIONS.map((o) => o.value);

export const EMPTY_ANSWERS: SurveyAnswers = {
  comfortSolo: 0,
  comfortFindingSpots: 0,
  comfortPublicLand: 0,
  comfortTakingOthers: 0,
  knowledgeFocus: 0,
  conservationInvolvement: 0,
  interests: [],
};

function isValidScale(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= SCALE_MIN &&
    v <= SCALE_MAX
  );
}

/**
 * Validate an answer payload server side.
 *
 * The pre survey is mandatory, so this must not depend on the client honouring `required`
 * attributes: a hand-crafted POST has to be rejected too. Returns an error message, or
 * null when the payload is good.
 */
export function validateSurveyAnswers(
  kind: SurveyKind,
  data: unknown,
  eventKind: EventKind = "community"
): string | null {
  if (!data || typeof data !== "object") return "Survey answers are required";
  const a = data as Partial<SurveyAnswers>;

  const questions = scaleQuestions(eventKind);
  for (const q of questions) {
    if (!isValidScale(a[q.key])) {
      return `Please answer: ${q.label}`;
    }
  }

  if (!Array.isArray(a.interests)) {
    return "Please select your interests";
  }
  // Reject unknown strings so a forged request cannot pollute the interest tallies with
  // arbitrary values that will never match anything on the application forms.
  const unknown = a.interests.filter((i) => !ALL_INTEREST_VALUES.includes(i));
  if (unknown.length > 0) {
    return `Unrecognized interest: ${unknown[0]}`;
  }

  if (kind === "post") {
    if (a.metExpectations !== undefined && !isValidScale(a.metExpectations)) {
      return "Please answer the expectations question";
    }
    if (a.recommend !== undefined && !isValidScale(a.recommend)) {
      return "Please answer the recommendation question";
    }
    if (a.followUp !== undefined) {
      if (!Array.isArray(a.followUp)) return "Invalid follow-up selection";
      const bad = a.followUp.filter((f) => !FOLLOW_UP_VALUES.includes(f));
      if (bad.length > 0) return `Unrecognized follow-up option: ${bad[0]}`;
    }
  }

  if (kind === "followup") {
    const q = followupQuestions(eventKind);
    // The two behaviour questions are required: they are the entire point of this stage.
    if (!a.wentOut) return `Please answer: ${q.wentOut.label}`;
    if (!a.tookSomeoneOut) return `Please answer: ${q.tookSomeoneOut.label}`;

    for (const [key, allowed] of Object.entries(FOLLOWUP_VALUE_SETS)) {
      const value = a[key as keyof SurveyAnswers];
      if (value !== undefined && !allowed.includes(value as string)) {
        return `Unrecognized answer for ${key}`;
      }
    }
  }

  return null;
}

/** Split a validated payload into table columns plus the jsonb extras. */
export function toResponseRow(kind: SurveyKind, a: SurveyAnswers) {
  const answers: Record<string, unknown> = {};

  if (kind === "pre") {
    if (a.expectations?.trim()) answers.expectations = a.expectations.trim();
  } else if (kind === "post") {
    if (a.metExpectations !== undefined) {
      answers.metExpectations = a.metExpectations;
    }
    if (a.favoritePart?.trim()) answers.favoritePart = a.favoritePart.trim();
    if (a.recommend !== undefined) answers.recommend = a.recommend;
    if (a.followUp?.length) answers.followUp = a.followUp;
  } else {
    if (a.wentOut) answers.wentOut = a.wentOut;
    if (a.tookSomeoneOut) answers.tookSomeoneOut = a.tookSomeoneOut;
    if (a.boughtLicense) answers.boughtLicense = a.boughtLicense;
    if (a.wouldMentor) answers.wouldMentor = a.wouldMentor;
    if (a.whatWouldHelp?.trim()) answers.whatWouldHelp = a.whatWouldHelp.trim();
  }

  return {
    kind,
    comfort_solo: a.comfortSolo,
    comfort_finding_spots: a.comfortFindingSpots,
    comfort_public_land: a.comfortPublicLand,
    comfort_taking_others: a.comfortTakingOthers,
    knowledge_focus: a.knowledgeFocus,
    conservation_involvement: a.conservationInvolvement,
    interests: a.interests,
    answers,
  };
}
