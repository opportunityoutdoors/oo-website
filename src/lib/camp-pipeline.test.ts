import { describe, it, expect } from "vitest";
import {
  computePipeline,
  emailUnconfirmed,
  shirtTally,
  normalizeShirtSize,
  isMatched,
  isCleared,
  position,
  byPosition,
  requirements,
  EXIT_REASONS,
  type PipelineReg,
} from "./camp-pipeline";

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

describe("position", () => {
  it("puts everyone in exactly one column, always", () => {
    const people = [
      reg({ status: "waitlist" }),
      reg({ status: "meeting_rsvp" }),
      reg({ status: "approved" }),
      reg({ status: "registered", payment_status: null }),
      reg(),
      reg({ status: "attended" }),
      reg({ status: "denied" }),
      reg({ status: "withdrawn", exit_reason: "never_paid" }),
    ];
    const grouped = byPosition(people);
    const total = Object.values(grouped).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(people.length);
  });

  it("treats the zoom RSVP as still being on the waitlist", () => {
    expect(position(reg({ status: "waitlist" }))).toBe("waitlist");
    expect(position(reg({ status: "meeting_rsvp" }))).toBe("waitlist");
  });

  it("separates someone still owing requirements from someone ready", () => {
    expect(position(reg())).toBe("ready");
    expect(position(reg({ payment_status: null }))).toBe("registered");
    expect(position(reg({ waiver_signed: false }))).toBe("registered");
    expect(
      position(
        reg({
          contacts: contacts({ background_check_status: "flagged", background_check_expires_at: null }),
        })
      )
    ).toBe("registered");
  });

  // Matching starts once everyone is Ready, so the match cannot be part of Ready. Decided
  // 2026-10-26: cleared mentees sat in Registered with nothing left for them to do.
  it("puts a paid, signed, cleared mentee in Ready before a mentor is matched", () => {
    const r = reg({ mentor_id: null });
    expect(position(r)).toBe("ready");
    expect(requirements(r)).toContainEqual({ label: "no mentor", met: false });
  });

  // The packet carries the mentor match, so it waits for one. Everyone it can reach is in Ready.
  it("sends packets only to people in Ready who are matched", () => {
    const people = [
      reg(),
      reg({ payment_status: null }),
      reg({ contacts: contacts({ background_check_status: "none", background_check_expires_at: null }) }),
      reg({ mentor_id: null }),
    ];
    const ready = people.filter((r) => position(r) === "ready").map((r) => r.id);
    const through = computePipeline(people).through.map((r) => r.id);
    expect(ready.sort()).toEqual([people[0].id, people[3].id].sort());
    expect(through).toEqual([people[0].id]);
  });

  // Leaving overrides progress. Someone who withdrew is not also "registered but unpaid".
  it("puts an exit ahead of anything about their progress", () => {
    expect(position(reg({ status: "denied", payment_status: null }))).toBe("turned_away");
    expect(position(reg({ status: "withdrawn", exit_reason: "withdrew_after_paying" }))).toBe(
      "dropped_out"
    );
  });

  it("sorts an exit by its reason, not by the status alone", () => {
    expect(position(reg({ status: "withdrawn", exit_reason: "removed_for_conduct" }))).toBe(
      "turned_away"
    );
    expect(position(reg({ status: "withdrawn", exit_reason: "stopped_responding" }))).toBe(
      "dropped_out"
    );
  });

  // A missing or unrecognised reason must not throw or vanish a card off the board.
  it("falls back to dropped out when the reason is missing or unknown", () => {
    expect(position(reg({ status: "withdrawn", exit_reason: null }))).toBe("dropped_out");
    expect(position(reg({ status: "withdrawn", exit_reason: "something_new" }))).toBe("dropped_out");
  });

  it("keeps attended out of the exit columns", () => {
    expect(position(reg({ status: "attended" }))).toBe("attended");
  });

  it("offers every exit reason a column to live in", () => {
    for (const r of EXIT_REASONS) {
      expect(["turned_away", "dropped_out"], r.value).toContain(r.position);
    }
  });
});

describe("requirements", () => {
  it("does not ask a mentor for a mentor", () => {
    // Three for a mentor (waiver, payment, check), four for a mentee (plus a match).
    expect(requirements(reg({ role: "Mentor" }))).toHaveLength(3);
    expect(requirements(reg({ role: "Mentee" }))).toHaveLength(4);
  });

  it("marks each one met or not", () => {
    const r = requirements(reg({ payment_status: null, waiver_signed: true }));
    expect(r.filter((x) => !x.met)).toHaveLength(1);
    expect(r.filter((x) => x.met)).toHaveLength(3);
  });

  // The card renders these verbatim. It used to prefix "no", which produced "no paid".
  it("words both states so they can be shown as written", () => {
    const unmet = requirements(reg({ payment_status: null, mentor_id: null }))
      .filter((x) => !x.met)
      .map((x) => x.label);

    expect(unmet).toContain("unpaid");
    expect(unmet).toContain("no mentor");
    expect(unmet).not.toContain("paid");

    const met = requirements(reg()).filter((x) => x.met).map((x) => x.label);
    expect(met).toContain("paid");
    expect(met).toContain("cleared");
    for (const label of [...unmet, ...met]) {
      expect(label, `"${label}" reads badly`).not.toMatch(/^no (paid|cleared|matched)$/);
    }
  });
});

