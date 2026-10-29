import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationReminders } from "@/lib/registration-reminder";

// Daily: reminds people approved for a camp who have not registered, 7 days and 2 days
// before registration closes (lib/registration-reminder.ts).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Same guard as the other crons: Vercel sends the secret, nobody else should reach this.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendRegistrationReminders();
  console.log(
    `Registration reminders: ${result.first} first, ${result.final} final, ${result.failed.length} failed`
  );
  return NextResponse.json(result);
}
