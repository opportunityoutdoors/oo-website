import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAuthClient } from "@/lib/supabase/server-auth";
import { getCurrentMember } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: { template: "%s | OO Admin", default: "OO Admin" },
  robots: "noindex, nofollow",
};

type NavUser = { email: string | null; role: "admin" | "editor" };

function AdminNav({ user }: { user: NavUser }) {
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/contacts", label: "Contacts" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/studio", label: "Content Studio" },
  ];
  if (user.role === "admin") {
    items.push({ href: "/admin/users", label: "Users" });
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-near-black/10 bg-near-black">
      <div className="border-b border-white/10 px-5 py-5">
        <a href="/" target="_blank" rel="noopener noreferrer" title="Open site in new tab">
          <Image
            src="/images/OO_Footer_white2.svg"
            alt="Opportunity Outdoors — Open site"
            width={180}
            height={40}
            className="h-auto w-full"
          />
        </a>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs text-white/40">{user.email}</p>
        <p className="text-[10px] uppercase tracking-[1.5px] text-white/30">{user.role}</p>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="mt-2 text-xs text-white/40 transition-colors hover:text-white"
          >
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}

function NoAccessScreen({ email }: { email: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-md rounded-lg border border-near-black/10 bg-white p-8 text-center">
        <h1 className="mb-2 font-heading text-2xl font-[900] uppercase tracking-tight text-near-black">
          No Access
        </h1>
        <p className="mb-6 text-sm text-near-black/60">
          {email ? <>The account <strong>{email}</strong> isn&rsquo;t a member of the admin dashboard.</> : "You are not a member of the admin dashboard."}
          {" "}Ask an admin to send you an invite.
        </p>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="rounded bg-dark-green px-4 py-2.5 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-out: render the child (login page) without the shell.
  if (!user) {
    return <div className="min-h-screen bg-cream">{children}</div>;
  }

  const member = await getCurrentMember();

  // Logged-in but not a member: block access.
  if (!member) {
    return <NoAccessScreen email={user.email ?? null} />;
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav user={{ email: member.email, role: member.role }} />
      <div className="ml-56 min-h-screen px-8 py-8">{children}</div>
    </div>
  );
}
