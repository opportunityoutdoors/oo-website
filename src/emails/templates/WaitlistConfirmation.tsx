import { Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import {
  Callout,
  CalloutLabel,
  CalloutLine,
  Greeting,
  P,
  Signoff,
} from "../components";
import { BrandButton } from "../components";
import { colors, fontFamily } from "../theme";

export interface WaitlistConfirmationProps {
  firstName?: string;
  eventTitle: string;
  meetingDate: string;
  meetLink?: string | null;
  meetingChangeUrl: string;
}

export function WaitlistConfirmation({
  firstName,
  eventTitle,
  meetingDate,
  meetLink,
  meetingChangeUrl,
}: WaitlistConfirmationProps) {
  return (
    <EmailLayout preview={`You're on the waitlist for ${eventTitle}`}>
      <Greeting name={firstName} />
      <P>
        Thanks for signing up for the <strong>{eventTitle}</strong> waitlist!
        We&apos;re glad you&apos;re interested.
      </P>
      <P>Here&apos;s what happens next:</P>

      <ol
        style={{
          color: colors.nearBlack,
          fontFamily,
          fontSize: "15px",
          lineHeight: "1.8",
          paddingLeft: "20px",
          margin: "0 0 16px",
        }}
      >
        <li>
          <strong>Attend your pre-camp virtual meeting</strong> (required)
        </li>
        <li>We review the waitlist and send invitations</li>
        <li>Complete your registration if invited</li>
      </ol>

      <Callout>
        <CalloutLabel>Your Meeting</CalloutLabel>
        <CalloutLine>{meetingDate}</CalloutLine>
      </Callout>

      {meetLink ? <BrandButton href={meetLink}>Join Meeting</BrandButton> : null}

      <Text
        style={{
          color: colors.muted,
          fontFamily,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 16px",
        }}
      >
        <strong>Important:</strong> Attending a pre-camp meeting is required for
        all participants. This is where we cover safety protocols, camp
        logistics, what to expect, and answer your questions.
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontFamily,
          fontSize: "14px",
          lineHeight: "1.6",
          margin: "0 0 16px",
        }}
      >
        Need to switch to a different meeting date?{" "}
        <Link
          href={meetingChangeUrl}
          style={{ color: colors.darkGreen, fontWeight: 600 }}
        >
          Change your meeting
        </Link>
        .
      </Text>

      <Signoff />
    </EmailLayout>
  );
}
