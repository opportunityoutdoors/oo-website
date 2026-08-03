import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { SOURCES, findStaleSources } from "@/lib/partner-events/sync";

// Review queue backing the /admin/partner-events screen.

export async function GET(request: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const status = request.nextUrl.searchParams.get("status") || "pending";
  const supabase = createServiceClient();

  let query = supabase
    .from("partner_events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (status !== "all") query = query.eq("status", status);

  const { data: events } = await query;

  // Per-source health. A broken scraper returns zero rather than throwing, which looks
  // exactly like "nothing scheduled", so surface the last run alongside the counts.
  const { data: runs } = await supabase
    .from("partner_event_syncs")
    .select("source, ran_at, found, ok, error")
    .order("ran_at", { ascending: false })
    .limit(50);

  type SyncRun = {
    source: string;
    ran_at: string;
    found: number;
    ok: boolean;
    error: string | null;
  };

  const latestBySource = new Map<string, SyncRun>();
  for (const run of (runs || []) as SyncRun[]) {
    if (!latestBySource.has(run.source)) latestBySource.set(run.source, run);
  }

  const stale = await findStaleSources(supabase);

  const { data: counts } = await supabase
    .from("partner_events")
    .select("status");

  const byStatus: Record<string, number> = {};
  for (const row of counts || []) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
  }

  return NextResponse.json({
    events: events || [],
    counts: byStatus,
    sources: SOURCES.map((s) => {
      const run = latestBySource.get(s.key);
      return {
        key: s.key,
        label: s.label,
        homepage: s.homepage,
        lastRun: run?.ran_at || null,
        lastFound: run?.found ?? null,
        ok: run?.ok ?? null,
        error: run?.error || null,
        stale: stale.includes(s.key),
      };
    }),
  });
}

/** Manual entry. Skips the queue and lands approved, since a human typed it. */
export async function POST(request: NextRequest) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startsAt = typeof body?.startsAt === "string" ? body.startsAt : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!startsAt) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("partner_events")
    .insert({
      source: "manual",
      // Manual rows have no upstream id, so generate one to satisfy the unique pair.
      source_uid: randomUUID(),
      title,
      url: body.url?.trim() || null,
      starts_at: startsAt,
      ends_at: body.endsAt || null,
      location: body.location?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || "NC",
      cost: body.cost?.trim() || null,
      description: body.description?.trim() || null,
      organizer: body.organizer?.trim() || null,
      status: "approved",
      manually_edited: true,
      reviewed_by: member?.id || null,
      reviewed_at: now,
      last_seen_at: now,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Manual partner event insert failed:", error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
