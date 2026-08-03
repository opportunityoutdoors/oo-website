// Shared design tokens for all transactional + marketing emails.
// Mirrors the site brand tokens in src/app/globals.css so emails match the site.
// Kept as plain JS objects (not Tailwind) because email clients require inline styles.

export const colors = {
  darkGreen: "#2D5016",
  gold: "#C4941A",
  cream: "#f0ebe2",
  warmGray: "#e8e3db",
  nearBlack: "#1a1a1a",
  white: "#ffffff",
  muted: "#666666",
  border: "#ddd6ca",
} as const;

export const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Resolved at render time so links/images are absolute (required in email).
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
}

// Optional hosted PNG logo. SVG (what the site ships) doesn't render in most
// email clients, so the header falls back to a styled wordmark when unset.
export function emailLogoUrl(): string | null {
  return process.env.EMAIL_LOGO_URL || null;
}

// CAN-SPAM requires a valid physical postal address in marketing email. This default is
// the real registered address, so the footer is compliant with no env config. Override
// with EMAIL_MAILING_ADDRESS if the address ever changes (for example, moving to a
// USPS-registered PO box) without needing a code change.
export function mailingAddress(): string {
  return (
    process.env.EMAIL_MAILING_ADDRESS ||
    "Opportunity Outdoors · 4701 Bentcreek Drive · Fuquay-Varina, NC 27526"
  );
}

export const contactEmail = "info@opportunityoutdoors.org";

// Federal EIN, shown on donation receipts. Donors need it to substantiate a deduction and
// most will look for it on the acknowledgment.
//
// Env-backed with no default on purpose: a wrong EIN on a tax receipt is worse than a
// missing one, so this stays blank until the real number is set rather than shipping a
// plausible-looking placeholder. The receipt renders without the line when unset.
export function orgEin(): string | null {
  return process.env.ORG_EIN || null;
}
