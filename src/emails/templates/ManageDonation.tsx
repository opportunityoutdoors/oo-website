import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, P, Signoff } from "../components";

export interface ManageDonationProps {
  /** Stripe billing portal URL. Single use and short-lived. */
  portalUrl: string;
}

/**
 * Sends a donor a link to Stripe's Customer Portal so they can manage their monthly gift
 * themselves: change the card, change the amount, see past receipts, or cancel.
 *
 * No greeting by name. This is sent in response to someone typing an email address into a
 * public form, and the endpoint deliberately cannot confirm whether that address belongs to
 * a donor. Personalising it would leak exactly what the endpoint refuses to disclose.
 */
export function ManageDonation({ portalUrl }: ManageDonationProps) {
  return (
    <EmailLayout preview="Manage your monthly donation">
      <P>Here is your link to manage your monthly donation.</P>
      <P>
        You can update your card, change the amount, download past receipts, or
        cancel. Cancelling takes effect immediately and there is no last step
        where we try to talk you out of it.
      </P>

      <BrandButton href={portalUrl}>Manage My Donation</BrandButton>

      <P style={{ fontSize: "14px", color: "#666666" }}>
        This link works once and expires shortly, so open it now rather than
        saving it. You can always request a new one from the donate page.
      </P>
      <P style={{ fontSize: "14px", color: "#666666" }}>
        If you did not request this, you can ignore it. Nothing has changed on
        your donation.
      </P>

      <Signoff />
    </EmailLayout>
  );
}
