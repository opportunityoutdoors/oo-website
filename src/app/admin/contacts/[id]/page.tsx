import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { position, POSITIONS, EXIT_REASONS } from "@/lib/camp-pipeline";

/**
 * Timeline rows in words rather than database vocabulary.
 *
 * A profile is read by board members deciding something about a person, not by whoever wrote
 * the schema. "check_result" is not a sentence.
 */
const EVENT_LABEL: Record<string, string> = {
  created: "Joined the waitlist",
  status_change: "Moved",
  meeting_selected: "Chose a meeting slot",
  registered: "Completed registration",
  waiver_signed: "Signed the waiver",
  paid: "Paid",
  refunded: "Refunded",
  check_ordered: "Background check ordered",
  check_result: "Background check came back",
  panel_decision: "Panel decision",
  matched: "Matched with",
  packet_sent: "Welcome packet sent",
  attended: "Attended",
};

export const metadata = { title: "Contact Detail" };

// Reads searchParams (`from`) and live registration data, neither of which survives being
// cached. Every other admin page sets this; this one did not, and the back link silently
// kept rendering its build-time value.
export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = createServiceClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  // Fetch related data in parallel
  const [
    { data: menteeApps },
    { data: mentorApps },
    { data: registrations },
    { data: sponsorships },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from("mentee_applications")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("mentor_applications")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("registrations")
      .select("*, events(title, event_type, date_start)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sponsorship_inquiries")
      .select("*")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    // Every panel decision about this person. Append-only, and the screening policy requires
    // it exist; being able to read it without knowing which event to look under is what
    // makes it usable.
    supabase
      .from("background_check_reviews")
      .select("*, admin_users(email)")
      .eq("contact_id", id)
      .order("decided_at", { ascending: false }),
  ]);

  // Board moves for this person's registrations, including backwards ones.
  const { data: moves } = registrations?.length
    ? await supabase
        .from("registration_events")
        .select("*, admin_users(email)")
        .in("registration_id", registrations.map((r) => r.id))
        .order("occurred_at", { ascending: false })
    : { data: [] };

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";

  // Where "back" should go. Opening a profile from a camp board and being returned to the
  // full contact list means finding your way back to the camp by hand every time.
  //
  // Shape-checked before it reaches an href: `from` is a query parameter, and building a URL
  // out of unvalidated input is how an open redirect starts, even on a page behind auth.
  const fromEventId = /^[0-9a-f-]{36}$/i.test(from ?? "") ? from : null;
  const { data: fromEvent } = fromEventId
    ? await supabase.from("events").select("title").eq("id", fromEventId).maybeSingle()
    : { data: null };

  const back = fromEventId
    ? { href: `/admin/events/${fromEventId}`, label: fromEvent?.title ?? "Back to event" }
    : { href: "/admin/contacts", label: "Back to Contacts" };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={back.href}
          className="mb-3 inline-block text-xs font-semibold uppercase tracking-[1px] text-near-black/40 transition-colors hover:text-near-black"
        >
          &larr; {back.label}
        </Link>
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          {name}
        </h1>
        <p className="mt-1 text-sm text-near-black/50">{contact.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <div className="rounded-lg border border-near-black/10 bg-white p-5 lg:col-span-1">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
            Contact Info
          </h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Email", contact.email],
              ["Phone", contact.phone],
              ["Location", [contact.city, contact.state].filter(Boolean).join(", ")],
              ["T-Shirt Size", contact.tshirt_size],
              ["Experience", contact.experience_level],
              ["Gear Status", contact.gear_status],
              ["Source", contact.source],
              ["Member Since", new Date(contact.created_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs font-semibold uppercase tracking-[0.5px] text-near-black/40">
                  {label}
                </dt>
                <dd className="mt-0.5 text-near-black">{(value as string) || "—"}</dd>
              </div>
            ))}
          </dl>

          {/* Interests */}
          {contact.interests && contact.interests.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.5px] text-near-black/40">
                Interests
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {contact.interests.map((interest: string) => (
                  <span
                    key={interest}
                    className="rounded bg-dark-green/10 px-2 py-0.5 text-xs font-medium text-dark-green"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.5px] text-near-black/40">
                Tags
              </h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {contact.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.5px] text-near-black/40">
                Notes
              </h3>
              <p className="mt-1 text-sm text-near-black/70">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Activity / History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Mentee Applications */}
          {menteeApps && menteeApps.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Mentee Applications ({menteeApps.length})
                </h2>
              </div>
              {menteeApps.map((app) => (
                <div key={app.id} className="border-b border-near-black/5 px-5 py-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-near-black">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    <span className="rounded bg-dark-green/10 px-2 py-0.5 text-xs font-medium text-dark-green">
                      {app.experience_level}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {app.outdoor_interests?.map((interest: string) => (
                      <span key={interest} className="text-xs text-near-black/50">
                        {interest}
                      </span>
                    ))}
                  </div>
                  {app.about_yourself && (
                    <p className="mt-2 text-sm text-near-black/60">{app.about_yourself}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Mentor Applications */}
          {mentorApps && mentorApps.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Mentor Applications ({mentorApps.length})
                </h2>
              </div>
              {mentorApps.map((app) => (
                <div key={app.id} className="border-b border-near-black/5 px-5 py-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-near-black">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-near-black/50">
                      {app.years_experience} experience
                    </span>
                  </div>
                  {app.why_mentor && (
                    <p className="mt-2 text-sm text-near-black/60">{app.why_mentor}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Event/Camp History */}
          {/* Screening. Above the event history because it is about the person rather than
              any one camp, which is the distinction the whole data model turns on. */}
          {(contact.background_check_status !== "none" || (reviews?.length ?? 0) > 0) && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="flex items-baseline justify-between gap-3 border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Screening
                </h2>
                <span className="text-xs text-near-black/50">
                  {contact.background_check_status}
                  {contact.background_check_expires_at &&
                    contact.background_check_status === "clear" &&
                    ` until ${new Date(contact.background_check_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`}
                </span>
              </div>

              {reviews && reviews.length > 0 ? (
                reviews.map((r) => {
                  const by = Array.isArray(r.admin_users) ? r.admin_users[0] : r.admin_users;
                  return (
                    <div key={r.id} className="border-b border-near-black/5 px-5 py-3 last:border-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-near-black">
                          {String(r.decision).replace(/_/g, " ")}
                          {r.status_before && r.status_after
                            ? ` (${r.status_before} to ${r.status_after})`
                            : ""}
                        </span>
                        <span className="shrink-0 text-xs text-near-black/40">
                          {new Date(r.decided_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-near-black/50">
                        {by?.email ? `recorded by ${by.email} · ` : ""}present: {r.panel_present}
                      </p>
                      {/* The decision, never the report. Same rule as everywhere else. */}
                      <p className="mt-1 text-xs leading-relaxed text-near-black/70">{r.reason}</p>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-4 text-xs text-near-black/40">
                  No panel decisions recorded. A check that came back clean never needs one.
                </p>
              )}
            </div>
          )}

          {registrations && registrations.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Event History ({registrations.length})
                </h2>
              </div>
              {registrations.map((reg) => {
                const ev = reg.events as { title: string; date_start: string | null } | null;

                // The same position the board would put them in, computed from the same
                // function, so the two views cannot describe this person differently.
                const pos = position({
                  ...reg,
                  contacts: {
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    email: contact.email,
                    date_of_birth: contact.date_of_birth,
                    background_check_status: contact.background_check_status,
                    background_check_expires_at: contact.background_check_expires_at,
                  },
                });
                const label = POSITIONS.find((p) => p.key === pos)?.label ?? pos;
                const exit = EXIT_REASONS.find((x) => x.value === reg.exit_reason);
                const theirMoves = (moves ?? []).filter((m) => m.registration_id === reg.id);

                return (
                  <div key={reg.id} className="border-b border-near-black/5 px-5 py-4 last:border-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-near-black">
                          {ev?.title || "Unknown Event"}
                        </p>
                        <p className="text-xs text-near-black/50">
                          {reg.role} · joined {new Date(reg.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          pos === "attended" || pos === "ready"
                            ? "bg-dark-green/10 text-dark-green"
                            : pos === "turned_away" || pos === "dropped_out"
                              ? "bg-[#b00]/10 text-[#b00]"
                              : "bg-near-black/5 text-near-black/50"
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    {exit && (
                      <p className="mt-1 text-xs text-near-black/50">{exit.label}</p>
                    )}

                    {/* The whole sequence, newest first. Everything that happened to this
                        registration, whoever or whatever caused it. Rows dated before
                        2026-08-09 were reconstructed from timestamps that already existed,
                        so somebody who registered years ago still has a history. */}
                    {theirMoves.length > 0 && (
                      <ol className="mt-2 space-y-1 border-l border-near-black/10 pl-3">
                        {theirMoves.map((m) => {
                          const by = Array.isArray(m.admin_users) ? m.admin_users[0] : m.admin_users;
                          const actor =
                            m.source === "system"
                              ? "automatic"
                              : m.source === "participant"
                                ? "them"
                                : (by?.email ?? "unknown");

                          return (
                            <li key={m.id} className="text-[11px] leading-snug text-near-black/50">
                              <span className="text-near-black/75">{EVENT_LABEL[m.kind] ?? m.kind}</span>
                              {m.kind === "status_change" && m.to_status
                                ? ` ${m.from_status ? `${m.from_status} → ` : ""}${m.to_status}`
                                : ""}
                              {m.exit_reason ? ` (${String(m.exit_reason).replace(/_/g, " ")})` : ""}
                              {m.detail ? ` · ${m.detail}` : ""}
                              {" · "}
                              {new Date(m.occurred_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                              {" · "}
                              <span className={m.source === "system" ? "italic" : ""}>{actor}</span>
                              {m.note ? <span className="block text-near-black/45">{m.note}</span> : null}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sponsorship Inquiries */}
          {sponsorships && sponsorships.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Sponsorship Inquiries ({sponsorships.length})
                </h2>
              </div>
              {sponsorships.map((sp) => (
                <div key={sp.id} className="border-b border-near-black/5 px-5 py-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-near-black">{sp.company_name}</span>
                    <span className="text-xs text-near-black/50">{sp.budget_range}</span>
                  </div>
                  {sp.about_company && (
                    <p className="mt-2 text-sm text-near-black/60">{sp.about_company}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!menteeApps?.length && !mentorApps?.length && !registrations?.length && !sponsorships?.length && (
            <div className="rounded-lg border border-near-black/10 bg-white px-5 py-10 text-center text-near-black/40">
              No activity yet for this contact
            </div>
          )}
        </div>
      </div>
    </>
  );
}
