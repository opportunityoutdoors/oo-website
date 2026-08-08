"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReviewModal from "../events/[id]/ReviewModal";
import { describeCheck } from "@/lib/background-check/display";

// The org-wide screening view.
//
// Until now the only screening UI lived inside a single event's pipeline, which meant the
// Screening Administrator could only answer "is everyone at this camp screened" one camp at
// a time. The policy makes them responsible for that across the whole organisation, so this
// is the page that makes the job possible rather than merely defined.
//
// The endpoint behind it reconciles stuck checks on read, so opening this page also repairs
// anything the once-daily cron has not caught yet. That was already true and, until this
// page existed, never happened.

type Row = {
  registrationId: string;
  contactId: string | null;
  eventId: string | null;
  event: string | null;
  eventDate: string | null;
  name: string;
  email: string | null;
  role: string | null;
  dateOfBirth: string | null;
  status: string;
  expiresAt: string | null;
  invitedAt: string | null;
  applicantUrl: string | null;
  eligibility: string;
  needsAttention: boolean;
};

type Expiring = {
  contactId: string;
  name: string;
  email: string | null;
  expiresAt: string | null;
};

type Decision = {
  id: string;
  decidedAt: string;
  decision: string;
  panelPresent: string;
  reason: string;
  statusBefore: string | null;
  statusAfter: string | null;
  contactId: string | null;
  contactName: string;
  by: string | null;
};

