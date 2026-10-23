import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLine, Greeting, P, Signoff } from "../components";
import { colors } from "../theme";

export interface RegistrationConfirmationProps {
  firstName?: string;
  eventTitle: string;
  hasMinor?: boolean;
  isMentor?: boolean;
  eventDate?: string | null;
  location?: string | null;
  /** Their background check link, when one has been ordered. Shown as this email's button. */
  checkUrl?: string | null;
  /** "Thursday, November 5". When the check link stops working. */
  checkLinkExpires?: string | null;
  /** A check is owed but not ordered yet (the order failed): say a link is on its way. */
  needsBackgroundCheck?: boolean;
}

export function RegistrationConfirmation({
  firstName,
  eventTitle,
  hasMinor,
  isMentor,
  eventDate,
  location,
  checkUrl,
  checkLinkExpires,
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

      {checkUrl ? (
        <>
          <P>
            <strong>One step left: your background check.</strong> We run one on every adult
            who comes to camp, and the cost is covered by what you paid. It takes about three
            minutes, and it must be done before camp.
          </P>
          <BrandButton href={checkUrl}>Start Your Background Check</BrandButton>
          <P style={{ fontSize: "14px", color: colors.muted }}>
            The button opens a secure form run by VolunteerBadge, our background check provider.
            Your details go to them, not to us: we only see whether the check is clear.
            {checkLinkExpires ? ` This link works until ${checkLinkExpires}.` : ""}
          </P>
        </>
      ) : needsBackgroundCheck ? (
        <Callout>
          <CalloutLine>
            <strong>Your background check link is on its way.</strong> We will email it to you
            shortly. It takes about three minutes, and it must be done before camp.
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
