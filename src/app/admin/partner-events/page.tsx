import PartnerEventsQueue from "./PartnerEventsQueue";

export const metadata = { title: "Local Events" };
export const dynamic = "force-dynamic";

export default function PartnerEventsPage() {
  return <PartnerEventsQueue />;
}
