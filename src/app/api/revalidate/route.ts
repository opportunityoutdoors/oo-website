import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { client as sanityClient, writeClient as sanityWriteClient } from "@/lib/sanity";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json();
  const { _type, slug } = body;
  // Sanity IDs may come as "drafts.xxx" — strip the prefix
  const _id = ((body._id as string) || "").replace(/^drafts\./, "");

  // Check if this is a delete operation
  // Sanity sends transition: "disappear" or operation: "delete" on deletion
  const isDelete = body.transition === "disappear" || body.operation === "delete";

  if (isDelete && _id) {
    // Delete from Supabase
    const supabase = createServiceClient();
    if (_type === "event") {
      await supabase.from("events").delete().eq("sanity_id", _id);
    }
    revalidatePath("/");
    revalidatePath("/events");
    return NextResponse.json({ revalidated: true, deleted: true });
  }

  // Revalidate relevant paths based on content type
  switch (_type) {
    case "event":
      revalidatePath("/events");
      if (slug?.current) revalidatePath(`/events/${slug.current}`);
      revalidatePath("/");

      // Update existing Supabase event — fetch fresh from Sanity to get full data
      // Only updates, never creates. Creation happens on admin page load.
      if (_id) {
        updateEventInSupabase(_id).catch((err) =>
          console.error("Event sync error:", err)
        );
      }
      break;
    case "blogPost":
      revalidatePath("/blog");
      if (slug?.current) revalidatePath(`/blog/${slug.current}`);
      revalidatePath("/");
      break;
    case "teamMember":
      revalidatePath("/about");
      break;
    case "galleryImage":
      revalidatePath("/events");
      break;
    default:
      revalidatePath("/");
  }

  return NextResponse.json({ revalidated: true });
}

async function updateEventInSupabase(sanityId: string) {
  try {
    const supabase = createServiceClient();

    // Check if this event already exists in Supabase
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("sanity_id", sanityId)
      .single();

    if (!existing) return; // Not tracked yet — admin page will create it

    // Fetch full event document from Sanity
    const event = await sanityClient.fetch(
      `*[_type == "event" && _id == $id][0] {
        _id, title, slug, eventType, status, date, endDate, location, cost,
        spotsTotal, meetingSlots, campLocations, mentorPerks, menteePerks
      }`,
      { id: sanityId }
    );

    if (!event) return;

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

    // Process meeting slots — create/update Google Calendar events
    const meetingSlots = event.meetingSlots || [];
    let slotsUpdated = false;

    if (process.env.GOOGLE_CALENDAR_ID) {
      for (const slot of meetingSlots) {
        try {
          if (!slot.calendarEventId && slot.date) {
            // Create new calendar event
            const endTime = new Date(new Date(slot.date).getTime() + 60 * 60 * 1000).toISOString();
            const { eventId } = await createCalendarEvent({
              summary: `${event.title} — ${slot.label || "Pre-Camp Meeting"}`,
              description: `Pre-camp virtual meeting for ${event.title}. Attendance is required for all participants.`,
              start: slot.date,
              end: endTime,
              meetLink: slot.meetingLink || undefined,
            });
            slot.calendarEventId = eventId;
            slotsUpdated = true;
          } else if (slot.calendarEventId && slot.date) {
            // Update existing calendar event if date changed
            const endTime = new Date(new Date(slot.date).getTime() + 60 * 60 * 1000).toISOString();
            await updateCalendarEvent(slot.calendarEventId, {
              summary: `${event.title} — ${slot.label || "Pre-Camp Meeting"}`,
              start: slot.date,
              end: endTime,
            });
          }
        } catch (calErr) {
          console.error("Calendar event error for slot:", slot.label, calErr);
        }
      }

      // If we created calendar events, patch the Sanity document with the new IDs/links
      if (slotsUpdated) {
        try {
          await sanityWriteClient
            .patch(sanityId)
            .set({ meetingSlots })
            .commit();
        } catch (sanityErr) {
          console.error("Failed to patch Sanity with calendar data:", sanityErr);
        }
      }
    }

    await supabase
      .from("events")
      .update({
        title: event.title || "Untitled Event",
        slug: event.slug?.current || null,
        event_type: typeMap[event.eventType] || "community",
        status: statusMap[event.status] || "draft",
        date_start: event.date || null,
        date_end: event.endDate || null,
        location: event.location || null,
        cost: event.cost || null,
        spots_total: event.spotsTotal || null,
        meeting_slots: meetingSlots,
        camp_locations: event.campLocations || [],
        mentor_perks: event.mentorPerks || [],
        mentee_perks: event.menteePerks || [],
      })
      .eq("sanity_id", sanityId);
  } catch (err) {
    console.error("Failed to update event in Supabase:", err);
  }
}
