import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json();
  const { _type, _id, slug } = body;

  // Revalidate relevant paths based on content type
  switch (_type) {
    case "event":
      revalidatePath("/events");
      if (slug?.current) revalidatePath(`/events/${slug.current}`);
      revalidatePath("/");

      // Sync event to Supabase for registration tracking
      await syncEventToSupabase(_id, body);
      break;
    case "blogPost":
      revalidatePath("/blog");
      if (slug?.current) revalidatePath(`/blog/${slug.current}`);
      revalidatePath("/");
      break;
    case "podcastEpisode":
      revalidatePath("/podcast");
      break;
    case "teamMember":
      revalidatePath("/about");
      break;
    case "faqItem":
      revalidatePath("/faq");
      break;
    case "partner":
      revalidatePath("/about");
      revalidatePath("/donate");
      break;
    default:
      revalidatePath("/");
  }

  return NextResponse.json({ revalidated: true });
}

async function syncEventToSupabase(
  sanityId: string,
  body: Record<string, unknown>
) {
  try {
    const supabase = createServiceClient();

    // Map Sanity event type strings to our Postgres enum
    const typeMap: Record<string, string> = {
      "hunt-camp": "hunt-camp",
      "fish-camp": "fish-camp",
      community: "community",
      workshop: "workshop",
    };

    const statusMap: Record<string, string> = {
      draft: "draft",
      "waitlist-open": "waitlist-open",
      "waitlist-closed": "waitlist-closed",
      "registration-open": "registration-open",
      "sold-out": "sold-out",
      completed: "completed",
      archived: "archived",
    };

    await supabase.from("events").upsert(
      {
        sanity_id: sanityId,
        title: (body.title as string) || "Untitled Event",
        slug: (body.slug as { current: string })?.current || null,
        event_type: typeMap[(body.eventType as string)] || "community",
        status: statusMap[(body.status as string)] || "draft",
        date_start: (body.date as string) || null,
        date_end: (body.endDate as string) || null,
        location: (body.location as string) || null,
        cost: (body.cost as string) || null,
        spots_total: (body.spotsTotal as number) || null,
        spots_remaining: (body.spotsRemaining as number) || null,
        meeting_slots: (body.meetingSlots as unknown[]) || [],
      },
      { onConflict: "sanity_id" }
    );
  } catch (err) {
    console.error("Failed to sync event to Supabase:", err);
  }
}
