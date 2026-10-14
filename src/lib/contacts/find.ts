import type { SupabaseClient } from "@supabase/supabase-js";

/** Escapes the LIKE wildcards, so `a_b@x.com` matches only itself. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * The contact holding this email, ignoring letter case, or null.
 *
 * The oldest row wins. Before 2026-10-14 the lookup was exact, so some people have two rows
 * that differ only by case; the older one is the one with their history on it. `.single()`
 * is avoided on purpose: it errors when two rows match, and the caller then created a third.
 */
export async function findContactByEmail(
  supabase: SupabaseClient,
  email: string,
  columns = "id"
): Promise<({ id: string; date_of_birth?: string | null } & Record<string, unknown>) | null> {
  const clean = email.trim();
  if (!clean) return null;
  const { data } = await supabase
    .from("contacts")
    .select(columns)
    .ilike("email", escapeLike(clean))
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0] as unknown as { id: string; date_of_birth?: string | null }) ?? null;
}
