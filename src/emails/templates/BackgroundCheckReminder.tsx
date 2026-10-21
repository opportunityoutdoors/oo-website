import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLine, Greeting, P, Signoff } from "../components";
import { colors } from "../theme";
import { INVITE_SEARCH_HELP } from "@/lib/background-check/invite-email";

// The day 3 and day 6 nudge to finish a background check.
//
// From us, not from VolunteerBadge, because their invite arrives from a name the registrant
// has never seen and with a subject about volunteering. The direct link comes first, so
// nobody has to search at all. The search help is the fallback for a missing link.

export interface BackgroundCheckReminderProps {
  firstName?: string;
  eventTitle: string;
  /** The VolunteerBadge link, still valid. Null sends them to search for the invite instead. */
  checkUrl: string | null;
  /** "Tuesday, October 28". When the link stops working. */
  linkExpires: string | null;
  /** The last reminder, inside the link's final 30 hours. */
  final: boolean;
}

export function BackgroundCheckReminder({
  firstName,
  eventTitle,
  checkUrl,
  linkExpires,
  final,
}: BackgroundCheckReminderProps) {
  return (
    <EmailLayout
      preview={
        final
          ? "Your background check link is about to expire"
          : `Finish your background check for ${eventTitle}`
      }
    >
      <Greeting name={firstName} />
      <P>
        {final ? (
          <>
            Your background check for <strong>{eventTitle}</strong> is not finished yet, and
            your link stops working {linkExpires ? `on ${linkExpires}` : "within a day"}.
          </>
        ) : (
          <>
            Your background check for <strong>{eventTitle}</strong> is not finished yet. It
            takes about three minutes, and it must be done before camp.
          </>
        )}
      </P>

      {checkUrl ? (
        <>
          <BrandButton href={checkUrl}>Finish Your Background Check</BrandButton>
          {linkExpires ? (
            <P style={{ fontSize: "14px", color: colors.muted }}>
              This link works until {linkExpires}.
            </P>
          ) : null}
        </>
      ) : null}

      <Callout>
        <CalloutLine>
          <strong>Looking for the original email?</strong>
        </CalloutLine>
        <CalloutLine>{INVITE_SEARCH_HELP}</CalloutLine>
      </Callout>

      <P>
        Your spot is held, and the cost is already covered by what you paid. If the link does
        not work, reply to this email and we will send a new one.
      </P>
      <Signoff />
    </EmailLayout>
  );
}
