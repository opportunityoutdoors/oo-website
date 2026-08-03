"use client";

import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/lib/sanity";
import { eventDateBadge } from "@/lib/format-event-date";
import type { Event } from "@/types";

interface EventsGridProps {
  events?: Event[];
  /** "past" dims the cards and relabels the action, since nothing is joinable. */
  variant?: "upcoming" | "past";
}



function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "hunt-camp":
      return "Hunt Camp";
    case "fish-camp":
      return "Fish Camp";
    case "community":
      return "Community";
    case "workshop":
      return "Workshop";
    default:
      return eventType;
  }
}

function getButtonLabel(
  eventType: string,
  status?: string,
  isPast?: boolean
): string {
  // Date wins over status. An event whose last day has passed is over regardless of
  // whether anyone remembered to change its status in Sanity.
  if (isPast) return "Past Event";
  if (status === "sold-out") return "Full";
  if (status === "completed") return "Past Event";
  if (eventType === "hunt-camp" || eventType === "fish-camp") {
    if (status === "waitlist-open") return "Join Waitlist";
    if (status === "waitlist-closed") return "Waitlist Closed";
    return "Coming Soon";
  }
  if (status === "registration-open") return "Register";
  return "Learn More";
}

export default function EventsGrid({
  events,
  variant = "upcoming",
}: EventsGridProps) {
  const isPast = variant === "past";
  const displayEvents = events ?? [];

  return (
    <>
      {displayEvents.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-near-black/40">
            {isPast
              ? "Nothing in the last six months."
              : "No events on the calendar right now. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayEvents.map((event) => {
            const { month, day } = eventDateBadge(event.date);
            const isDisabled =
              isPast ||
              event.status === "sold-out" ||
              event.status === "completed" ||
              event.status === "draft";

            return (
              <Link
                key={event._id}
                href={`/events/${event.slug.current}`}
                className="group relative flex h-[350px] overflow-hidden rounded-lg bg-dark-green"
              >
                {event.image ? (
                  <Image
                    src={urlFor(event.image).width(800).height(500).fit("crop").url()}
                    alt={event.image.alt || event.title}
                    fill
                    className="object-cover transition-transform duration-400 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-dark-green transition-transform duration-400 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Date badge */}
                <div className="absolute top-6 left-6 z-10 text-center">
                  <span className="block text-xs font-bold uppercase tracking-wider text-white/60">
                    {month}
                  </span>
                  <span className="block text-3xl font-black text-white">
                    {day}
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
                  <span className="mb-2 inline-block rounded bg-gold/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                    {getEventTypeLabel(event.eventType)}
                  </span>
                  <h3 className="text-2xl font-extrabold text-white">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">
                    {event.location}
                    {event.cost && ` · ${event.cost}`}
                  </p>
                  <span
                    className={`mt-4 inline-block rounded px-5 py-2 text-[11px] font-bold uppercase tracking-[1px] ${
                      isDisabled
                        ? "bg-white/20 text-white/50"
                        : "bg-white text-near-black"
                    }`}
                  >
                    {getButtonLabel(event.eventType, event.status, isPast)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
