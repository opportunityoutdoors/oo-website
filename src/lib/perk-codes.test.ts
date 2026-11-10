import { describe, expect, it } from "vitest";
import { getsPerkCode, parseCodes } from "./perk-codes";

describe("parseCodes", () => {
  it("reads one code per line, as pasted from a spreadsheet", () => {
    expect(parseCodes("ONX-AAA1\nONX-BBB2\r\nONX-CCC3\n")).toEqual(["ONX-AAA1", "ONX-BBB2", "ONX-CCC3"]);
  });

  it("also splits on commas, semicolons, and spaces", () => {
    expect(parseCodes("A1, B2;C3 D4\tE5")).toEqual(["A1", "B2", "C3", "D4", "E5"]);
  });

  // A code pasted twice must not go to two mentees.
  it("drops repeats and blank lines", () => {
    expect(parseCodes("A1\n\nA1\n  B2  \n")).toEqual(["A1", "B2"]);
  });

  it("keeps case, because a code may be case sensitive", () => {
    expect(parseCodes("abc\nABC")).toEqual(["abc", "ABC"]);
  });
});

describe("getsPerkCode", () => {
  it("gives codes to adult mentees only", () => {
    expect(getsPerkCode({ role: "Mentee", guardian_registration_id: null })).toBe(true);
    expect(getsPerkCode({ role: "Mentor", guardian_registration_id: null })).toBe(false);
    expect(getsPerkCode({ role: "Staff", guardian_registration_id: null })).toBe(false);
    expect(getsPerkCode({ role: "Mentee", guardian_registration_id: "g1" })).toBe(false);
  });
});
