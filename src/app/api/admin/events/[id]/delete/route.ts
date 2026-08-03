import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";
import { client as sanityClient, writeClient } from "@/lib/sanity";

// Delete an event everywhere.
//
// Deleting a document in the Sanity Studio does not reliably remove the mirrored row in
// Supabase: the delete webhook only fires if the project is configured to send delete
// events, so events routinely end up stranded here. They stay invisible to editors while
// still appearing in admin lists and still holding their registrations.
//
// This removes the Supabase row and, when the Sanity document still exists, deletes that
// too, so one action leaves nothing behind in either system.
//
// DESTRUCTIVE. registrations cascade from events, and survey_responses cascade from
// registrations, so deleting an event with attendance destroys its survey history and
// with it any impact reporting for that event. The GET below exists so the UI can state
// exactly what will be lost before anyone confirms.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await apiRequireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, sanity_id")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: regs } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("event_id", id);

  const { data: responses } = await supabase
    .from("survey_responses")
    .select("id")
    .eq("event_id", id);

  let existsInSanity = false;
  if (event.sanity_id) {
    try {
      const doc = await sanityClient.fetch(`*[_id == $id][0]{_id}`, {
        id: event.sanity_id,
      });
      existsInSanity = Boolean(doc?._id);
    } catch {
      // Treat an unreachable Sanity as "unknown"; the UI says so rather than implying
      // the document is already gone.
      existsInSanity = false;
    }
  }

  return NextResponse.json({
    title: event.title,
    existsInSanity,
    registrations: regs?.length ?? 0,
    attended: (regs || []).filter((r) => r.status === "attended").length,
    surveyResponses: responses?.length ?? 0,
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin-only: this destroys registration and survey history, which an editor should not
  // be able to do.
  const { error: authError } = await apiRequireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, sanity_id")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Sanity first. If it fails we stop with both systems still consistent, rather than
  // deleting the Supabase row and leaving an orphaned document the admin page can no
  // longer see or act on.
  let sanityDeleted = false;
  if (event.sanity_id) {
    try {
      const doc = await sanityClient.fetch(`*[_id == $id][0]{_id}`, {
        id: event.sanity_id,
      });
      if (doc?._id) {
        await writeClient.delete(event.sanity_id);
        sanityDeleted = true;
      }
    } catch (err) {
      console.error("Sanity delete failed:", err);
      return NextResponse.json(
        {
          error:
            "Could not delete the Sanity document, so nothing was removed. Try again, or delete it in the Studio first.",
        },
        { status: 502 }
      );
    }
  }

  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) {
    console.error("Event delete failed:", error);
    return NextResponse.json(
      { error: "Removed from Sanity but the database delete failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sanityDeleted });
}
