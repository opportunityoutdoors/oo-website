"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          OO Admin
        </h1>
        <p className="mb-8 text-center text-sm text-near-black/50">
          Board member access only
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
              placeholder="you@opportunityoutdoors.org"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-near-black/20 bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-dark-green px-4 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
