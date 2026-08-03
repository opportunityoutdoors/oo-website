import { formatEventDateRange, eventDateBadge } from "@/lib/format-event-date";
import type { PublicPartnerEvent } from "@/lib/partner-events/public";

// Partner events are deliberately styled differently from our own: lighter cards, an
// explicit organizer badge, and an outbound arrow. Somebody scanning the page should
// never be in doubt about who is running the thing or that the link leaves our site.

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const badge = event.startsAt ? eventDateBadge(event.startsAt) : null;
        const when = formatEventDateRange(event.startsAt, event.endsAt, "long");

        const card = (
          <>
            <div className="flex items-start gap-4">
              {badge && (
                <div className="shrink-0 rounded bg-dark-green px-3 py-2 text-center text-white">
                  <div className="text-[10px] font-bold uppercase tracking-[1px]">
                    {badge.month}
                  </div>
                  <div className="text-xl font-[900] leading-none">
                    {badge.day}
                  </div>
                </div>
              )}
              <div className="min-w-0">
                {event.organizer && (
                  <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-near-black/40">
                    {event.organizer}
                  </span>
                )}
                <h3 className="mt-1 text-base font-extrabold leading-snug text-near-black">
                  {event.title}
                </h3>
                <p className="mt-1 text-sm text-near-black/50">
                  {when}
                  {event.city && ` · ${event.city}`}
                  {event.cost && ` · ${event.cost}`}
                </p>
              </div>
            </div>

            {event.description && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-near-black/60">
                {event.description}
              </p>
            )}

            {event.url && (
              <span className="mt-3 inline-block text-xs font-bold uppercase tracking-[1px] text-dark-green">
                Details at organizer &rarr;
              </span>
            )}
          </>
        );

        return event.url ? (
          <a
            key={event.id}
            href={event.url}
            target="_blank"
            // noopener/noreferrer because these are third-party links we do not control.
            rel="noopener noreferrer"
            className="block rounded-lg border border-near-black/10 bg-white p-5 transition-shadow hover:shadow-md"
          >
            {card}
          </a>
        ) : (
          <div
            key={event.id}
            className="rounded-lg border border-near-black/10 bg-white p-5"
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}
