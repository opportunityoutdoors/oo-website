// Maps the last-admin guard trigger (migration 015) to an HTTP-friendly shape.
// Supabase's admin API sometimes strips the SQLSTATE when bubbling PG errors through
// GoTrue, so we also match on message substring.
export function isLastAdminError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "P0001") return true;
  return !!e.message?.includes("last admin");
}
