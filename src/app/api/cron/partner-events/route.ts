import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { SOURCES, syncSource } from "@/lib/partner-events/sync";

// Weekly pull of partner events into the review queue.
//
// Everything lands as 'pending' and is invisible on the site and in the newsletter until
// somebody approves it. Sources are synced independently so one failing does not stop the
// others, and each run is recorded in partner_event_syncs so a scraper that quietly stops
// returning rows can be spotted.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = [];

  for (const source of SOURCES) {
    results.push(await syncSource(supabase, source));
  }

  return NextResponse.json({
    message: "Partner events synced",
    results,
  });
}
