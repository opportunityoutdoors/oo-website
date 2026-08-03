"use client";

import { useEffect, useState } from "react";

// Year-to-date impact summary. Client component because it hangs off an API route that
// does the survey math, and because the year is switchable.

type ScaleStat = {
  key: string;
  label: string;
  preMean: number | null;
  postMean: number | null;
  delta: number | null;
  matched: number;
};

type Rollup = {
  year: number;
  events: { held: number; upcoming: number };
  participants: {
    total: number;
    unique: number;
    returning: number;
    mentors: number;
  };
  scales: ScaleStat[];
  interests: { interest: string; pre: number; post: number; gained: number }[];
};

export default function ImpactRollup() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Guard against a stale year's response landing after a newer one.
    let active = true;

    fetch(`/api/admin/analytics?year=${year}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year]);

  // The survey tables may not exist yet on a fresh database. Failing quietly beats
  // breaking the whole dashboard over a section that has nothing to show.
  if (failed) return null;

  const withDelta = data?.scales.filter((s) => s.delta !== null) ?? [];
  const topGains = [...withDelta].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
          Impact
        </h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-near-black/20 bg-white px-3 py-1.5 text-xs font-semibold focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading || !data ? (
        <p className="text-sm text-near-black/40">Loading impact...</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card
              value={data.events.held}
              label="Events Held"
              sub={
                data.events.upcoming > 0
                  ? `${data.events.upcoming} upcoming`
                  : undefined
              }
            />
            <Card
              value={data.participants.total}
              label="Participants Served"
              sub={`${data.participants.unique} unique people`}
            />
            <Card
              value={data.participants.returning}
              label="Came Back"
              sub="attended more than once"
            />
            <Card
              value={data.participants.mentors}
              label="Mentors Out"
              sub="volunteer attendances"
            />
          </div>

          {topGains.length > 0 ? (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h3 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Average Change per Participant
                </h3>
                <p className="mt-1 text-xs text-near-black/50">
                  Across everyone who answered both surveys, mentors excluded.
                  Scale of 1 to 10.
                </p>
              </div>
              {topGains.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between border-b border-near-black/5 px-5 py-3 last:border-0"
                >
                  <span className="text-sm text-near-black">{s.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-near-black/40">
                      {s.preMean} &rarr; {s.postMean}
                    </span>
                    <span
                      className={`w-14 text-right text-sm font-bold tabular-nums ${
                        (s.delta ?? 0) >= 0 ? "text-dark-green" : "text-red-600"
                      }`}
                    >
                      {(s.delta ?? 0) > 0 ? "+" : ""}
                      {s.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-near-black/10 bg-white px-5 py-6 text-sm text-near-black/50">
              No matched survey pairs yet for {data.year}. Numbers appear once
              participants have completed both the registration survey and the
              post-event survey.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Card({
  value,
  label,
  sub,
}: {
  value: number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-near-black/10 bg-white p-5">
      <p className="text-3xl font-extrabold text-dark-green">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-near-black/50">
        {label}
      </p>
      {sub && <p className="mt-0.5 text-xs text-near-black/40">{sub}</p>}
    </div>
  );
}
