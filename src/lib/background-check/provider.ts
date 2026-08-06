// Vendor-neutral background check interface.
//
// The provider is the most replaceable part of this feature: VolunteerBadge is new, priced
// far below the market, and may not last. Everything above this file talks in these types,
// so swapping vendors means writing one new implementation rather than touching the
// registration flow, the fee logic, or the admin.
//
// Notably absent: anything to do with SSNs, report contents, or offense detail. This app
// invites people and receives a verdict. The provider collects and holds the sensitive
// material, which is what keeps it off this infrastructure entirely.

import type { BackgroundCheckStatus } from "./eligibility";

export type InviteInput = {
  /** Our contact id. Stored on our side; not all providers accept a custom reference. */
  contactId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type InviteResult = {
  /** Provider's identifier. Stored on the contact and used to match their webhooks back. */
  providerCheckId: string;
  /** Where the applicant completes disclosure, authorization and identity, if given. */
  applicantUrl: string | null;
};

export type CheckState = {
  status: BackgroundCheckStatus;
  completedAt: Date | null;
  /** Provider's own status string, kept verbatim for the admin and for debugging. */
  raw: string;
};

export type ProviderBalance = {
  /** Prepaid checks remaining. Zero means invites will fail. */
  credits: number;
  /** Account name as the provider knows it. Read back to confirm the right account. */
  organization: string;
};

export interface BackgroundCheckProvider {
  readonly name: string;

  /** Invite someone to complete a check on the provider's hosted pages. */
  invite(input: InviteInput): Promise<InviteResult>;

  /** Current state of a previously created check. */
  getStatus(providerCheckId: string): Promise<CheckState>;

  /**
   * Account name and remaining credits.
   *
   * Exists to satisfy the standing rule that anything touching an account is verified to be
   * pointed at THIS project before use. Succeeding against the wrong organisation is the
   * failure mode, and an API key that authenticates proves nothing about whose account it
   * opened.
   */
  getBalance(): Promise<ProviderBalance>;
}

/** Raised for any provider-side failure. Carries enough to debug without leaking the key. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
