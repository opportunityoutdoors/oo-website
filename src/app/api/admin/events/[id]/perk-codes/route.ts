import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { getsPerkCode, perkPools } from "@/lib/perk-codes";
import { refreshCampPrivate } from "@/lib/camp-private";

// The camp's unique perk codes (lib/perk-codes.ts), for PerkCodesPanel. Read only: codes are
// entered in Sanity (Mentee Perk Codes) and synced from there.

type One<T> = T | T[] | null;
const one = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// GET: each pool's counts, who holds which code, and how many mentees still need one.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;
  const { id: eventId } = await params;
  const supabase = createServiceClient();

  await refreshCampPrivate(supabase, eventId);
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
