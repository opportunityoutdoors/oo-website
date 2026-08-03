"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Dashboard impact summary.
//
// Four cards, chosen so that no number contains another. The previous version reported
// "Participants Served: 15" while separately reporting "Mentors Out: 8", where the eight
// were inside the fifteen. Volunteers are not people served, and a figure that conflates
// them overstates reach by more than a factor of two on current data.
//
// A card with no data yet says so rather than showing a zero. Zero and "not measured yet"
// mean very different things to anyone reading a board packet.

type Rollup = {
  scope: number | "all";
  outputs: {
    eventsHeld: number;
    campsHeld: number;
    peopleServed: number;
    uniquePeople: number;
    youthServed: number;
    uniqueMentors: number;
    volunteerDays: number;
    communitiesReached: number;
  };
  outcomes: {
    postCount: number;
    followupCount: number;
    mentorshipMultiplier: { delta: number | null; matched: number } | null;
  };
  impact: {
    responded: number;
    stillGoingOutPct: number | null;
  };
};

export default function ImpactRollup() {
  const [data, setData] = useState<Rollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics")
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
  }, []);

  // Survey tables may not exist on a fresh database. Failing quietly beats breaking the
  // dashboard over a section with nothing to show.
  if (failed) return null;

  const multiplier = data?.outcomes.mentorshipMultiplier;

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
          Impact This Year
        </h2>
        <Link
          href="/admin/impact"
          className="text-xs font-semibold text-dark-green transition-colors hover:text-dark-green/70"
        >
          Full report &rarr;
        </Link>
      </div>

      {loading || !data ? (
        <p className="text-sm text-near-black/40">Loading impact...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            value={String(data.outputs.peopleServed)}
            label="People Served"
            sub={`${data.outputs.uniquePeople} unique, mentors not counted`}
          />
          <Card
            value={String(data.outputs.uniqueMentors)}
            label="Volunteer Mentors"
            sub={`${data.outputs.volunteerDays} mentor days given`}
          />
          <Card
            value={
              multiplier?.delta !== null && multiplier?.delta !== undefined
                ? `${multiplier.delta > 0 ? "+" : ""}${multiplier.delta}`
                : null
            }
            label="Confidence Taking Others"
            sub={
              multiplier?.matched
                ? `matched across ${multiplier.matched}`
                : "awaiting post-event surveys"
            }
          />
          <Card
            value={
              data.impact.stillGoingOutPct !== null
                ? `${data.impact.stillGoingOutPct}%`
                : null
            }
            label="Still Going Out"
            sub={
              data.impact.responded
                ? `of ${data.impact.responded} at 6 months`
                : "awaiting 6-month follow-ups"
            }
          />
        </div>
      )}
    </div>
  );
}

function Card({
  value,
  label,
  sub,
}: {
  value: string | null;
  label: string;
  sub?: string;
}) {
  const pending = value === null;
  return (
    <div className="rounded-lg border border-near-black/10 bg-white p-5">
      <p
        className={`text-3xl font-extrabold ${
          pending ? "text-near-black/20" : "text-dark-green"
        }`}
      >
        {pending ? "—" : value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-near-black/50">
        {label}
      </p>
      {sub && <p className="mt-0.5 text-xs text-near-black/40">{sub}</p>}
    </div>
  );
}
