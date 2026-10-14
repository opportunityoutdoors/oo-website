import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import DuplicateRow, { type DuplicatePair } from "./DuplicateRow";

export const metadata = { title: "Possible duplicates" };
export const dynamic = "force-dynamic";

// People who are probably in the system twice. Found by likely_duplicate_contacts() in
// migration 036: the same email in a different letter case, or the same name and phone.
// Nothing is merged without a person choosing which email to keep.
export default async function DuplicatesPage() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("likely_duplicate_contacts");
  const pairs = (data ?? []) as DuplicatePair[];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <Link href="/admin/contacts" className="text-xs text-near-black/50 hover:underline">
        Back to contacts
      </Link>
      <h1 className="text-2xl font-bold text-near-black">Possible duplicates</h1>
      <p className="text-sm text-near-black/60">
        Each row is two contacts that are probably one person. Keep the one whose email is
        current. Its registrations, applications, donations, and surveys stay, the other
        contact&apos;s move onto it, and the other contact is deleted.
      </p>
      {error && <p className="text-sm text-[#b00]">{error.message}</p>}
      {!error && pairs.length === 0 && (
        <p className="text-sm text-near-black/60">No likely duplicates.</p>
      )}
      <div className="space-y-2">
        {pairs.map((p) => (
          <DuplicateRow key={`${p.a_id}-${p.b_id}`} pair={p} />
        ))}
      </div>
    </div>
  );
}
