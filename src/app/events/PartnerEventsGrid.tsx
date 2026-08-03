import { formatEventDateRange, eventDateBadge } from "@/lib/format-event-date";
import type { PublicPartnerEvent } from "@/lib/partner-events/public";

// Partner events are deliberately styled differently from our own: lighter cards, an
// explicit organizer label, and an outbound arrow. Somebody scanning the page should
// never be in doubt about who is running the thing or that the link leaves our site.

/**
 * Partner titles arrive with their location baked on, because that is how the source
 * organizations write them: "Fort Bragg Conservation Project, Fort Bragg, NC" or
 * "... Fishing Day - Jonathon Creek, NC". We show the location on its own line, so
 * repeating it in the title just makes an already-long heading wrap further.
 */
function trimLocationSuffix(title: string, city: string | null): string {
  let out = title.trim();

  // Drop a trailing ", Some Town, NC" or "- Some Town, NC".
  out = out.replace(/\s*[,-]\s*[A-Za-z][A-Za-z .']{1,38},\s*NC\.?$/i, "");

  // Drop a trailing "(Town)" when it just repeats the city we already display.
  if (city) {
    const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, "i"), "");
  }

  return out.trim() || title;
}

export default function PartnerEventsGrid({
  events,
}: {
  events: PublicPartnerEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-near-black/40">
        No partner events on the calendar right now. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const badge = event.startsAt ? eventDateBadge(event.startsAt) : null;
        const when = formatEventDateRange(event.startsAt, event.endsAt, "long");
        const title = trimLocationSuffix(event.title, event.city);
        const where = event.city || event.location;

        const body = (
          // Column layout with the link pushed down by mt-auto, so the call to action
          // sits on the card's bottom edge whatever the title length or whether the
          // source gave us a description.
          <div className="flex h-full flex-col p-5">
            <div className="flex items-start gap-4">
              {badge && (
                <div className="shrink-0 rounded bg-dark-green px-3 py-2 text-center text-white">
                  <div className="font-heading text-[10px] font-bold uppercase tracking-[1px]">
                    {badge.month}
                  </div>
                  <div className="font-heading text-xl font-[900] leading-none">
                    {badge.day}
                  </div>
                </div>
              )}

              <div className="min-w-0">
                {event.organizer && (
                  <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-near-black/40">
                    {event.organizer}
                  </p>
                )}
                {/* globals.css forces every heading to Barlow Condensed 900 uppercase.
                    That suits our own short titles ("Turkey Camp") but turns a partner's
                    sentence-case name into an unreadable wall, so this one opts out and
                    uses the body face at normal case. */}
                <h3 className="title-plain mt-1 text-[17px] leading-snug text-near-black">
                  {title}
                </h3>
              </div>
            </div>

            {/* One standardized meta block: full date on its own line, then place. */}
            <dl className="mt-4 space-y-1 text-sm">
              {when && (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-near-black/35">
                    When
                  </dt>
                  <dd className="text-near-black/70">{when}</dd>
                </div>
              )}
              {where && (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-near-black/35">
                    Where
                  </dt>
                  <dd className="text-near-black/70">{where}</dd>
                </div>
              )}
              {event.cost && (
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-near-black/35">
                    Cost
                  </dt>
                  <dd className="text-near-black/70">{event.cost}</dd>
                </div>
              )}
            </dl>

            {event.description && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-near-black/55">
                {event.description}
              </p>
            )}

            {event.url && (
              <span className="mt-auto flex items-center gap-1 pt-5 text-xs font-bold uppercase tracking-[1px] text-dark-green">
                Details at organizer
                <span aria-hidden="true">&rarr;</span>
              </span>
            )}
          </div>
        );

        const shell =
          "flex h-full flex-col rounded-lg border border-near-black/10 bg-white";

        return event.url ? (
          <a
            key={event.id}
            href={event.url}
            target="_blank"
            // noopener/noreferrer because these are third-party links we do not control.
            rel="noopener noreferrer"
            className={`${shell} transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-green`}
          >
            {body}
          </a>
        ) : (
          <div key={event.id} className={shell}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
