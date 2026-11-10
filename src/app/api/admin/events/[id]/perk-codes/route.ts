import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { getsPerkCode, parseCodes, perkPools } from "@/lib/perk-codes";

// The camp's unique perk codes (lib/perk-codes.ts), for PerkCodesPanel.

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// GET: each pool's counts, who holds which code, and how many mentees still need one.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const supabase = createServiceClient();

  const pools = await perkPools(supabase, eventId);

  const { data: held } = await supabase
    .from("perk_codes")
    .select("label, code, assigned_at, registrations(id, contacts(first_name, last_name, email))")
    .eq("event_id", eventId)
    .not("registration_id", "is", null)
    .order("assigned_at");
  const assignments = (held ?? []).map((h) => {
    const reg = one(h.registrations as One<{ id: string; contacts: One<{ first_name: string | null; last_name: string | null; email: string | null }> }>);
    const c = one(reg?.contacts ?? null);
    return {
      label: h.label,
      code: h.code,
      name: [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Unknown",
    };
  });

  // Mentees still in the camp. Each one needs a code from every pool.
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, role, guardian_registration_id")
    .eq("event_id", eventId)
    .in("status", ["approved", "registered", "attended"]);
  const mentees = (regs ?? []).filter(getsPerkCode).length;

  return NextResponse.json({ pools, assignments, mentees });
}

// POST { label, codes }: add a pasted batch to a pool. Codes already in the pool are skipped.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const body = await request.json();
  const label = String(body.label ?? "").trim();
  const codes = parseCodes(String(body.codes ?? ""));
  if (!label) return NextResponse.json({ error: "Name the codes, for example OnX." }, { status: 400 });
  if (!codes.length) return NextResponse.json({ error: "No codes found in what you pasted." }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("perk_codes")
    .upsert(
      codes.map((code) => ({ event_id: eventId, label, code })),
      { onConflict: "event_id,label,code", ignoreDuplicates: true }
    )
    .select("id");
  if (error) return NextResponse.json({ error: `Could not save the codes: ${error.message}` }, { status: 500 });

  const added = data?.length ?? 0;
  return NextResponse.json({ added, skipped: codes.length - added });
}

// DELETE { label }: remove the codes in a pool that nobody holds yet, to undo a wrong paste.
// Codes already given out stay, because they are in someone's welcome packet.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const body = await request.json();
  const label = String(body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "No pool named." }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("perk_codes")
    .delete()
    .eq("event_id", eventId)
    .eq("label", label)
    .is("registration_id", null)
    .select("id");
  if (error) return NextResponse.json({ error: `Could not remove the codes: ${error.message}` }, { status: 500 });
  return NextResponse.json({ removed: data?.length ?? 0 });
}
