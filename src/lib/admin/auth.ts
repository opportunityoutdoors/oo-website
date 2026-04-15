import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server-auth";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminRole = "admin" | "editor";

export type AdminMember = {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
};

export async function getCurrentMember(): Promise<AdminMember | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const svc = createServiceClient();
  const { data } = await svc
    .from("admin_users")
    .select("id, user_id, email, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as AdminMember | null) ?? null;
}

export async function requireMember(): Promise<AdminMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/admin/login?error=no_access");
  return member;
}

export async function requireAdmin(): Promise<AdminMember> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/admin?error=admin_only");
  return member;
}

export async function apiRequireMember() {
  const member = await getCurrentMember();
  if (!member) {
    return { member: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { member, error: null } as const;
}

export async function apiRequireAdmin() {
  const { member, error } = await apiRequireMember();
  if (error) return { member: null, error } as const;
  if (member.role !== "admin") {
    return {
      member: null,
      error: NextResponse.json({ error: "Admins only" }, { status: 403 }),
    } as const;
  }
  return { member, error: null } as const;
}
