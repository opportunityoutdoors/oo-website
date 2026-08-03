"use client";

import { useEffect, useState } from "react";

// Survey results for one event. The six deltas are the point of the whole survey system,
// so they get the most visual weight.

type ScaleStat = {
  key: string;
  label: string;
  preMean: number | null;
  postMean: number | null;
  delta: number | null;
  matched: number;
};

type Analytics = {
  event: { id: string; title: string; eventType: string };
  registrations: {
    byStatus: Record<string, number>;
    total: number;
    registered: number;
    attended: number;
    attendanceRate: number | null;
    mentors: number;
  };
  surveys: {
    preCount: number;
    postCount: number;
    postSent: number;
    postCompletionRate: number | null;
    needsAttendanceMarking: boolean;
  };
  scales: ScaleStat[];
  interests: { interest: string; pre: number; post: number; gained: number }[];
  postExtras: {
    recommendMean: number | null;
    recommendCount: number;
    metExpectationsMean: number | null;
    metExpectationsCount: number;
    favoriteParts: string[];
    followUp: { value: string; count: number }[];
  };
  expectations: string[];
};

const FOLLOW_UP_LABELS: Record<string, string> = {
  another_event: "Attend another event",
  camp: "Apply to a camp",
  mentor: "Mentor someday",
  volunteer: "Volunteer",
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-near-black/10 bg-white px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-[1px] text-near-black/40">
        {label}
      </div>
      <div className="mt-1 text-2xl font-[900] text-near-black">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-near-black/50">{sub}</div>}
    </div>
  );
}

