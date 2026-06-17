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

// CAN-SPAM requires a valid physical postal address in marketing email.
// Set EMAIL_MAILING_ADDRESS to a full street/PO-box address before sending campaigns.
export function mailingAddress(): string {
  return (
    process.env.EMAIL_MAILING_ADDRESS ||
    "Opportunity Outdoors · Fuquay-Varina, NC"
  );
}

export const contactEmail = "info@opportunityoutdoors.org";
