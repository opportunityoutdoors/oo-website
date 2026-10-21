import * as React from "react";
import { EmailLayout } from "../Layout";
import { Callout, CalloutLine, Greeting, P, Signoff } from "../components";

export interface RegistrationConfirmationProps {
  firstName?: string;
  eventTitle: string;
  hasMinor?: boolean;
  isMentor?: boolean;
  eventDate?: string | null;
  location?: string | null;
  /**
   * They owe a background check. The invite comes from VolunteerBadge, not from us, so
   * without this line it reads as an email from a stranger and gets ignored.
   */
  needsBackgroundCheck?: boolean;
}

export function RegistrationConfirmation({
  firstName,
  eventTitle,
  hasMinor,
  isMentor,
  eventDate,
  location,
  needsBackgroundCheck,
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

      {needsBackgroundCheck ? (
        <Callout>
          <CalloutLine>
            <strong>Watch for a separate email about your background check.</strong>
          </CalloutLine>
          <CalloutLine>
            Once your payment goes through, VolunteerBadge, our background check provider,
            will email you a link. It takes about three minutes, and it must be done before
            camp. Check your spam folder if it has not arrived within the hour.
          </CalloutLine>
        </Callout>
      ) : null}

      <P>A copy of your signed waiver is attached to this email for your records.</P>
      <P>
        We&apos;ll send you a welcome packet closer to the event with your
        mentor/mentee assignment, camp schedule, gear list, and everything else
        you need.
      </P>
      <P>See you in the field!</P>
      <Signoff />
    </EmailLayout>
  );
}
