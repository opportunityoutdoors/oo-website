import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Pings Supabase on a schedule so free-tier projects aren't auto-paused after
// 7 days of inactivity. Scheduled twice weekly (Mon + Thu) via vercel.json.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
