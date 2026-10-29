import { NextRequest, NextResponse } from "next/server";
import { lookupByToken, markCantMakeIt } from "@/lib/cant-make-it";

// The confirm button on /events/[slug]/cant-make-it. A plain form POST, so the email link
// itself changes nothing: mail scanners open links, and only a press of the button counts.

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 2000) || null;

  await markCantMakeIt(token, note);
  const reg = await lookupByToken(token);
  const page = `/events/${reg?.eventSlug || "event"}/cant-make-it?token=${encodeURIComponent(token)}`;
  return NextResponse.redirect(new URL(page, req.url), 303);
}
