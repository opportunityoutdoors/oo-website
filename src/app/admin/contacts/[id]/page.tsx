import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Contact Detail" };

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  ]);

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/contacts"
          className="mb-3 inline-block text-xs font-semibold uppercase tracking-[1px] text-near-black/40 transition-colors hover:text-near-black"
        >
          &larr; Back to Contacts
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
              ["Location", contact.city_state],
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
          {registrations && registrations.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white">
              <div className="border-b border-near-black/10 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
                  Event History ({registrations.length})
                </h2>
              </div>
              {registrations.map((reg) => (
                <div key={reg.id} className="flex items-center justify-between border-b border-near-black/5 px-5 py-4 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-near-black">
                      {(reg.events as { title: string } | null)?.title || "Unknown Event"}
                    </p>
                    <p className="text-xs text-near-black/50">
                      {reg.role} · {new Date(reg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      reg.status === "registered" || reg.status === "attended"
                        ? "bg-dark-green/10 text-dark-green"
                        : reg.status === "approved"
                          ? "bg-gold/15 text-gold"
                          : reg.status === "denied"
                            ? "bg-red-100 text-red-600"
                            : "bg-near-black/5 text-near-black/50"
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
              ))}
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
