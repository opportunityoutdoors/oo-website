import EventPipeline from "./EventPipeline";

export const metadata = { title: "Event Management" };
export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventPipeline eventId={id} />;
}
