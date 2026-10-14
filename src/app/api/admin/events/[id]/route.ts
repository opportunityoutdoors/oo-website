import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin surface: reject anyone without an admin_users row. Middleware only matches
  // /admin/:path*, so it never protected these API routes.
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;


  const { id } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Reconcile background checks before reading them.
  //
  // The cron that would otherwise do this runs once a day, because Vercel's Hobby plan caps
  // cron frequency there, and 24 hours is far too long to leave someone paid and unscreened.
  // Doing it here means the answer is current the moment an admin opens the event, which is
  // exactly when it matters. This used to live behind an org-wide screening page; when that
  // page was removed the behaviour had to come with it, or it would simply have stopped
  // happening while appearing to have been kept.
  //
  // Never fatal: if the provider is unreachable the page still renders from stored state,
  // which is stale rather than absent.
  try {
    const { reconcileStuckChecks } = await import(
      "@/app/api/cron/background-checks/route"
    );
    const result = await reconcileStuckChecks();
    if (result.updated > 0) {
      console.log(`Event view reconciled ${result.updated} background check(s)`);
    }
  } catch (err) {
    console.error(
      "Event view could not reconcile background checks:",
      err instanceof Error ? err.message : String(err)
    );
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      "*, contacts(id, email, first_name, last_name, phone, city, state, tshirt_size, date_of_birth, background_check_status, background_check_expires_at, background_check_invited_at, background_check_url, email_confirmed_at)"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...event,
    registrations: registrations || [],
  });
}
