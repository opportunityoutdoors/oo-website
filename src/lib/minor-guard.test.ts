import { describe, expect, it } from "vitest";
import { ageOn, refuseWaitlistPeople, UNDER_18_MESSAGE } from "./minor-guard";

const today = new Date("2026-10-14T12:00:00Z");
const adult = { firstName: "Dana", lastName: "Smith", dateOfBirth: "1980-05-01", bringingMinor: false };

describe("ageOn", () => {
  it("counts the birthday itself as the new age", () => {
    expect(ageOn("2008-10-14", today)).toBe(18);
    expect(ageOn("2008-10-15", today)).toBe(17);
  });
  it("rejects a date that does not exist", () => {
    expect(ageOn("2008-02-30", today)).toBeNull();
    expect(ageOn("", today)).toBeNull();
  });
});

describe("refuseWaitlistPeople", () => {
  it("lets an adult alone through", () => {
    expect(refuseWaitlistPeople(adult, today)).toBeNull();
  });

  it("refuses a 15-year-old signing up as the adult", () => {
    expect(refuseWaitlistPeople({ ...adult, dateOfBirth: "2011-03-02" }, today)).toBe(UNDER_18_MESSAGE);
  });

  it("refuses a missing or future birth date", () => {
    expect(refuseWaitlistPeople({ ...adult, dateOfBirth: "" }, today)).toMatch(/valid date of birth/);
    expect(refuseWaitlistPeople({ ...adult, dateOfBirth: "2030-01-01" }, today)).toMatch(/valid date of birth/);
  });

  it("refuses a minor with the adult's name", () => {
    const r = refuseWaitlistPeople(
      { ...adult, bringingMinor: true, minorFirstName: " dana ", minorLastName: "SMITH", minorDob: "2015-01-01" },
      today
    );
    expect(r).toMatch(/cannot be the same person/);
  });

  it("lets a parent bring a child with a suffix", () => {
    const r = refuseWaitlistPeople(
      { ...adult, bringingMinor: true, minorFirstName: "Dana", minorLastName: "Smith Jr", minorDob: "2015-01-01" },
      today
    );
    expect(r).toBeNull();
  });

  it("refuses a 'minor' who is 18 or older", () => {
    const r = refuseWaitlistPeople(
      { ...adult, bringingMinor: true, minorFirstName: "Sam", minorLastName: "Smith", minorDob: "2000-01-01" },
      today
    );
    expect(r).toMatch(/18 or older/);
  });

  it("refuses a minor with no birth date", () => {
    const r = refuseWaitlistPeople(
      { ...adult, bringingMinor: true, minorFirstName: "Sam", minorLastName: "Smith", minorDob: "" },
      today
    );
    expect(r).toMatch(/minor/);
  });
});
