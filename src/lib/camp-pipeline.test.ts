import { describe, it, expect } from "vitest";
import { computePipeline, isMatched, isCleared, type PipelineReg } from "./camp-pipeline";

// The camp funnel.
//
// This is where "19 outstanding" appeared above a list of 18 people, because the outstanding
// count summed the per-stage stuck lists and anyone blocked early was counted at every later
// stage too. It is also the single definition the pipeline panel and the registrant table
// both read, so a mistake here shows up in two places that are supposed to agree.

let seq = 0;

type Contacts = NonNullable<PipelineReg["contacts"]>;

/**
 * A cleared adult, as a concrete object.
 *
 * Returned rather than read off `reg().contacts`, which is nullable and so spreads into a
 * type with every field optional. Tests that quietly widen the type they are testing are
 * worse than no tests.
 */
function contacts(over: Partial<Contacts> = {}): Contacts {
  return {
    first_name: "Test",
    last_name: "Person",
    email: "p@example.com",
    date_of_birth: "1990-01-01",
    background_check_status: "clear",
    background_check_expires_at: "2027-08-08T00:00:00Z",
    ...over,
  };
}

function reg(over: Partial<PipelineReg> = {}): PipelineReg {
  seq += 1;
  return {
    id: `r${seq}`,
    status: "registered",
    role: "Mentee",
    payment_status: "paid",
    waiver_signed: true,
    meeting_date_selected: "Tue 8pm",
    welcome_packet_sent: false,
    mentor_id: "m1",
    guardian_registration_id: null,
    contacts: contacts({ last_name: `Person${seq}`, email: `p${seq}@example.com` }),
    ...over,
  };
}

describe("computePipeline", () => {
  it("counts distinct people as outstanding, never the sum of the stuck lists", () => {
    // One person blocked at the very first gate is necessarily also not paid, not screened
    // and not matched. Summing the stages would report them four times.
    const stuck = reg({
      status: "waitlist",
      payment_status: null,
      waiver_signed: false,
      meeting_date_selected: null,
      contacts: contacts({ background_check_status: "none", background_check_expires_at: null }),
    });
    const fine = reg();

    const p = computePipeline([stuck, fine]);

    const summed = p.stages.reduce((n, s) => n + s.stuck.length, 0);
    expect(summed).toBeGreaterThan(1);
    expect(p.notThrough).toHaveLength(1);
    expect(p.notThrough[0].id).toBe(stuck.id);
    // The regression itself: never report more outstanding people than there are people.
    expect(p.notThrough.length).toBeLessThanOrEqual(p.active.length);
  });

  it("leaves denied people out of the pipeline entirely", () => {
    const p = computePipeline([reg({ status: "denied" }), reg()]);
    expect(p.active).toHaveLength(1);
    expect(p.notThrough).toHaveLength(0);
  });

  it("reads as a funnel: each stage is measured against the one before it", () => {
    const paidAndClear = reg();
    const registeredUnpaid = reg({ payment_status: null });

    const p = computePipeline([paidAndClear, registeredUnpaid]);
    const paid = p.stages.find((s) => s.key === "paid")!;
    const screening = p.stages.find((s) => s.key === "screening")!;

    expect(paid.of).toBe(2);
    expect(paid.done).toBe(1);
    // Screening is measured against who paid, not against everyone.
    expect(screening.of).toBe(1);
  });

  it("holds an unscreened person at the screening stage and out of everything after it", () => {
    const unscreened = reg({
      contacts: contacts({ background_check_status: "flagged", background_check_expires_at: null }),
    });

    const p = computePipeline([unscreened]);
    expect(p.stages.find((s) => s.key === "screening")!.stuck).toHaveLength(1);
    expect(p.through).toHaveLength(0);
    expect(p.sendable).toHaveLength(0);
  });

  it("never offers a welcome packet to someone who has not cleared every stage", () => {
    const declined = reg({
      contacts: contacts({ background_check_status: "declined", background_check_expires_at: null }),
    });
    const p = computePipeline([declined]);
    expect(p.sendable).toHaveLength(0);
  });

  it("does not send a minor their own packet: their guardian is the recipient", () => {
    const minor = reg({
      guardian_registration_id: "g1",
      mentor_id: null,
      contacts: contacts({
        date_of_birth: "2015-01-01",
        background_check_status: "none",
        background_check_expires_at: null,
      }),
    });

    const p = computePipeline([minor]);
    // A minor is cleared (never screened) and matched through their guardian, so they reach
    // the end of the funnel, but they are not a recipient.
    expect(p.through.map((r) => r.id)).toContain(minor.id);
    expect(p.sendable).toHaveLength(0);
  });

  it("reports everyone through once nothing is stuck", () => {
    const p = computePipeline([reg(), reg()]);
    expect(p.notThrough).toHaveLength(0);
    expect(p.sendable).toHaveLength(2);
  });

  it("counts an already-sent packet as sent rather than sendable", () => {
    const p = computePipeline([reg({ welcome_packet_sent: true })]);
    expect(p.sent).toHaveLength(1);
    expect(p.sendable).toHaveLength(0);
  });

  it("keeps the stages in the order a camp actually runs", () => {
    const p = computePipeline([reg()]);
    expect(p.stages.map((s) => s.key)).toEqual([
      "waitlist",
      "meeting",
      "approved",
      "registered",
      "waiver",
      "paid",
      "screening",
      "matched",
      "packet",
    ]);
  });
});

describe("isMatched", () => {
  it("does not ask a mentor to have a mentor", () => {
    expect(isMatched(reg({ role: "Mentor", mentor_id: null }))).toBe(true);
  });

  it("matches a minor through the guardian they arrived with", () => {
    expect(isMatched(reg({ mentor_id: null, guardian_registration_id: "g1" }))).toBe(true);
  });

  it("holds a mentee with neither", () => {
    expect(isMatched(reg({ mentor_id: null, guardian_registration_id: null }))).toBe(false);
  });
});

describe("isCleared", () => {
  it("agrees with the screening rules rather than reimplementing them", () => {
    expect(isCleared(reg())).toBe(true);
    expect(
      isCleared(
        reg({
          contacts: contacts({ background_check_status: "none", background_check_expires_at: null }),
        })
      )
    ).toBe(false);
  });
});
