import { describe, expect, it } from "vitest";
import { getsPerkCode, parseCodes, perkCodeInfo, redeemSteps } from "./perk-codes";

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


describe("redeem steps", () => {
  const info = perkCodeInfo([
    {
      label: "OnX",
      codes: "A1",
      redeemSteps:
        "Visit https://webmap.onxmaps.com/hunt/redeem/create-account\n\nCreate your account\r\nEnter your redemption code: {code}",
    },
    { label: " ", redeemSteps: "ignored" },
  ]);

  it("keeps one step per line and drops blank lines and unnamed lists", () => {
    expect(info).toEqual([
      {
        label: "OnX",
        steps: [
          "Visit https://webmap.onxmaps.com/hunt/redeem/create-account",
          "Create your account",
          "Enter your redemption code: {code}",
        ],
      },
    ]);
  });

  it("puts the mentee's own code where {code} is", () => {
    expect(redeemSteps(info, "OnX", "ZZ-42")[2]).toBe("Enter your redemption code: ZZ-42");
  });

  it("gives no steps for a list without any", () => {
    expect(redeemSteps(info, "Other", "X")).toEqual([]);
    expect(redeemSteps(null, "OnX", "X")).toEqual([]);
  });
});
