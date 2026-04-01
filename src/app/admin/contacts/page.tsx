import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const sourceFilter = params.source || "";
  const page = parseInt(params.page || "1", 10);
  const perPage = 50;
  const offset = (page - 1) * perPage;

  const supabase = createServiceClient();

  let dbQuery = supabase
    .from("contacts")
    .select("id, email, first_name, last_name, phone, city_state, source, tags, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (query) {
    dbQuery = dbQuery.or(
      `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
    );
  }

  if (sourceFilter) {
    dbQuery = dbQuery.eq("source", sourceFilter);
  }

  const { data: contacts, count } = await dbQuery;
  const totalPages = Math.ceil((count ?? 0) / perPage);

  // Get distinct sources for filter dropdown
  const { data: sources } = await supabase
    .from("contacts")
    .select("source")
    .not("source", "is", null)
    .order("source");
  const uniqueSources = [...new Set(sources?.map((s) => s.source).filter(Boolean))];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Contacts
        </h1>
        <span className="text-sm text-near-black/40">
          {count ?? 0} total
        </span>
      </div>

      {/* Filters */}
      <form className="mb-6 flex gap-3" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name or email..."
          className="w-full max-w-sm rounded border border-near-black/20 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        />
        <select
          name="source"
          defaultValue={sourceFilter}
          className="rounded border border-near-black/20 bg-white px-3 py-2.5 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        >
          <option value="">All Sources</option>
          {uniqueSources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-dark-green px-5 py-2.5 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
        >
          Search
        </button>
        {(query || sourceFilter) && (
          <Link
            href="/admin/contacts"
            className="flex items-center rounded border border-near-black/20 px-4 py-2.5 text-xs font-semibold text-near-black/60 transition-colors hover:bg-near-black/5"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-lg border border-near-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Location</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Tags</th>
                <th className="px-5 py-3 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody>
              {contacts?.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-near-black/5 transition-colors last:border-0 hover:bg-cream/50"
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
                  <td className="px-5 py-3 text-near-black/60">{contact.phone || "—"}</td>
                  <td className="px-5 py-3 text-near-black/60">{contact.city_state || "—"}</td>
                  <td className="px-5 py-3">
                    {contact.source && (
                      <span className="rounded bg-dark-green/10 px-2 py-0.5 text-xs font-medium text-dark-green">
                        {contact.source}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {contact.tags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="mr-1 rounded bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold"
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="px-5 py-3 text-near-black/40">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!contacts || contacts.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-near-black/40">
                    {query || sourceFilter ? "No contacts match your search" : "No contacts yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-near-black/5 px-5 py-3">
            <span className="text-xs text-near-black/40">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/contacts?q=${query}&source=${sourceFilter}&page=${page - 1}`}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-xs font-semibold text-near-black/60 hover:bg-near-black/5"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/contacts?q=${query}&source=${sourceFilter}&page=${page + 1}`}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-xs font-semibold text-near-black/60 hover:bg-near-black/5"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
