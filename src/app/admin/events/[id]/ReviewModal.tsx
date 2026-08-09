"use client";

import { useState, useEffect, useCallback } from "react";

// Recording a Review Panel decision.
//
// The screening policy requires a written record of every review regardless of outcome,
// including the ones that clear someone, so this form is deliberately not a one-click
// action. Who was present and why are both mandatory, and the form says plainly that the
// reasoning must not contain anything from the report itself.

type Decision = "cleared" | "adverse_action" | "disqualified" | "outside_check";

type Review = {
  id: string;
  decided_at: string;
  decision: string;
  panel_present: string;
  reason: string;
  status_before: string | null;
  status_after: string | null;
  outside_provider: string | null;
  outside_completed_at: string | null;
  admin_users: { email: string } | { email: string }[] | null;
};

const OPTIONS: {
  value: Decision;
  label: string;
  blurb: string;
  /** Statuses this decision can be applied from. Null means any. */
  from: string[] | null;
}[] = [
  {
    value: "cleared",
    label: "Cleared by the panel",
    blurb:
      "The check found something and the panel agreed it does not bar them: too old, too minor, or unrelated to what they would be doing. Sets their check to clear for 12 months and they carry on as normal. This is the option for an acceptable offence, and it needs all three officers to agree.",
    from: ["flagged"],
  },
  {
    value: "adverse_action",
    label: "Proceed to adverse action",
    blurb:
      "The panel could not agree to clear. This records that decision only. It does NOT decline them and does NOT refund: you must then start the pre-adverse notice in VolunteerBadge, which runs the five business day dispute window and issues the final notice. The refund happens automatically when that completes.",
    from: ["flagged"],
  },
  {
    value: "disqualified",
    label: "Disqualified (not based on a report)",
    blurb:
      "Refused to consent, ignored the process, or concealed a pending charge. No consumer report drove this, so no adverse action notice is owed. Declines them and refunds upcoming events immediately.",
    from: null,
  },
  {
    value: "outside_check",
    label: "Accept an outside check",
    blurb:
      "A check completed elsewhere within the last 12 months that meets or exceeds our criteria. Cover runs from the date it completed, not from today.",
    from: null,
  },
];

