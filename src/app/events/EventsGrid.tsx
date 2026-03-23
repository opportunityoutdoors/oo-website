"use client";

import { useState } from "react";
import Link from "next/link";
import FilterTabs from "@/components/ui/FilterTabs";
// Placeholder events until Sanity content is populated
const placeholderEvents: {
  _id: string;
  title: string;
  slug: { current: string };
  eventType: string;
  date: string;
  endDate?: string;
  location: string;
  description: string;
  cost?: string;
  status?: string;
}[] = [
  {
    _id: "1",
    title: "Turkey Camp 2026",
    slug: { current: "turkey-camp-2026" },
    eventType: "hunt-camp",
    date: "2026-04-17T00:00:00Z",
    endDate: "2026-04-19T00:00:00Z",
    location: "Nantahala National Forest, NC",
    description: "3-day turkey hunting camp for mentees and mentors. All experience levels welcome.",
    cost: "$75",
    status: "waitlist-open",
  },
  {
    _id: "2",
    title: "Fishing Camp 2026",
    slug: { current: "fishing-camp-2026" },
    eventType: "fish-camp",
    date: "2026-06-15T00:00:00Z",
    endDate: "2026-06-17T00:00:00Z",
    location: "Location TBD",
    description: "Weekend fishing camp — freshwater and fly fishing instruction with experienced mentors.",
    cost: "$75",
    status: "draft",
  },
  {
    _id: "3",
    title: "Spring Cookout & Range Day",
    slug: { current: "spring-cookout-2026" },
    eventType: "community",
    date: "2026-05-03T00:00:00Z",
    location: "Raleigh, NC",
    description: "Casual cookout and range day. Great way to meet the OO community. No experience needed.",
    cost: "Free",
    status: "registration-open",
  },
  {
    _id: "4",
    title: "Intro to Archery Workshop",
    slug: { current: "intro-archery-2026" },
    eventType: "workshop",
    date: "2026-05-17T00:00:00Z",
    location: "Durham, NC",
    description: "Half-day archery fundamentals workshop. Equipment provided.",
    cost: "Free",
    status: "registration-open",
  },
];

const TABS = ["All Events", "Camps", "Community", "Workshops"];

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

function getButtonLabel(eventType: string, status?: string): string {
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

export default function EventsGrid() {
  const [activeTab, setActiveTab] = useState("All Events");

  const filtered = placeholderEvents.filter((e) => {
    if (activeTab === "All Events") return true;
    if (activeTab === "Camps")
      return e.eventType === "hunt-camp" || e.eventType === "fish-camp";
    if (activeTab === "Community") return e.eventType === "community";
    if (activeTab === "Workshops") return e.eventType === "workshop";
    return true;
  });

  return (
    <>
      <div className="mb-10">
        <FilterTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-near-black/40">
            No events in this category right now. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((event) => {
            const dateObj = new Date(event.date);
            const month = dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase();
            const day = dateObj.getDate();
            const isDisabled = event.status === "sold-out" || event.status === "completed" || event.status === "draft";

            return (
              <Link
                key={event._id}
                href={`/events/${event.slug.current}`}
                className="group relative flex h-[350px] overflow-hidden rounded-lg bg-dark-green"
              >
                {/* Placeholder bg */}
                <div className="absolute inset-0 bg-dark-green transition-transform duration-400 group-hover:scale-105" />
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
                    {event.cost && ` — ${event.cost}`}
                  </p>
                  <span
                    className={`mt-4 inline-block rounded px-5 py-2 text-[11px] font-bold uppercase tracking-[1px] ${
                      isDisabled
                        ? "bg-white/20 text-white/50"
                        : "bg-white text-near-black"
                    }`}
                  >
                    {getButtonLabel(event.eventType, event.status)}
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
