"use client";

import { useState, useEffect, useCallback } from "react";

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  tshirt_size: string | null;
  experience_level: string | null;
  interests: string[] | null;
  gear_status: string | null;
  source: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactDetail extends Contact {
  mentee_applications: Array<{
    id: string;
    outdoor_interests: string[];
    experience_level: string;
    gear_status: string;
    how_heard: string;
    about_yourself: string;
    created_at: string;
  }>;
  mentor_applications: Array<{
    id: string;
    outdoor_skills: string[];
    years_experience: string;
    why_mentor: string;
    created_at: string;
  }>;
  registrations: Array<{
    id: string;
    status: string;
    role: string;
    created_at: string;
    events: { title: string; event_type: string; date_start: string } | null;
  }>;
  sponsorship_inquiries: Array<{
    id: string;
    company_name: string;
    budget_range: string;
    about_company: string;
    created_at: string;
  }>;
}

interface ApiResponse {
  contacts: Contact[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  sources: string[];
}

type SortField = "first_name" | "email" | "city" | "source" | "experience_level" | "created_at";

const COLUMNS: { key: SortField; label: string; className?: string }[] = [
  { key: "first_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "city", label: "Location" },
  { key: "source", label: "Source" },
  { key: "experience_level", label: "Experience" },
  { key: "created_at", label: "Added", className: "w-28" },
];

export default function ContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sort, setSort] = useState<SortField>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Contact>>({});
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: search,
      source: sourceFilter,
      sort,
      order,
      page: String(page),
    });
    const res = await fetch(`/api/admin/contacts?${params}`);
    const data: ApiResponse = await res.json();
    setContacts(data.contacts);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setSources(data.sources);
    setLoading(false);
  }, [search, sourceFilter, sort, order, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function handleSort(field: SortField) {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/contacts/${id}`);
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditFields({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      phone: contact.phone || "",
      city: contact.city || "",
      state: contact.state || "NC",
      tshirt_size: contact.tshirt_size || "",
      experience_level: contact.experience_level || "",
      gear_status: contact.gear_status || "",
      notes: contact.notes || "",
      tags: contact.tags || [],
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await fetch("/api/admin/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editFields }),
    });
    setSaving(false);
    setEditingId(null);
    fetchContacts();
    // Refresh detail if expanded
    if (expandedId === editingId) {
      const res = await fetch(`/api/admin/contacts/${editingId}`);
      setDetail(await res.json());
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const ids = contacts.map((c) => c.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} contact${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch("/api/admin/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    setExpandedId(null);
    setDetail(null);
    setDeleting(false);
    fetchContacts();
  }

  async function handleSingleDelete(id: string) {
    if (!confirm("Permanently delete this contact? This cannot be undone.")) return;
    setDeleting(true);
    await fetch("/api/admin/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setExpandedId(null);
    setDetail(null);
    setDeleting(false);
    fetchContacts();
  }

  const sortIcon = (field: SortField) => {
    if (sort !== field) return "↕";
    return order === "asc" ? "↑" : "↓";
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Contacts
        </h1>
        <span className="text-sm text-near-black/40">{total} total</span>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, location..."
          className="w-full max-w-sm rounded border border-near-black/20 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        />
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="rounded border border-near-black/20 bg-white px-3 py-2.5 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
        >
          <option value="">All Sources</option>
          {sources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-dark-green px-5 py-2.5 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
        >
          Search
        </button>
        {(search || sourceFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setSourceFilter(""); setPage(1); }}
            className="rounded border border-near-black/20 px-4 py-2.5 text-xs font-semibold text-near-black/60 transition-colors hover:bg-near-black/5"
          >
            Clear
          </button>
        )}
      </form>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-red-600">
            {selected.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="rounded border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-near-black/10 bg-white">
        {loading ? (
          <div className="px-5 py-16 text-center text-near-black/40">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={contacts.length > 0 && contacts.every((c) => selected.has(c.id))}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-near-black/30 accent-dark-green"
                    />
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`cursor-pointer select-none px-5 py-3 font-semibold transition-colors hover:text-near-black ${col.className || ""}`}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label} <span className="text-[10px]">{sortIcon(col.key)}</span>
                    </th>
                  ))}
                  <th className="w-10 px-5 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    isExpanded={expandedId === contact.id}
                    detail={expandedId === contact.id ? detail : null}
                    detailLoading={expandedId === contact.id && detailLoading}
                    isEditing={editingId === contact.id}
                    editFields={editFields}
                    saving={saving}
                    isSelected={selected.has(contact.id)}
                    onToggleSelect={() => toggleSelect(contact.id)}
                    onToggle={() => toggleExpand(contact.id)}
                    onStartEdit={() => startEdit(contact)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={saveEdit}
                    onEditChange={(field, value) =>
                      setEditFields((prev) => ({ ...prev, [field]: value }))
                    }
                    onDelete={() => handleSingleDelete(contact.id)}
                  />
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-near-black/40">
                      {search || sourceFilter ? "No contacts match your search" : "No contacts yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-near-black/5 px-5 py-3">
            <span className="text-xs text-near-black/40">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <button onClick={() => setPage(page - 1)} className="rounded border border-near-black/20 px-3 py-1.5 text-xs font-semibold text-near-black/60 hover:bg-near-black/5">
                  Previous
                </button>
              )}
              {page < totalPages && (
                <button onClick={() => setPage(page + 1)} className="rounded border border-near-black/20 px-3 py-1.5 text-xs font-semibold text-near-black/60 hover:bg-near-black/5">
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Individual Contact Row + Expandable Detail ─── */

function ContactRow({
  contact,
  isExpanded,
  detail,
  detailLoading,
  isEditing,
  editFields,
  saving,
  isSelected,
  onToggleSelect,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditChange,
  onDelete,
}: {
  contact: Contact;
  isExpanded: boolean;
  detail: ContactDetail | null;
  detailLoading: boolean;
  isEditing: boolean;
  editFields: Partial<Contact>;
  saving: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditChange: (field: string, value: string | string[]) => void;
  onDelete: () => void;
}) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-near-black/5 transition-colors last:border-0 hover:bg-cream/50 ${isExpanded ? "bg-cream/30" : ""} ${isSelected ? "bg-dark-green/5" : ""}`}
        onClick={onToggle}
      >
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-3.5 w-3.5 rounded border-near-black/30 accent-dark-green"
          />
        </td>
        <td className="px-5 py-3 font-medium text-near-black">{name}</td>
        <td className="px-5 py-3 text-near-black/60">{contact.email || "—"}</td>
        <td className="px-5 py-3 text-near-black/60">{[contact.city, contact.state].filter(Boolean).join(", ") || "—"}</td>
        <td className="px-5 py-3">
          {contact.source && (
            <span className="rounded bg-dark-green/10 px-2 py-0.5 text-xs font-medium text-dark-green">
              {contact.source}
            </span>
          )}
        </td>
        <td className="px-5 py-3 text-near-black/60">{contact.experience_level || "—"}</td>
        <td className="px-5 py-3 text-near-black/40">{new Date(contact.created_at).toLocaleDateString()}</td>
        <td className="px-5 py-3 text-center text-near-black/30">
          {isExpanded ? "▲" : "▼"}
        </td>
      </tr>

      {/* Expanded Detail */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="border-b border-near-black/10 bg-cream/20 px-5 py-5">
            {detailLoading ? (
              <p className="py-4 text-center text-near-black/40">Loading details...</p>
            ) : detail ? (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Profile Card */}
                <div className="rounded border border-near-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                      Profile
                    </h3>
                    {!isEditing ? (
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                          className="text-xs font-semibold text-dark-green hover:text-dark-green/70"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(); }}
                          className="text-xs font-semibold text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}
                          disabled={saving}
                          className="text-xs font-semibold text-dark-green hover:text-dark-green/70 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                          className="text-xs font-semibold text-near-black/40 hover:text-near-black"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      {[
                        { key: "first_name", label: "First Name" },
                        { key: "last_name", label: "Last Name" },
                        { key: "phone", label: "Phone" },
                        { key: "city", label: "City" },
                        { key: "state", label: "State" },
                        { key: "tshirt_size", label: "T-Shirt Size" },
                        { key: "experience_level", label: "Experience" },
                        { key: "gear_status", label: "Gear Status" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">
                            {f.label}
                          </label>
                          <input
                            type="text"
                            value={(editFields as Record<string, string>)[f.key] || ""}
                            onChange={(e) => onEditChange(f.key, e.target.value)}
                            className="mt-0.5 w-full rounded border border-near-black/15 px-2.5 py-1.5 text-xs text-near-black focus:border-dark-green focus:outline-none"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">
                          Notes
                        </label>
                        <textarea
                          value={(editFields.notes as string) || ""}
                          onChange={(e) => onEditChange("notes", e.target.value)}
                          rows={3}
                          className="mt-0.5 w-full rounded border border-near-black/15 px-2.5 py-1.5 text-xs text-near-black focus:border-dark-green focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <dl className="space-y-2 text-xs">
                      {[
                        ["Email", detail.email],
                        ["Phone", detail.phone],
                        ["Location", [detail.city, detail.state].filter(Boolean).join(", ")],
                        ["T-Shirt", detail.tshirt_size],
                        ["Experience", detail.experience_level],
                        ["Gear", detail.gear_status],
                        ["Source", detail.source],
                        ["Since", new Date(detail.created_at).toLocaleDateString()],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between">
                          <dt className="font-semibold text-near-black/40">{label}</dt>
                          <dd className="text-right text-near-black">{(val as string) || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* Interests */}
                  {!isEditing && detail.interests && detail.interests.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">Interests</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {detail.interests.map((i) => (
                          <span key={i} className="rounded bg-dark-green/10 px-1.5 py-0.5 text-[10px] font-medium text-dark-green">{i}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {!isEditing && detail.tags && detail.tags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">Tags</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {detail.tags.map((t) => (
                          <span key={t} className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-gold">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {!isEditing && detail.notes && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">Notes</p>
                      <p className="mt-0.5 text-xs text-near-black/60">{detail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Activity */}
                <div className="space-y-4 lg:col-span-2">
                  {/* Mentee Apps */}
                  {detail.mentee_applications.length > 0 && (
                    <div className="rounded border border-near-black/10 bg-white p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                        Mentee Applications ({detail.mentee_applications.length})
                      </h3>
                      {detail.mentee_applications.map((app) => (
                        <div key={app.id} className="mb-2 last:mb-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-near-black/50">
                              {new Date(app.created_at).toLocaleDateString()}
                            </span>
                            <span className="rounded bg-dark-green/10 px-1.5 py-0.5 text-[10px] font-medium text-dark-green">
                              {app.experience_level}
                            </span>
                          </div>
                          {app.outdoor_interests?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {app.outdoor_interests.map((i) => (
                                <span key={i} className="text-[10px] text-near-black/40">{i}</span>
                              ))}
                            </div>
                          )}
                          {app.about_yourself && (
                            <p className="mt-1 text-xs text-near-black/50">{app.about_yourself}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mentor Apps */}
                  {detail.mentor_applications.length > 0 && (
                    <div className="rounded border border-near-black/10 bg-white p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                        Mentor Applications ({detail.mentor_applications.length})
                      </h3>
                      {detail.mentor_applications.map((app) => (
                        <div key={app.id} className="mb-2 last:mb-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-near-black/50">
                              {new Date(app.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-near-black/40">{app.years_experience} experience</span>
                          </div>
                          {app.why_mentor && (
                            <p className="mt-1 text-xs text-near-black/50">{app.why_mentor}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Registrations */}
                  {detail.registrations.length > 0 && (
                    <div className="rounded border border-near-black/10 bg-white p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                        Event History ({detail.registrations.length})
                      </h3>
                      {detail.registrations.map((reg) => (
                        <div key={reg.id} className="mb-2 flex items-center justify-between last:mb-0">
                          <div>
                            <p className="text-xs font-medium text-near-black">
                              {reg.events?.title || "Unknown Event"}
                            </p>
                            <p className="text-[10px] text-near-black/40">
                              {reg.role} · {new Date(reg.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              reg.status === "registered" || reg.status === "attended"
                                ? "bg-dark-green/10 text-dark-green"
                                : reg.status === "approved"
                                  ? "bg-gold/15 text-gold"
                                  : reg.status === "denied"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-near-black/5 text-near-black/50"
                            }`}
                          >
                            {reg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sponsorships */}
                  {detail.sponsorship_inquiries.length > 0 && (
                    <div className="rounded border border-near-black/10 bg-white p-4">
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                        Sponsorship Inquiries ({detail.sponsorship_inquiries.length})
                      </h3>
                      {detail.sponsorship_inquiries.map((sp) => (
                        <div key={sp.id} className="mb-2 last:mb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-near-black">{sp.company_name}</span>
                            <span className="text-[10px] text-near-black/40">{sp.budget_range}</span>
                          </div>
                          {sp.about_company && (
                            <p className="mt-1 text-xs text-near-black/50">{sp.about_company}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!detail.mentee_applications.length &&
                    !detail.mentor_applications.length &&
                    !detail.registrations.length &&
                    !detail.sponsorship_inquiries.length && (
                      <div className="rounded border border-near-black/10 bg-white px-4 py-8 text-center text-xs text-near-black/40">
                        No activity yet
                      </div>
                    )}
                </div>
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
