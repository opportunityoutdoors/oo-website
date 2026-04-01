import EventsList from "./EventsList";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default function EventsPage() {
  return <EventsList />;
}
