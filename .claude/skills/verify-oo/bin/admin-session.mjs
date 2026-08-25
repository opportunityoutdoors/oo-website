#!/usr/bin/env node
/**
 * Mint a real admin session for the browser, without anyone typing a password.
 *
 * Service role mints a magic link, then exchanges its hashed token for a session at
 * /auth/v1/verify. The result is the same session the login form produces, encoded the
 * way @supabase/ssr stores it, so the middleware and every server component accept it.
 *
 * usage: node .claude/skills/verify-oo/bin/admin-session.mjs [email] [--js]
 *   default email: john.trice@opportunityoutdoors.org
 *   --js: print a one-line document.cookie snippet to paste into javascript_tool
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const email = process.argv.find((a) => a.includes("@")) || "john.trice@opportunityoutdoors.org";
const asJs = process.argv.includes("--js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) {
  console.error("Missing Supabase vars in .env.local");
  process.exit(1);
}
const ref = url.replace(/^https:\/\//, "").split(".")[0];

const admin = createClient(url, service, { auth: { persistSession: false } });
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(`generateLink failed for ${email}: ${error.message}`);
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/verify`, {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", token_hash: data.properties.hashed_token }),
});
const session = await res.json();
if (!res.ok || !session.access_token) {
  console.error(`verify failed (${res.status}): ${JSON.stringify(session)}`);
  process.exit(1);
}

// @supabase/ssr stores the session JSON base64url-encoded behind a "base64-" prefix, split
// into .0/.1/… chunks of at most 3180 characters. base64url is URI-safe, so the chunk
// boundary is a plain slice.
// The user object is trimmed to what the storage layer needs. Every server read calls
// getUser(), which revalidates the JWT against the auth server and returns the full user,
// so nothing downstream depends on the copy in the cookie. Trimming keeps the snippet
// paste-sized rather than 3KB of identity records.
const stored = {
  access_token: session.access_token,
  token_type: session.token_type,
  expires_in: session.expires_in,
  expires_at: session.expires_at,
  refresh_token: session.refresh_token,
  user: {
    id: session.user.id,
    aud: session.user.aud,
    role: session.user.role,
    email: session.user.email,
    app_metadata: session.user.app_metadata,
    user_metadata: session.user.user_metadata,
  },
};

const b64url = Buffer.from(JSON.stringify(stored), "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");
const encoded = "base64-" + b64url;
const key = `sb-${ref}-auth-token`;

const cookies = [];
if (encoded.length <= 3180) {
  cookies.push({ name: key, value: encoded });
} else {
  for (let i = 0, n = 0; i < encoded.length; i += 3180, n += 1) {
    cookies.push({ name: `${key}.${n}`, value: encoded.slice(i, i + 3180) });
  }
}

if (asJs) {
  const sets = cookies
    .map((c) => `document.cookie='${c.name}=${c.value};path=/;max-age=3600;SameSite=Lax'`)
    .join(";");
  console.log(`${sets};'signed in as ${session.user.email}'`);
} else {
  console.log(JSON.stringify({ user: session.user.email, expires_at: session.expires_at, cookies }, null, 2));
}
