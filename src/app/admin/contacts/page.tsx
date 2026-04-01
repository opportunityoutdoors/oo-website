import ContactsTable from "./ContactsTable";

export const metadata = { title: "Contacts" };
export const dynamic = "force-dynamic";

export default function ContactsPage() {
  return <ContactsTable />;
}
