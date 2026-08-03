import Stripe from "stripe";

// Server-side Stripe client. Never import this into a client component: STRIPE_SECRET_KEY
// grants full account access and must not reach the browser.
//
// Constructed per call rather than at module scope. Module-scope construction would throw
// at import time on any deploy where the key is unset, taking down every route that
// transitively imports it, including ones with nothing to do with payments. This mirrors
// how the codebase already builds the Supabase and Resend clients.

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  // Reuse across invocations within a warm function instance. The SDK holds a connection
  // pool, and rebuilding it per request costs a TLS handshake on every donation.
  if (cached) return cached;

  cached = new Stripe(key, {
    // Must match the version this SDK's types were generated against, which is what the
    // SDK sends anyway when the option is omitted. Stated explicitly so that bumping the
    // stripe package is a visible two-line change rather than a silent shift in the
    // request version.
    //
    // Worth knowing: this governs API calls we make, NOT webhook payloads. Stripe renders
    // webhook events using the version set on the endpoint (or the account default), so
    // upgrading here does not by itself change what the webhook handler receives.
    apiVersion: "2026-07-29.dahlia",
    appInfo: {
      name: "Opportunity Outdoors",
      url: "https://opportunityoutdoors.org",
    },
  });

  return cached;
}

/** True when the configured key is a test-mode key. Used to badge non-live checkouts. */
export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return key.startsWith("sk_test_") || key.startsWith("rk_test_");
}
