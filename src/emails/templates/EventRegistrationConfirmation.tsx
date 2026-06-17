import * as React from "react";
import { EmailLayout } from "../Layout";
import {
  BrandButton,
  Callout,
  CalloutLine,
  Greeting,
  P,
  Signoff,
} from "../components";

export interface EventRegistrationConfirmationProps {
  firstName?: string;
  eventTitle: string;
  /** Pre-formatted, e.g. "Saturday, August 15, 2026". */
  eventDate?: string | null;
  location?: string | null;
  cost?: string | null;
  eventUrl: string;
}

export function EventRegistrationConfirmation({
  firstName,
  eventTitle,
  eventDate,
  location,
  cost,
  eventUrl,
}: EventRegistrationConfirmationProps) {
  return (
    <EmailLayout preview={`You're registered for ${eventTitle}`}>
      <Greeting name={firstName} />
      <P>
        You&apos;re registered for <strong>{eventTitle}</strong>. We&apos;re glad
        you&apos;re joining us.
      </P>

      {eventDate || location || cost ? (
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
          {cost ? (
            <CalloutLine>
              <strong>Cost:</strong> {cost}
            </CalloutLine>
          ) : null}
        </Callout>
      ) : null}

      <P>
        We&apos;ll send any final details before the event. If anything comes up,
        just reply to this email and we&apos;ll help you out.
      </P>

      <BrandButton href={eventUrl}>View Event Details</BrandButton>

      <Signoff />
    </EmailLayout>
  );
}