export default function ReviewModal({
  contactId,
  contactName,
  currentStatus,
  onClose,
  onDone,
}: {
  contactId: string;
  contactName: string;
  currentStatus: string;
  onClose: () => void;
  onDone: () => void;
}) {
  // Mirrors validate() in lib/background-check/review.ts. The server is the authority and
  // will reject anything this misses; hiding invalid options here just avoids offering
  // someone a button that cannot work.
  const available = OPTIONS.filter((o) => {
    if (currentStatus === "declined") return false;
    // Adjudicating requires something to adjudicate.
    if (o.from) return o.from.includes(currentStatus);
    // Accepting an outside check on top of our own finding would wash the flag out.
    if (o.value === "outside_check") return currentStatus !== "flagged";
    // Disqualification is reachable from anywhere: someone can refuse before a check is
    // ever ordered, or abandon one halfway through.
    return true;
  });

  const [decision, setDecision] = useState<Decision | "">(
    available.length === 1 ? available[0].value : ""
  );
  const [panelPresent, setPanelPresent] = useState("");
  const [reason, setReason] = useState("");
  const [outsideProvider, setOutsideProvider] = useState("");
  const [outsideCompletedAt, setOutsideCompletedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [history, setHistory] = useState<Review[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/background-check/review?contactId=${contactId}`
      );
      if (res.ok) setHistory((await res.json()).reviews ?? []);
    } catch {
      // History is context, not the point of the screen. Failing to load it must not
      // block someone from recording a decision.
    }
  }, [contactId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function submit() {
    if (!decision) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/background-check/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          decision,
          panelPresent,
          reason,
          outsideProvider: outsideProvider || null,
          outsideCompletedAt: outsideCompletedAt || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      if (json.refunds?.length) {
        // Refund results are shown rather than assumed. A refund that failed needs issuing
        // by hand, and the person who just made the decision is the one who should know.
        setResult(json.refunds);
        await loadHistory();
      } else {
        onDone();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const selected = OPTIONS.find((o) => o.value === decision);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-near-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Stops a click inside the panel from closing it via the backdrop above. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-near-black/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-near-black">
              Record a review decision
            </h2>
            <p className="mt-1 text-sm text-near-black/60">
              {contactName} &middot; currently{" "}
              <span className="font-medium">{currentStatus}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded px-2 py-1 text-lg leading-none text-near-black/35 hover:bg-near-black/5 hover:text-near-black"
          >
            &times;
          </button>
        </div>

        {result ? (
          <div className="px-6 py-5">
            <p className="text-sm font-medium text-near-black">Decision recorded.</p>
            <ul className="mt-3 space-y-1 text-sm text-near-black/70">
              {result.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <button
              onClick={onDone}
              className="mt-5 rounded bg-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-dark-green/90"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5">
            {available.length === 0 ? (
              <>
                <p className="text-sm text-near-black/70">
                  There is nothing to decide here. This check is {currentStatus}.
                  {currentStatus === "declined" &&
                    " Reversing a decline is not something this screen does."}
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 rounded bg-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-dark-green/90"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                    Decision
                  </legend>
                  <div className="mt-2 space-y-2">
                    {available.map((o) => (
                      <label
                        key={o.value}
                        className={`block cursor-pointer rounded border p-3 transition-colors ${
                          decision === o.value
                            ? "border-dark-green bg-dark-green/5"
                            : "border-near-black/15 hover:border-near-black/30"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="radio"
                            name="decision"
                            checked={decision === o.value}
                            onChange={() => setDecision(o.value)}
                            className="mt-1 accent-dark-green"
                          />
                          <div>
                            <span className="text-sm font-medium text-near-black">
                              {o.label}
                            </span>
                            <p className="mt-0.5 text-xs leading-relaxed text-near-black/60">
                              {o.blurb}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {decision === "outside_check" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                        Who ran it
                      </label>
                      <input
                        value={outsideProvider}
                        onChange={(e) => setOutsideProvider(e.target.value)}
                        placeholder="e.g. NC Wildlife Federation"
                        className="mt-1 w-full rounded border border-near-black/20 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                        Date it completed
                      </label>
                      <input
                        type="date"
                        value={outsideCompletedAt}
                        onChange={(e) => setOutsideCompletedAt(e.target.value)}
                        className="mt-1 w-full rounded border border-near-black/20 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                    Who took part in the review
                  </label>
                  <input
                    value={panelPresent}
                    onChange={(e) => setPanelPresent(e.target.value)}
                    placeholder="Evan Trebilcock, John Trice, Safiyyah Motaib"
                    className="mt-1 w-full rounded border border-near-black/20 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-near-black/50">
                    Clearing a finding requires all three officers to agree.
                  </p>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                    Reasoning
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="What the panel discussed and why it reached this decision."
                    className="mt-1 w-full rounded border border-near-black/20 px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-xs text-[#b00]">
                    Record the decision, not the record. Do not paste offense details,
                    dispositions, or anything else from the report.
                  </p>
                </div>

                {selected?.value === "disqualified" && (
                  <p className="mt-3 rounded bg-[#b00]/5 px-3 py-2 text-xs text-[#b00]">
                    This declines them and refunds their upcoming events immediately, less
                    the processing and background check fees.
                  </p>
                )}

                {error && (
                  <p className="mt-3 rounded bg-[#b00]/5 px-3 py-2 text-sm text-[#b00]">
                    {error}
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={submit}
                    disabled={saving || !decision || !reason.trim() || !panelPresent.trim()}
                    className="rounded bg-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-dark-green/90 disabled:opacity-40"
                  >
                    {saving ? "Recording..." : "Record decision"}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={saving}
                    className="rounded px-4 py-2 text-sm font-semibold text-near-black/60 hover:bg-near-black/5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {history.length > 0 && (
              <div className="mt-6 border-t border-near-black/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-near-black/50">
                  Previous reviews
                </h3>
                <ul className="mt-2 space-y-3">
                  {history.map((h) => {
                    const by = Array.isArray(h.admin_users)
                      ? h.admin_users[0]?.email
                      : h.admin_users?.email;
                    return (
                      <li key={h.id} className="text-xs text-near-black/70">
                        <div className="font-medium text-near-black">
                          {h.decision.replace(/_/g, " ")}
                          {h.status_before && h.status_after
                            ? ` (${h.status_before} to ${h.status_after})`
                            : ""}
                        </div>
                        <div className="text-near-black/50">
                          {new Date(h.decided_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {by ? ` by ${by}` : ""} &middot; present: {h.panel_present}
                        </div>
                        <p className="mt-0.5">{h.reason}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
