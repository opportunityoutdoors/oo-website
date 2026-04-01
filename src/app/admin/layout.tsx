import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: { template: "%s | OO Admin", default: "OO Admin" },
  robots: "noindex, nofollow",
};

async function AdminNav() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-near-black/10 bg-near-black">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin">
          <Image
            src="/images/OO_Footer_white2.svg"
            alt="Opportunity Outdoors"
            width={180}
            height={40}
            className="h-auto w-[160px]"
          />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {[
            { href: "/admin", label: "Dashboard", icon: "◉" },
            { href: "/admin/contacts", label: "Contacts", icon: "◎" },
            { href: "/admin/events", label: "Events", icon: "◈" },
            { href: "/admin/studio", label: "Content Studio", icon: "◆" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-xs text-white/40">{user.email}</p>
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav />
      <div className="ml-56 min-h-screen px-8 py-8">
        {children}
      </div>
    </div>
  );
}