function DeltaBar({ stat }: { stat: ScaleStat }) {
  const hasDelta = stat.delta !== null;
  const positive = (stat.delta ?? 0) > 0;
  // Scale bar width against a +3 change, which is a large move on a 1 to 10 scale.
  const width = hasDelta ? Math.min(Math.abs(stat.delta!) / 3, 1) * 100 : 0;

  return (
    <div className="border-b border-near-black/5 px-5 py-3.5 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-near-black">{stat.label}</span>
        <span
          className={`text-sm font-bold tabular-nums ${
            !hasDelta
              ? "text-near-black/30"
              : positive
                ? "text-dark-green"
                : "text-red-600"
          }`}
        >
          {hasDelta ? `${positive ? "+" : ""}${stat.delta}` : "no pairs yet"}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-near-black/5">
        <div
          className={`h-full rounded-full ${positive ? "bg-dark-green" : "bg-red-500"}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-near-black/40">
        <span>
          before {stat.preMean ?? "n/a"} &rarr; after {stat.postMean ?? "n/a"}
        </span>
        <span>
          {stat.matched} matched {stat.matched === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
}

export default function StatsTab({ eventId }: { eventId: string }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard against a stale response overwriting a newer one if eventId changes.
    let active = true;

    fetch(`/api/admin/events/${eventId}/analytics`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Could not load stats");
        }
        return res.json();
      })
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: Error) => {
        if (active) setError(e.message || "Could not load stats");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId]);

  if (loading) {
    return <p className="text-sm text-near-black/40">Loading stats...</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-red-600">{error || "No data"}</p>;
  }

  const { registrations: regs, surveys, scales, interests, postExtras } = data;
  const gained = interests.filter((i) => i.gained > 0);

  return (
    <div className="space-y-6">
      {surveys.needsAttendanceMarking && (
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-5 py-4">
          <p className="text-sm font-semibold text-near-black">
            No one is marked as attended.
          </p>
          <p className="mt-1 text-sm text-near-black/60">
            This event has already happened, but post-event surveys only go to
            registrations marked <strong>attended</strong>. Until someone is
            marked, no surveys will send and there will be no results here. Mark
            attendance from the Registered tab.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Registered"
          value={String(regs.registered)}
          sub={regs.mentors > 0 ? `${regs.mentors} mentors included` : undefined}
        />
        <Stat
          label="Attended"
          value={String(regs.attended)}
          sub={
            regs.attendanceRate !== null
              ? `${regs.attendanceRate}% of registered`
              : undefined
          }
        />
        <Stat
          label="Pre Surveys"
          value={String(surveys.preCount)}
          sub="collected at registration"
        />
        <Stat
          label="Post Surveys"
          value={String(surveys.postCount)}
          sub={
            surveys.postCompletionRate !== null
              ? `${surveys.postCompletionRate}% of ${surveys.postSent} sent`
              : "none sent yet"
          }
        />
      </div>

      <div className="rounded-lg border border-near-black/10 bg-white">
        <div className="border-b border-near-black/10 px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Change, Before to After
          </h3>
          <p className="mt-1 text-xs text-near-black/50">
            Averaged per person across those who answered both surveys. Mentors
            are excluded, since experienced volunteers start near the top and
            would flatten the result.
          </p>
        </div>
        {scales.map((s) => (
          <DeltaBar key={s.key} stat={s} />
        ))}
      </div>

      {(postExtras.recommendMean !== null ||
        postExtras.metExpectationsMean !== null ||
        postExtras.followUp.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Met Expectations"
            value={
              postExtras.metExpectationsMean !== null
                ? `${postExtras.metExpectationsMean} / 10`
                : "n/a"
            }
            sub={`${postExtras.metExpectationsCount} responses`}
          />
          <Stat
            label="Would Recommend"
            value={
              postExtras.recommendMean !== null
                ? `${postExtras.recommendMean} / 10`
                : "n/a"
            }
            sub={`${postExtras.recommendCount} responses`}
          />
          <div className="rounded-lg border border-near-black/10 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[1px] text-near-black/40">
              What&apos;s Next
            </div>
            {postExtras.followUp.length === 0 ? (
              <div className="mt-1 text-sm text-near-black/40">No responses</div>
            ) : (
              <ul className="mt-2 space-y-1">
                {postExtras.followUp.map((f) => (
                  <li key={f.value} className="flex justify-between text-sm">
                    <span className="text-near-black/70">
                      {FOLLOW_UP_LABELS[f.value] || f.value}
                    </span>
                    <span className="font-semibold text-near-black">
                      {f.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-near-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-near-black/10 px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Interests
          </h3>
          <span className="text-xs text-near-black/40">
            {gained.length > 0
              ? `${gained.length} newly picked up`
              : "no new interests yet"}
          </span>
        </div>
        {interests.length === 0 ? (
          <p className="px-5 py-4 text-sm text-near-black/40">No responses yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3">Interest</th>
                <th className="px-5 py-3 text-right">Before</th>
                <th className="px-5 py-3 text-right">After</th>
                <th className="px-5 py-3 text-right">New</th>
              </tr>
            </thead>
            <tbody>
              {interests.map((i) => (
                <tr
                  key={i.interest}
                  className="border-b border-near-black/5 last:border-0"
                >
                  <td className="px-5 py-2.5 text-near-black">{i.interest}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-near-black/60">
                    {i.pre}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-near-black/60">
                    {i.post}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-dark-green">
                    {i.gained > 0 ? `+${i.gained}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {postExtras.favoriteParts.length > 0 && (
        <div className="rounded-lg border border-near-black/10 bg-white">
          <div className="border-b border-near-black/10 px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
              Favorite Parts
            </h3>
          </div>
          <ul className="divide-y divide-near-black/5">
            {postExtras.favoriteParts.map((t, i) => (
              <li key={i} className="px-5 py-3 text-sm text-near-black/80">
                &ldquo;{t}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.expectations.length > 0 && (
        <div className="rounded-lg border border-near-black/10 bg-white">
          <div className="border-b border-near-black/10 px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
              What They Were Hoping For
            </h3>
            <p className="mt-1 text-xs text-near-black/50">
              Collected at registration, before the event.
            </p>
          </div>
          <ul className="divide-y divide-near-black/5">
            {data.expectations.map((t, i) => (
              <li key={i} className="px-5 py-3 text-sm text-near-black/80">
                &ldquo;{t}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