export default function ScreeningDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [expiring, setExpiring] = useState<Expiring[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{
    contactId: string;
    name: string;
    status: string;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/background-check");
    if (res.ok) {
      const json = await res.json();
      setRows(json.rows ?? []);
      setExpiring(json.expiringSoon ?? []);
      setDecisions(json.recentDecisions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function retry(contactId: string) {
    setRetrying(contactId);
    await fetch("/api/admin/background-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    await load();
    setRetrying(null);
  }

  if (loading) {
    return <p className="p-8 text-near-black/40">Loading...</p>;
  }

  // Findings the panel owes a decision on. This is the queue the screening policy creates
  // and, before this page, the only one with nowhere to live.
  const awaitingDecision = (r: Row) => r.status === "flagged" || r.status === "error";

  const toDecide = rows.filter(awaitingDecision);

  // Paid, cannot attend, and not because anyone is deliberating. Ordered by event date, so
  // the person whose camp is in four days sits above the one whose camp is in four months.
  const notReady = rows.filter((r) => r.needsAttention && !awaitingDecision(r));

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-near-black">Screening</h1>
        <p className="mt-1 text-sm text-near-black/60">
          Everyone who has paid for an upcoming event, and where their background check
          stands. Opening this page also reconciles any check the daily job has not caught
          up with yet.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Metric label="Awaiting a decision" value={toDecide.length} tone={toDecide.length ? "act" : "ok"} />
        <Metric label="Paid, not ready" value={notReady.length} tone={notReady.length ? "warn" : "ok"} />
        <Metric label="Lapsing within 60 days" value={expiring.length} tone="neutral" />
      </div>

      <Section
        title="Awaiting a decision"
        blurb="Records were found and confirmed. Nothing happens to these people until the panel meets and someone records what it decided."
        empty="Nothing is waiting on the panel."
        count={toDecide.length}
      >
        {toDecide.map((r) => (
          <PersonRow
            key={r.registrationId}
            row={r}
            onReview={() =>
              r.contactId &&
              setReviewing({ contactId: r.contactId, name: r.name, status: r.status })
            }
          />
        ))}
      </Section>

      <Section
        title="Paid, not ready"
        blurb="They have paid and cannot attend until their check is done. Soonest event first."
        empty="Everyone who has paid is screened or in progress."
        count={notReady.length}
      >
        {notReady.map((r) => (
          <PersonRow
            key={r.registrationId}
            row={r}
            onReview={() =>
              r.contactId &&
              setReviewing({ contactId: r.contactId, name: r.name, status: r.status })
            }
            onRetry={
              r.contactId && (r.status === "none" || r.status === "expired")
                ? () => retry(r.contactId!)
                : undefined
            }
            retrying={retrying === r.contactId}
          />
        ))}
      </Section>

      <Section
        title="Lapsing within 60 days"
        blurb="Not a problem yet. A returning mentor whose cover runs out before the next camp is much cheaper to handle now than on the day."
        empty="No clears lapsing in the next 60 days."
        count={expiring.length}
      >
        {expiring.map((e) => (
          <div
            key={e.contactId}
            className="flex items-center justify-between border-b border-near-black/5 px-4 py-3 text-sm last:border-0"
          >
            <Link
              href={`/admin/contacts/${e.contactId}`}
              className="font-medium text-near-black hover:text-dark-green"
            >
              {e.name}
            </Link>
            <span className="text-xs text-near-black/50">
              {e.expiresAt ? formatDate(e.expiresAt) : "unknown"}
            </span>
          </div>
        ))}
      </Section>

      <Section
        title="Recent decisions"
        blurb="Every review the panel has recorded, whatever it decided. The policy requires these exist; this is where you read them."
        empty="No decisions recorded yet."
        count={decisions.length}
      >
        {decisions.map((d) => (
          <div key={d.id} className="border-b border-near-black/5 px-4 py-3 last:border-0">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={`/admin/contacts/${d.contactId}`}
                className="text-sm font-medium text-near-black hover:text-dark-green"
              >
                {d.contactName}
              </Link>
              <span className="shrink-0 text-xs text-near-black/50">
                {formatDate(d.decidedAt)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-near-black/60">
              <span className="font-medium">{d.decision.replace(/_/g, " ")}</span>
              {d.statusBefore && d.statusAfter
                ? ` (${d.statusBefore} to ${d.statusAfter})`
                : ""}
              {d.by ? ` · recorded by ${d.by}` : ""} · present: {d.panelPresent}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-near-black/70">{d.reason}</p>
          </div>
        ))}
      </Section>

      {reviewing && (
        <ReviewModal
          contactId={reviewing.contactId}
          contactName={reviewing.name}
          currentStatus={reviewing.status}
          onClose={() => setReviewing(null)}
          onDone={async () => {
            setReviewing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "act" | "neutral";
}) {
  const color =
    tone === "act"
      ? "text-[#b00]"
      : tone === "warn"
        ? "text-[#8B6914]"
        : tone === "ok"
          ? "text-dark-green"
          : "text-near-black";

  return (
    <div className="rounded-lg bg-cream/60 px-4 py-3">
      <div className="text-xs text-near-black/50">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function Section({
  title,
  blurb,
  empty,
  count,
  children,
}: {
  title: string;
  blurb: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-near-black/70">
        {title}
      </h2>
      <p className="mb-2 mt-1 max-w-2xl text-xs leading-relaxed text-near-black/50">
        {blurb}
      </p>
      <div className="overflow-hidden rounded-lg border border-near-black/10 bg-white">
        {count === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-near-black/40">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function PersonRow({
  row,
  onReview,
  onRetry,
  retrying,
}: {
  row: Row;
  onReview: () => void;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  // Same describeCheck the pipeline and the alert emails use, so no two places describe the
  // same state differently.
  const check = describeCheck({
    dateOfBirth: row.dateOfBirth,
    status: row.status,
    expiresAt: row.expiresAt,
    invitedAt: row.invitedAt,
    paid: true,
    eventDate: row.eventDate,
  });

  return (
    <div className="border-b border-near-black/5 px-4 py-3 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <Link
            href={`/admin/contacts/${row.contactId}`}
            className="text-sm font-medium text-near-black hover:text-dark-green"
          >
            {row.name}
          </Link>
          {row.role && (
            <span className="ml-2 text-xs text-near-black/40">{row.role}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
              check.tone === "ok"
                ? "bg-dark-green/10 text-dark-green"
                : check.tone === "act"
                  ? "bg-[#b00]/10 text-[#b00]"
                  : "bg-gold/15 text-[#8B6914]"
            }`}
          >
            {check.label}
          </span>
          {row.applicantUrl && (
            <a
              href={row.applicantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-dark-green hover:underline"
            >
              their form
            </a>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="text-[11px] font-semibold text-dark-green hover:underline disabled:opacity-40"
            >
              {retrying ? "ordering..." : "order check"}
            </button>
          )}
          <button
            onClick={onReview}
            className="text-[11px] font-semibold text-dark-green hover:underline"
          >
            review
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-xs text-near-black/50">
        {row.event ?? "No event"}
        {row.eventDate ? ` · ${formatDate(row.eventDate)}` : ""}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-near-black/60">{check.detail}</p>
    </div>
  );
}

/** UTC pinned, because date-only values stored as midnight UTC otherwise render a day early. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
