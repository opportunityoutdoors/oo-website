"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEventDateRange } from "@/lib/format-event-date";

// Review queue for partner events. Nothing reaches the public events page until it is
// approved here.

type PartnerEvent = {
  id: string;
  source: string;
  title: string;
  url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  city: string | null;
  cost: string | null;
  description: string | null;
  organizer: string | null;
  status: string;
  manually_edited: boolean;
  missing_since: string | null;
};

type SourceHealth = {
  key: string;
  label: string;
  homepage: string;
  lastRun: string | null;
  lastFound: number | null;
  ok: boolean | null;
  error: string | null;
  stale: boolean;
};

type Payload = {
  events: PartnerEvent[];
  counts: Record<string, number>;
  sources: SourceHealth[];
};

const TABS = ["pending", "approved", "rejected", "all"] as const;
type Tab = (typeof TABS)[number];

const EMPTY_FORM = {
  title: "",
  organizer: "",
  startsAt: "",
  location: "",
  city: "",
  cost: "",
  url: "",
  description: "",
};

export default function PartnerEventsQueue() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PartnerEvent>>({});
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async (which: Tab) => {
    const res = await fetch(`/api/admin/partner-events?status=${which}`);
    if (res.ok) setData(await res.json());
    else setError("Could not load the queue");
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/partner-events?status=${tab}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => active && setData(d))
      .catch(() => active && setError("Could not load the queue"));
    return () => {
      active = false;
    };
  }, [tab]);

  async function act(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/partner-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load(tab);
    setBusy(false);
  }

  async function rejectSource(source: string) {
    if (!confirm(`Reject all pending events from this source?`)) return;
    setBusy(true);
    await fetch("/api/admin/partner-events/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, status: "rejected" }),
    });
    await load(tab);
    setBusy(false);
  }

  async function saveEdit(id: string) {
    await act(id, draft);
    setEditing(null);
    setDraft({});
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/partner-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setAdding(false);
      await load(tab);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save");
    }
    setBusy(false);
  }

  if (!data) {
    return (
      <p className="text-sm text-near-black/40">
        {error || "Loading local events..."}
      </p>
    );
  }

  const pendingBySource = data.events.reduce<Record<string, number>>((acc, e) => {
    if (e.status === "pending") acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
            Local Events
          </h1>
          <p className="mt-1 text-sm text-near-black/50">
            Events from partner organizations. Approved events appear on the
            public events page under Partner Events.
          </p>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded bg-dark-green px-5 py-2.5 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
        >
          {adding ? "Cancel" : "Add Event"}
        </button>
      </div>

      {/* Manual entry. The only way in for sources with no feed, notably NCWRC. */}
      {adding && (
        <form
          onSubmit={addManual}
          className="mb-6 rounded-lg border border-near-black/10 bg-white p-5"
        >
          <p className="mb-4 text-xs text-near-black/50">
            For organizations we cannot pull automatically, like NCWRC. Added
            events are approved immediately.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Input label="Organizer" value={form.organizer} onChange={(v) => setForm({ ...form, organizer: v })} placeholder="NC Wildlife Resources Commission" />
            <Input label="Date *" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
            <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <Input label="Cost" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} placeholder="Free" />
            <div className="sm:col-span-2">
              <Input label="Link" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://" />
            </div>
            <div className="sm:col-span-2">
              <Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded bg-dark-green px-5 py-2.5 text-xs font-bold uppercase tracking-[1px] text-white disabled:opacity-50"
          >
            Save Event
          </button>
        </form>
      )}

      {/* Source health. A scraper that breaks returns zero, which looks the same as
          "nothing scheduled", so the last run is always visible. */}
      <div className="mb-6 flex flex-wrap gap-3">
        {data.sources.map((s) => (
          <div
            key={s.key}
            className={`flex-1 rounded-lg border px-4 py-3 ${
              s.stale || s.ok === false
                ? "border-gold/50 bg-gold/10"
                : "border-near-black/10 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[1px] text-near-black/60">
                {s.label}
              </span>
              {pendingBySource[s.key] > 0 && (
                <button
                  onClick={() => rejectSource(s.key)}
                  disabled={busy}
                  className="text-[11px] font-semibold text-red-600 hover:underline"
                >
                  Reject all {pendingBySource[s.key]}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-near-black">
              {s.lastFound ?? 0} found
              {s.lastRun && (
                <span className="text-near-black/40">
                  {" "}
                  · {new Date(s.lastRun).toLocaleDateString()}
                </span>
              )}
            </p>
            {(s.stale || s.ok === false) && (
              <p className="mt-1 text-xs text-near-black/60">
                {s.ok === false
                  ? `Last sync failed: ${s.error}`
                  : "Returned nothing this run after previously finding events. Worth checking."}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-near-black/10 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
              tab === t
                ? "bg-dark-green text-white"
                : "text-near-black/40 hover:text-near-black"
            }`}
          >
            {t} {t !== "all" && `(${data.counts[t] || 0})`}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-near-black/10 bg-white">
        {data.events.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-near-black/40">
            Nothing {tab === "all" ? "here" : tab} right now.
          </p>
        ) : (
          data.events.map((e) => (
            <div
              key={e.id}
              className="border-b border-near-black/5 px-5 py-4 last:border-0"
            >
              {editing === e.id ? (
                <div className="space-y-3">
                  <Input
                    label="Title"
                    value={(draft.title ?? e.title) as string}
                    onChange={(v) => setDraft({ ...draft, title: v })}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Organizer"
                      value={(draft.organizer ?? e.organizer ?? "") as string}
                      onChange={(v) => setDraft({ ...draft, organizer: v })}
                    />
                    <Input
                      label="City"
                      value={(draft.city ?? e.city ?? "") as string}
                      onChange={(v) => setDraft({ ...draft, city: v })}
                    />
                  </div>
                  <Input
                    label="Description"
                    value={(draft.description ?? e.description ?? "") as string}
                    onChange={(v) => setDraft({ ...draft, description: v })}
                  />
                  <p className="text-xs text-near-black/40">
                    Saving marks this event as yours. Future syncs will stop
                    overwriting these fields.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(e.id)}
                      disabled={busy}
                      className="rounded bg-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setDraft({});
                      }}
                      className="rounded border border-near-black/20 px-4 py-2 text-xs font-semibold text-near-black/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-dark-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[1px] text-dark-green">
                        {e.organizer || e.source}
                      </span>
                      {e.manually_edited && (
                        <span className="text-[10px] font-semibold uppercase tracking-[1px] text-near-black/30">
                          edited
                        </span>
                      )}
                      {e.missing_since && (
                        <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-near-black/70">
                          no longer listed at source
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-medium text-near-black">{e.title}</p>
                    <p className="mt-0.5 text-sm text-near-black/50">
                      {formatEventDateRange(e.starts_at, e.ends_at, "short") ||
                        "No date"}
                      {e.city && ` · ${e.city}`}
                      {e.cost && ` · ${e.cost}`}
                    </p>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-dark-green hover:underline"
                      >
                        View at source &rarr;
                      </a>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditing(e.id);
                        setDraft({});
                      }}
                      className="rounded border border-near-black/20 px-3 py-1.5 text-xs font-semibold text-near-black/60 hover:bg-near-black/5"
                    >
                      Edit
                    </button>
                    {e.status !== "approved" && (
                      <button
                        onClick={() => act(e.id, { status: "approved" })}
                        disabled={busy}
                        className="rounded bg-dark-green px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {e.status !== "rejected" && (
                      <button
                        onClick={() => act(e.id, { status: "rejected" })}
                        disabled={busy}
                        className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/50">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-near-black/20 bg-white px-3 py-2 text-sm focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
      />
    </label>
  );
}
