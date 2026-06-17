import { Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import {
  BrandButton,
  Callout,
  CalloutLabel,
  CalloutLine,
  Greeting,
  P,
  Signoff,
} from "../components";
import { colors } from "../theme";

export interface WaitlistReminderProps {
  firstName?: string;
  eventTitle: string;
  meetingDate: string;
  meetLink?: string | null;
  changeUrl?: string | null;
}

export function WaitlistReminder({
  firstName,
  eventTitle,
  meetingDate,
  meetLink,
  changeUrl,
}: WaitlistReminderProps) {
  return (
    <EmailLayout preview={`Your ${eventTitle} meeting is coming up`}>
      <Greeting name={firstName} />
      <P>
        Just a quick reminder that your pre-camp meeting for{" "}
        <strong>{eventTitle}</strong> is coming up. Attending a meeting is
        required for all camp participants.
      </P>

      <Callout>
        <CalloutLabel>Your Meeting</CalloutLabel>
        <CalloutLine>{meetingDate}</CalloutLine>
      </Callout>

      {meetLink ? <BrandButton href={meetLink}>Join Meeting</BrandButton> : null}

      <P>
        During the meeting, we&apos;ll cover safety protocols, camp logistics,
        what to expect, and answer any questions you have. It&apos;s an important
        step before camp, so please make sure to attend.
      </P>

      {changeUrl ? (
        <P style={{ fontSize: "14px", color: colors.muted }}>
          Can&apos;t make this date?{" "}
          <Link href={changeUrl} style={{ color: colors.darkGreen, fontWeight: 600 }}>
            Switch to a different meeting
          </Link>
          .
        </P>
      ) : null}

      <Signoff />
    </EmailLayout>
  );
}
