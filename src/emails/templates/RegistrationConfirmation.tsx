import * as React from "react";
import { EmailLayout } from "../Layout";
import { Callout, CalloutLine, Greeting, P } from "../components";

export interface RegistrationConfirmationProps {
  firstName?: string;
  eventTitle: string;
  hasMinor?: boolean;
  isMentor?: boolean;
  eventDate?: string | null;
  location?: string | null;
}

export function RegistrationConfirmation({
  firstName,
  eventTitle,
  hasMinor,
  isMentor,
  eventDate,
  location,
}: RegistrationConfirmationProps) {
  return (
    <EmailLayout preview={`Your ${eventTitle} registration is confirmed`}>
      <Greeting name={firstName} />
      <P>
        Your registration for <strong>{eventTitle}</strong> is confirmed
        {hasMinor ? " for you and your minor" : ""}! We&apos;re looking forward to
        having you{isMentor ? " as a mentor" : ""}.
      </P>

      {eventDate || location ? (
        <Callout>
          {eventDate ? (
            <CalloutLine>
              <strong>When:</strong> {eventDate}
            </CalloutLine>
          ) : null}
          {location ? (
            <CalloutLine>
              <strong>Where:</strong> {location}
            </CalloutLine>
          ) : null}
        </Callout>
      ) : null}

      <P>A copy of your signed waiver is attached to this email for your records.</P>
      <P>
        We&apos;ll send you a welcome packet closer to the event with your
        mentor/mentee assignment, camp schedule, gear list, and everything else
        you need.
      </P>
      <P>See you in the field!</P>
      <P>— The Opportunity Outdoors Team</P>
    </EmailLayout>
  );
}
