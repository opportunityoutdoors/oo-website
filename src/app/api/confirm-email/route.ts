import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// The link in the waitlist email. A GET because it is clicked from an inbox. A mail scanner
// that follows the link also confirms the address, which is acceptable: the scanner only sees
// mail that was delivered, and delivery is the thing being proven.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const done = (state: "ok" | "invalid") =>
    NextResponse.redirect(new URL(`/email-confirmed?state=${state}`, request.url));

  if (!/^[0-9a-f]{48}$/.test(token)) return done("invalid");

  const supabase = createServiceClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email_confirmed_at")
    .eq("email_confirm_token", token)
    .maybeSingle();
  if (!contact) return done("invalid");

  if (!contact.email_confirmed_at) {
    const { error } = await supabase
      .from("contacts")
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq("id", contact.id);
    if (error) {
      console.error("Email confirm error:", error);
      return done("invalid");
    }
  }
  return done("ok");
}
