import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";

export interface ConfirmEmailProps {
  firstName?: string;
  eventTitle: string;
  confirmUrl: string;
}

/** Sent to people already on a waitlist when email confirmation was introduced. */
export function ConfirmEmail({ firstName, eventTitle, confirmUrl }: ConfirmEmailProps) {
  return (
    <EmailLayout preview={`Confirm your email for ${eventTitle}`}>
      <Greeting name={firstName} />
      <P>
        You&apos;re on the <strong>{eventTitle}</strong> waitlist. Before we can invite you
        to register, we need to know this email reaches you.
      </P>
      <P>
        Your camp invitation, waiver, and welcome packet all come here. One click is all it
        takes.
      </P>
      <BrandButton href={confirmUrl}>Confirm My Email</BrandButton>
      <P>If you did not sign up for this camp, you can ignore this email.</P>
      <Signoff />
    </EmailLayout>
  );
}
