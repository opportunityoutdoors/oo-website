import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";
import { colors } from "../theme";

export interface ApprovalProps {
  firstName?: string;
  eventTitle: string;
  cost?: string | null;
  /** Mentors never pay the registration fee (lib/stripe/camp-fees.ts), so they are not quoted it. */
  isMentor?: boolean;
  registerUrl: string;
}

export function Approval({ firstName, eventTitle, cost, isMentor, registerUrl }: ApprovalProps) {
  return (
    <EmailLayout preview={`You're in! Complete your ${eventTitle} registration`}>
      <Greeting name={firstName} />
      <P>
        Great news! You&apos;re officially invited to <strong>{eventTitle}</strong>.
        We&apos;re excited to have you join us.
      </P>
      <P>
        To lock in your spot, you need to complete your registration. This
        includes signing the waiver
        {!isMentor && cost ? ` and paying the registration fee (${cost})` : ""}.
        {isMentor ? " Mentors pay no registration fee." : ""}
      </P>

      <BrandButton href={registerUrl}>Complete Registration</BrandButton>

      <P style={{ fontSize: "14px", color: colors.muted }}>
        This link is unique to you. Please don&apos;t share it with anyone else.
      </P>

      <P>See you in the field!</P>
      <Signoff />
    </EmailLayout>
  );
}
