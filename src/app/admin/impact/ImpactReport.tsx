"use client";

import { useEffect, useState } from "react";
import { formatEventDateRange } from "@/lib/format-event-date";
import copy from "@/content/impact-copy.json";

// Explanatory text lives in src/content/impact-copy.json, editable without touching
// code at http://localhost:3000/copy-editor (dev only). Numbers stay computed here.

// The full impact report, structured as the three tiers of the R3 evaluation standard.
// Every derived figure shows the sample it rests on: with single-digit cohorts, a mean
// without an n beside it invites people to read far more into it than it can carry.

type Scale = {
  key: string;
  label: string;
  preMean: number | null;
  postMean: number | null;
  delta: number | null;
  matched: number;
  retained: number | null;
  retainedMatched: number;
};

type Report = {
  scope: number | "all";
  years: number[];
  outputs: {
    eventsHeld: number;
    campsHeld: number;
    communityHeld: number;
    peopleServed: number;
    uniquePeople: number;
    youthServed: number;
    mentorAttendances: number;
    uniqueMentors: number;
    volunteerDays: number;
    communitiesReached: number;
  };
  outcomes: {
    scales: Scale[];
    preCount: number;
    postCount: number;
    followupCount: number;
    recommendMean: number | null;
    recommendCount: number;
    metExpectationsMean: number | null;
    interestsGained: number;
  };
  impact: {
    responded: number;
    stillGoingOut: number;
    stillGoingOutPct: number | null;
    tookSomeoneOut: number;
    tookSomeoneOutPct: number | null;
    boughtLicense: number;
    boughtLicensePct: number | null;
    wouldMentor: number;
    wouldMentorPct: number | null;
    returningParticipants: number;
    barriers: string[];
  };
  byEvent: {
    id: string;
    title: string;
    eventType: string;
    isCamp: boolean;
    dateStart: string | null;
    hasHappened: boolean;
    registered: number;
    attended: number;
    participants: number;
    mentors: number;
    preCount: number;
    postCount: number;
    followupCount: number;
    confidenceDelta: number | null;
  }[];
};

