// Single source of truth for the outdoor interest options.
//
// These values are written to contacts.interests, mentee_applications.outdoor_interests,
// mentor_applications.outdoor_skills, survey_responses.interests, and the Resend
// "interests" contact property. Keeping one list means a pre-survey answer is directly
// comparable to what someone selected on their application, which is what makes the
// pre/post interest delta meaningful.
//
// Changing a `value` orphans existing rows that stored the old string. Change labels
// freely; treat values as stable identifiers.

export type InterestOption = { label: string; value: string };

export const HUNTING_INTERESTS: InterestOption[] = [
  { label: "Turkey", value: "Turkey" },
  { label: "Deer", value: "Deer" },
  { label: "Bear", value: "Bear" },
  { label: "Waterfowl", value: "Waterfowl" },
  { label: "Small game", value: "Small game" },
  { label: "Upland", value: "Upland" },
  { label: "Trapping", value: "Trapping" },
];

export const FISHING_INTERESTS: InterestOption[] = [
  { label: "Freshwater", value: "Freshwater" },
  { label: "Fly fishing", value: "Fly fishing" },
  { label: "Saltwater", value: "Saltwater" },
];

export const OUTDOOR_INTERESTS: InterestOption[] = [
  { label: "Hiking", value: "Hiking" },
  { label: "Camping/Backpacking", value: "Camping/Backpacking" },
  { label: "Birding", value: "Birding" },
  { label: "Archery", value: "Archery" },
  { label: "Shooting sports (clay/skeet/trap)", value: "Shooting sports" },
  { label: "Foraging", value: "Foraging" },
  { label: "Wildlife photography", value: "Wildlife photography" },
];

// The three groups as rendered in forms and surveys, in display order.
export const INTEREST_GROUPS: { title: string; options: InterestOption[] }[] = [
  { title: "Hunting", options: HUNTING_INTERESTS },
  { title: "Fishing", options: FISHING_INTERESTS },
  { title: "Other Outdoor Activities", options: OUTDOOR_INTERESTS },
];

export const ALL_INTERESTS: InterestOption[] = [
  ...HUNTING_INTERESTS,
  ...FISHING_INTERESTS,
  ...OUTDOOR_INTERESTS,
];

// Used for server-side validation so a hand-crafted request cannot store arbitrary
// strings in survey_responses.interests and pollute the analytics tallies.
export const ALL_INTEREST_VALUES: string[] = ALL_INTERESTS.map((o) => o.value);
