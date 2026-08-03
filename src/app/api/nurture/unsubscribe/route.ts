import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Opt out of a nurture sequence. The token is the entire authorization check, matching
// the meeting-change pattern in src/app/api/waitlist/change-meeting/route.ts. It grants
// nothing beyond stopping this series, so a leaked link is low consequence.
//
// This does NOT touch the Resend marketing segment. Someone who opts out of the applicant
// sequence stays subscribed to campaigns and the newsletter unless they unsubscribe there
// too, which is a separate link with its own consent.

async function stop(token: string | null) {
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: enrollment } = await supabase
    .from("nurture_enrollments")
    .select("id, status, track")
    .eq("opt_out_token", token)
    .single();

  if (!enrollment) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  // Already stopped is a success, not an error. People click these links twice.
  if (enrollment.status === "stopped") {
    return NextResponse.json({ ok: true, alreadyStopped: true });
  }

  const { error } = await supabase
    .from("nurture_enrollments")
    .update({ status: "stopped", stopped_at: new Date().toISOString() })
    .eq("id", enrollment.id);

  if (error) {
    console.error("Nurture unsubscribe error:", error);
    return NextResponse.json({ error: "Could not process" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, alreadyStopped: false });
}

// GET validates without changing anything, so the page can distinguish a bad link from a
// working one before showing a confirm button.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: enrollment } = await supabase
    .from("nurture_enrollments")
    .select("status, track")
    .eq("opt_out_token", token)
    .single();

  if (!enrollment) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  return NextResponse.json({
    track: enrollment.track,
    alreadyStopped: enrollment.status === "stopped",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token =
    typeof body?.token === "string"
      ? body.token
      : request.nextUrl.searchParams.get("token");
  return stop(token);
}