export default function ImpactReport() {
  const currentYear = new Date().getFullYear();
  const [scope, setScope] = useState<string>(String(currentYear));
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/analytics?year=${scope}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active) setError("Could not load the report");
      });
    return () => {
      active = false;
    };
  }, [scope]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-near-black/40">Loading report...</p>;

  // Stale-scope guard: `data` keeps the previous year's numbers on screen while the new
  // request is in flight, which reads better than a flash of empty state.

  const { outputs, outcomes, impact } = data;

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
            Impact
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-near-black/50">
{copy.pageIntro}
          </p>
        </div>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="shrink-0 rounded border border-near-black/20 bg-white px-3 py-2 text-xs font-semibold focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        >
          {data.years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
          <option value="all">All time</option>
        </select>
      </div>

      {/* ── Tier 1 ── */}
      <Tier n="Tier 1" name={copy.tier1Name} gloss={copy.tier1Gloss}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={outputs.peopleServed} label="People served" sub={`${outputs.uniquePeople} unique`} />
          <Stat value={outputs.youthServed} label="Youth served" sub="under 18" />
          <Stat value={outputs.uniqueMentors} label="Volunteer mentors" sub={`${outputs.volunteerDays} mentor days`} />
          <Stat value={outputs.communitiesReached} label="Communities" sub="towns represented" />
          <Stat value={outputs.eventsHeld} label="Events held" sub={`${outputs.campsHeld} camps, ${outputs.communityHeld} community`} />
          <Stat value={outputs.mentorAttendances} label="Mentor places" sub="volunteer attendances" />
          <Stat value={outcomes.preCount} label="Baselines collected" sub="pre-event surveys" />
          <Stat value={outcomes.postCount} label="Post surveys" sub="after the event" />
        </div>
      </Tier>

      {/* ── Tier 2 ── */}
      <Tier
        n="Tier 2"
        name={copy.tier2Name}
        gloss={copy.tier2Gloss}
      >
        {outcomes.scales.every((s) => s.delta === null) ? (
          <Empty>
{copy.tier2Empty}
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-near-black/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                  <th className="px-5 py-3 font-semibold">Measure</th>
                  <th className="px-5 py-3 text-right font-semibold">Before</th>
                  <th className="px-5 py-3 text-right font-semibold">After</th>
                  <th className="px-5 py-3 text-right font-semibold">Change</th>
                  <th className="px-5 py-3 text-right font-semibold">n</th>
                  <th className="px-5 py-3 text-right font-semibold">At 6 mo</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.scales.map((s) => (
                  <tr key={s.key} className="border-b border-near-black/5 last:border-0">
                    <td className="px-5 py-3 text-near-black">
                      {s.label}
                      {s.key === "comfortTakingOthers" && (
                        <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[1px] text-gold">
                          multiplier
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/50">{s.preMean ?? "—"}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/50">{s.postMean ?? "—"}</td>
                    <td className={`px-5 py-3 text-right font-bold tabular-nums ${delta(s.delta)}`}>
                      {s.delta === null ? "—" : `${s.delta > 0 ? "+" : ""}${s.delta}`}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/40">{s.matched || "—"}</td>
                    <td className={`px-5 py-3 text-right tabular-nums ${delta(s.retained)}`}>
                      {s.retained === null
                        ? "—"
                        : `${s.retained > 0 ? "+" : ""}${s.retained} (${s.retainedMatched})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={outcomes.metExpectationsMean} label="Met expectations" sub="out of 10" />
          <Stat value={outcomes.recommendMean} label="Would recommend" sub={`${outcomes.recommendCount} responses`} />
          <Stat value={outcomes.interestsGained} label="New interests" sub="picked up during events" />
          <Stat value={outcomes.followupCount} label="Follow-ups in" sub="at six months" />
        </div>
      </Tier>

      {/* ── Tier 3 ── */}
      <Tier
        n="Tier 3"
        name={copy.tier3Name}
        gloss={copy.tier3Gloss}
      >
        {impact.responded === 0 ? (
          <Empty>
{copy.tier3Empty}
          </Empty>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat value={pctLabel(impact.stillGoingOutPct)} label="Still going out" sub={`${impact.stillGoingOut} of ${impact.responded}`} highlight />
              <Stat value={pctLabel(impact.tookSomeoneOutPct)} label="Took someone else" sub={`${impact.tookSomeoneOut} of ${impact.responded}`} highlight />
              <Stat value={pctLabel(impact.boughtLicensePct)} label="Bought a license" sub={`${impact.boughtLicense} of ${impact.responded}`} />
              <Stat value={pctLabel(impact.wouldMentorPct)} label="Would mentor" sub={`${impact.wouldMentor} of ${impact.responded}`} />
            </div>
            {impact.barriers.length > 0 && (
              <div className="mt-3 rounded-lg border border-near-black/10 bg-white">
                <div className="border-b border-near-black/10 px-5 py-3 text-xs font-bold uppercase tracking-[1px] text-near-black/50">
{copy.barriersHeading}
                </div>
                <ul className="divide-y divide-near-black/5">
                  {impact.barriers.map((b, i) => (
                    <li key={i} className="px-5 py-3 text-sm text-near-black/70">
                      &ldquo;{b}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="mt-3">
          <Stat
            value={impact.returningParticipants}
            label="Returning participants"
            sub="attended more than once, all time"
          />
        </div>
      </Tier>

      {/* ── Per event ── */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[1px] text-near-black">
{copy.byEventHeading}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-near-black/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3 font-semibold">Event</th>
                <th className="px-5 py-3 text-right font-semibold">Registered</th>
                <th className="px-5 py-3 text-right font-semibold">Attended</th>
                <th className="px-5 py-3 text-right font-semibold">Rate</th>
                <th className="px-5 py-3 text-right font-semibold">Pre</th>
                <th className="px-5 py-3 text-right font-semibold">Post</th>
                <th className="px-5 py-3 text-right font-semibold">6mo</th>
              </tr>
            </thead>
            <tbody>
              {data.byEvent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-near-black/40">
                    No events in this period.
                  </td>
                </tr>
              )}
              {data.byEvent.map((e) => {
                const rate =
                  e.registered > 0 ? Math.round((e.attended / e.registered) * 100) : null;
                return (
                  <tr key={e.id} className="border-b border-near-black/5 last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-medium text-near-black">{e.title}</span>
                      <span className="ml-2 text-xs text-near-black/35">
                        {e.isCamp ? "camp" : "community"}
                      </span>
                      <div className="text-xs text-near-black/40">
                        {formatEventDateRange(e.dateStart, null, "short") || "no date"}
                        {!e.hasHappened && " · upcoming"}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">{e.registered}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">
                      {e.attended}
                      {e.mentors > 0 && (
                        <span className="text-near-black/30"> ({e.mentors}m)</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">
                      {rate === null ? "—" : `${rate}%`}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">{e.preCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">{e.postCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-near-black/60">{e.followupCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-near-black/40">
{copy.byEventNote}
        </p>
      </section>
    </>
  );
}

function delta(v: number | null): string {
  if (v === null) return "text-near-black/30";
  return v >= 0 ? "text-dark-green" : "text-red-600";
}

function pctLabel(v: number | null): string | number | null {
  return v === null ? null : `${v}%`;
}

function Tier({
  n,
  name,
  gloss,
  children,
}: {
  n: string;
  name: string;
  gloss: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-l-2 border-dark-green/25 pl-5">
      <div className="mb-1 flex items-baseline gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold">
          {n}
        </span>
        <h2 className="text-lg font-extrabold text-near-black">{name}</h2>
      </div>
      <p className="mb-4 max-w-[70ch] text-xs leading-relaxed text-near-black/50">
        {gloss}
      </p>
      {children}
    </section>
  );
}

function Stat({
  value,
  label,
  sub,
  highlight,
}: {
  value: string | number | null;
  label: string;
  sub?: string;
  highlight?: boolean;
}) {
  const pending = value === null || value === undefined;
  return (
    <div
      className={`rounded-lg border bg-white p-4 ${
        highlight && !pending ? "border-dark-green/40" : "border-near-black/10"
      }`}
    >
      <p
        className={`text-2xl font-extrabold tabular-nums ${
          pending ? "text-near-black/20" : "text-dark-green"
        }`}
      >
        {pending ? "—" : value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[1px] text-near-black/50">
        {label}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-near-black/40">{sub}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-near-black/20 bg-white px-5 py-6 text-sm text-near-black/50">
      {children}
    </div>
  );
}
