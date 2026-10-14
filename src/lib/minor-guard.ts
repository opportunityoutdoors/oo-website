// Stops a minor from signing up as the adult on a camp waitlist.
//
// On 2026-09-23 a 15-year-old entered himself as the adult, with his own email, and then
// added himself again as his own minor. Nobody over 18 was on record for him, so nobody
// with authority over him received the meeting invite, the waiver, or the welcome packet.
//
// Pure logic so it can be unit tested. The database checks that need a lookup live in the
// routes and call ageOn() from here.

export const ADULT_AGE = 18;

/** Whole years between a YYYY-MM-DD birth date and `today`, or null if it is not a date. */
export function ageOn(dob: string, today: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) return null;

  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() < mo - 1 ||
    (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

export type WaitlistPeople = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  bringingMinor: boolean;
  minorFirstName?: string;
  minorLastName?: string;
  minorDob?: string;
};

export const UNDER_18_MESSAGE =
  "You must be 18 or older to join the waitlist. A parent or guardian needs to sign up " +
  "and add you as a minor.";

/** The reason to refuse this waitlist signup, or null when it may go ahead. */
export function refuseWaitlistPeople(p: WaitlistPeople, today: Date): string | null {
  const age = ageOn(p.dateOfBirth || "", today);
  if (age === null || age < 0 || age > 110) return "Enter a valid date of birth.";
  if (age < ADULT_AGE) return UNDER_18_MESSAGE;

  if (!p.bringingMinor) return null;

  const minorFirst = p.minorFirstName?.trim() ?? "";
  const minorLast = p.minorLastName?.trim() ?? "";
  if (!minorFirst || !minorLast) return "Enter the minor's first and last name.";

  const minorAge = ageOn(p.minorDob || "", today);
  if (minorAge === null || minorAge < 0) return "Enter a valid date of birth for the minor.";
  if (minorAge >= ADULT_AGE) {
    return `${minorFirst} is 18 or older and needs to join the waitlist with their own email.`;
  }

  // Same name for adult and minor is how the 2026-09-23 case looked. A parent and child who
  // really share a name can add Jr or Sr, which is what the Jacksons already do.
  if (sameName(p.firstName, minorFirst) && sameName(p.lastName, minorLast)) {
    return (
      "The adult and the minor cannot be the same person. If you share a name, " +
      "add Jr or Sr to one of them."
    );
  }

  return null;
}
