import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const [
    { count: contactCount },
    { count: menteeCount },
    { count: mentorCount },
    { count: registrationCount },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("mentee_applications").select("*", { count: "exact", head: true }),
    supabase.from("mentor_applications").select("*", { count: "exact", head: true }),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
  ]);

  const { data: recentContacts } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, source, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const stats = [
    { label: "Contacts", value: contactCount ?? 0, href: "/admin/contacts" },
    { label: "Mentee Applications", value: menteeCount ?? 0, href: "/admin/contacts" },
    { label: "Mentor Applications", value: mentorCount ?? 0, href: "/admin/contacts" },
    { label: "Registrations", value: registrationCount ?? 0, href: "/admin/events" },
  ];

  return (
    <>
      <h1 className="mb-8 font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-near-black/10 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <p className="text-3xl font-extrabold text-dark-green">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[1px] text-near-black/50">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent Contacts */}
      <div className="rounded-lg border border-near-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-near-black/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Recent Contacts
          </h2>
          <Link
            href="/admin/contacts"
            className="text-xs font-semibold text-dark-green transition-colors hover:text-dark-green/70"
          >
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentContacts?.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-near-black/5 last:border-0"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/contacts/${contact.id}`}
                      className="font-medium text-near-black hover:text-dark-green"
                    >
                      {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-near-black/60">{contact.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-dark-green/10 px-2 py-0.5 text-xs font-medium text-dark-green">
                      {contact.source || "Unknown"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-near-black/40">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!recentContacts || recentContacts.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-near-black/40">
                    No contacts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
