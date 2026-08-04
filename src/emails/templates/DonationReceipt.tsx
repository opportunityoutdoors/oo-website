import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { Callout, CalloutLabel, CalloutLine, Greeting, P, Signoff } from "../components";
import { colors, fontFamily, mailingAddress, orgEin, siteUrl } from "../theme";

export interface DonationReceiptProps {
  firstName?: string;
  /** Formatted for display, for example "$100" or "$102.86". */
  amount: string;
  /** Long form, for example "August 3, 2026". */
  date: string;
  /** Monthly sustaining gift rather than a one-time donation. */
  recurring?: boolean;
  /** Set when the donor chose to absorb processing fees, for example "$2.86". */
  feeCovered?: string | null;
  /** Stripe payment intent, printed as the receipt number for reconciliation. */
  receiptNumber?: string | null;
}

/**
 * Tax-deductible donation acknowledgment.
 *
 * This is a compliance document as much as a thank-you. IRS Publication 1771 requires a
 * contemporaneous written acknowledgment for any single gift of $250 or more, and it must
 * state the amount and whether the donor received anything in return. We send it for every
 * gift regardless of size, because sorting donors by threshold is more work than sending
 * one good email, and the small-gift donor deserves the same record.
 *
 * The "no goods or services" sentence is the load-bearing part. Without it the donor
 * technically cannot substantiate the deduction, no matter how warm the rest of the copy
 * is. Do not remove it, and do not soften it into something that reads better.
 *
 * If Opportunity Outdoors ever gives donors something of value in return (event tickets,
 * merchandise, a raffle entry), this template is no longer accurate: those are quid pro quo
 * contributions and the acknowledgment must instead state the fair market value received
 * and that only the excess is deductible.
 */
export function DonationReceipt({
  firstName,
  amount,
  date,
  recurring,
  feeCovered,
  receiptNumber,
}: DonationReceiptProps) {
  const ein = orgEin();

  return (
    <EmailLayout preview={`Your donation receipt: ${amount}`}>
      <Greeting name={firstName} />

      <P>
        Thank you. Your gift of <strong>{amount}</strong> helps put new hunters
        and anglers in the field and experienced mentors by their side.
      </P>

      {recurring && (
        <P>
          This is your monthly gift, and it will renew automatically on roughly
          this date each month. Steady support is what lets us plan a season
          ahead instead of a camp at a time. You can change the amount, update
          your card, or cancel any time at{" "}
          <Link href={`${siteUrl()}/donate/manage`} style={{ color: colors.darkGreen, fontWeight: 600 }}>
            {siteUrl().replace(/^https?:\/\//, "")}/donate/manage
          </Link>
          .
        </P>
      )}

      <Callout>
        <CalloutLabel>Donation Receipt</CalloutLabel>
        <CalloutLine>Amount: {amount}</CalloutLine>
        <CalloutLine>Date: {date}</CalloutLine>
        <CalloutLine>
          Type: {recurring ? "Recurring monthly gift" : "One-time gift"}
        </CalloutLine>
        {/* Stated explicitly because donors reasonably wonder whether the fee top-up is
            deductible. It is: the deduction is what the donor transferred to the charity,
            and the processing fee is a cost the charity absorbs from its own proceeds, not
            a reduction of the gift. Naming the total avoids anyone under-claiming. */}
        {feeCovered && (
          <CalloutLine>
            Includes {feeCovered} you added to cover processing fees, so the full
            gift reaches the programs. The entire {amount} is deductible.
          </CalloutLine>
        )}
        {receiptNumber && <CalloutLine>Receipt number: {receiptNumber}</CalloutLine>}
      </Callout>

      <Hr style={{ borderColor: colors.border, margin: "0 0 20px" }} />

      {/* Smaller and visually set apart: this block is the legal substantiation, and it
          should read as a record rather than as marketing copy. */}
      <Text
        style={{
          color: colors.muted,
          fontFamily,
          fontSize: "13px",
          lineHeight: "1.6",
          margin: "0 0 16px",
        }}
      >
        Opportunity Outdoors is a 501(c)(3) nonprofit organization
        {ein ? ` (EIN ${ein})` : ""}. Your contribution is tax-deductible to the
        extent allowed by law.{" "}
        <strong>
          No goods or services were provided in exchange for this contribution.
        </strong>{" "}
        Please retain this receipt for your tax records.
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontFamily,
          fontSize: "13px",
          lineHeight: "1.6",
          margin: "0 0 24px",
        }}
      >
        {mailingAddress()}
      </Text>

      <Signoff />
    </EmailLayout>
  );
}