describe("position and a screening decline", () => {
  // The decline lives on the contact, because it is a decision about a person that outlives
  // any one camp. Without checking it, a declined person sat in Registered showing "no
  // check", which reads as waiting on paperwork rather than having been turned away.
  it("turns away someone declined by screening, whatever their registration says", () => {
    const declined = reg({
      status: "registered",
      contacts: contacts({
        background_check_status: "declined",
        background_check_expires_at: null,
      }),
    });
    expect(position(declined)).toBe("turned_away");
  });

  it("still lets a declined person be marked attended if they somehow were", () => {
    const attended = reg({
      status: "attended",
      contacts: contacts({ background_check_status: "declined", background_check_expires_at: null }),
    });
    expect(position(attended)).toBe("attended");
  });
});

describe("emailUnconfirmed", () => {
  const signedUp = "2026-11-01T15:00:00Z";

  it("is true for an adult who never clicked the link", () => {
    expect(emailUnconfirmed(reg({ status: "waitlist", created_at: signedUp }))).toBe(true);
  });

  it("is false for anyone who signed up before confirmation existed", () => {
    expect(emailUnconfirmed(reg({ status: "waitlist", created_at: "2026-10-06T22:14:11Z" }))).toBe(false);
  });

  it("is false once the address is confirmed", () => {
    const r = reg({ status: "waitlist", created_at: signedUp, contacts: contacts({ email_confirmed_at: "2026-11-01T16:00:00Z" }) });
    expect(emailUnconfirmed(r)).toBe(false);
  });

  it("is never true for a minor, whose guardian carries it", () => {
    const r = reg({ status: "waitlist", created_at: signedUp, guardian_registration_id: "g1", contacts: contacts({ email: null as unknown as string }) });
    expect(emailUnconfirmed(r)).toBe(false);
  });
});

describe("shirtTally", () => {
  const withSize = (size: string | null, over: Partial<PipelineReg> = {}) =>
    reg({ ...over, contacts: { ...contacts(), tshirt_size: size } as PipelineReg["contacts"] });

  it("counts sizes only for people registered and paid", () => {
    const t = shirtTally([
      withSize("M"),
      withSize("m"),
      withSize("XL"),
      withSize("L", { payment_status: "pending" }),
      withSize("S", { status: "approved", payment_status: null }),
    ]);
    expect(t.expected).toBe(5);
    expect(t.done).toBe(3);
    expect(t.sizes.find((s) => s.size === "M")?.count).toBe(2);
    expect(t.sizes.find((s) => s.size === "XL")?.count).toBe(1);
    expect(t.sizes.find((s) => s.size === "L")?.count).toBe(0);
  });

  it("leaves out the waitlist and anyone who left", () => {
    const t = shirtTally([
      withSize("M", { status: "waitlist" }),
      withSize("M", { status: "withdrawn", exit_reason: "cannot_attend" }),
      withSize("M"),
    ]);
    expect(t.expected).toBe(1);
    expect(t.done).toBe(1);
  });

  it("flags paid people with no size, and odd sizes as Other", () => {
    const t = shirtTally([withSize(null), withSize("4XL")]);
    expect(t.noSize).toBe(1);
    expect(t.sizes.find((s) => s.size === "Other")?.count).toBe(1);
  });
});

describe("board mentor", () => {
  it("is Ready on registration, owes nothing, and counts for shirts", () => {
    const r = reg({
      role: "Mentor",
      is_board_member: true,
      payment_status: null,
      waiver_signed: false,
      contacts: { ...contacts(), background_check_status: null, tshirt_size: "XL" } as PipelineReg["contacts"],
    });
    expect(position(r)).toBe("ready");
    expect(requirements(r)).toEqual([]);
    expect(shirtTally([r]).sizes.find((s) => s.size === "XL")?.count).toBe(1);
  });

  // Decided 2026-10-26, revising 2026-10-16: the packet carries their mentee assignments.
  it("gets a welcome packet, with no waiver, fee, or check", () => {
    const r = reg({
      role: "Mentor",
      is_board_member: true,
      payment_status: null,
      waiver_signed: false,
      mentor_id: null,
      contacts: contacts({ background_check_status: null, background_check_expires_at: null }),
    });
    const p = computePipeline([r]);
    expect(p.sendable.map((x) => x.id)).toEqual([r.id]);
    for (const key of ["waiver", "paid", "screening"]) {
      expect(p.stages.find((s) => s.key === key)?.stuck).toEqual([]);
    }
  });
});

describe("staff", () => {
  it("is Ready on registration and owes nothing", () => {
    const r = reg({ role: "Staff", payment_status: null, waiver_signed: false, mentor_id: null });
    expect(position(r)).toBe("ready");
    expect(requirements(r)).toEqual([]);
  });

  it("gets no welcome packet", () => {
    const r = reg({ role: "Staff", is_board_member: true, payment_status: null, waiver_signed: false, mentor_id: null });
    const p = computePipeline([r]);
    expect(p.sendable).toEqual([]);
    expect(p.through.map((x) => x.id)).toEqual([r.id]);
  });

  it("counts toward shirts without paying", () => {
    const r = reg({ role: "Staff", payment_status: null, contacts: { ...contacts(), tshirt_size: "Large" } as PipelineReg["contacts"] });
    const t = shirtTally([r]);
    expect(t.done).toBe(1);
    expect(t.sizes.find((s) => s.size === "L")?.count).toBe(1);
  });
});

describe("normalizeShirtSize", () => {
  it("maps the older word sizes", () => {
    expect(normalizeShirtSize("Large")).toBe("L");
    expect(normalizeShirtSize("Small")).toBe("S");
    expect(normalizeShirtSize("XXL")).toBe("2XL");
    expect(normalizeShirtSize(" xl ")).toBe("XL");
    expect(normalizeShirtSize("")).toBeNull();
  });
});
