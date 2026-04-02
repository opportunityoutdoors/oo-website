import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { client as sanityClient } from "@/lib/sanity";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json();
  const { _type, slug } = body;
  // Sanity IDs may come as "drafts.xxx" — strip the prefix
  const _id = ((body._id as string) || "").replace(/^drafts\./, "");

  // Revalidate relevant paths based on content type
  switch (_type) {
    case "event":
      revalidatePath("/events");
      if (slug?.current) revalidatePath(`/events/${slug.current}`);
      revalidatePath("/");

      // Sync event to Supabase — fetch fresh from Sanity to get full data
      if (_id) {
        syncEventToSupabase(_id).catch((err) =>
          console.error("Event sync error:", err)
        );
      }
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

async function syncEventToSupabase(sanityId: string) {
  try {
    // Fetch full event document from Sanity
    const event = await sanityClient.fetch(
      `*[_type == "event" && _id == $id][0] {
        _id, title, slug, eventType, status, date, endDate, location, cost,
        spotsTotal, spotsRemaining, meetingSlots, campLocations, mentorPerks, menteePerks
      }`,
      { id: sanityId }
    );

    if (!event) return; // Document was deleted or is a draft

    const supabase = createServiceClient();

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
        title: event.title || "Untitled Event",
        slug: event.slug?.current || null,
        event_type: typeMap[event.eventType] || "community",
        status: statusMap[event.status] || "draft",
        date_start: event.date || null,
        date_end: event.endDate || null,
        location: event.location || null,
        cost: event.cost || null,
        spots_total: event.spotsTotal || null,
        spots_remaining: event.spotsRemaining || null,
        meeting_slots: event.meetingSlots || [],
        camp_locations: event.campLocations || [],
        mentor_perks: event.mentorPerks || [],
        mentee_perks: event.menteePerks || [],
      },
      { onConflict: "sanity_id" }
    );
  } catch (err) {
    console.error("Failed to sync event to Supabase:", err);
  }
}
