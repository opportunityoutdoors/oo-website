import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";
import { colors } from "../theme";

// The background check invite, from us.
//
// VolunteerBadge used to send this, from "Opportunity Outdoors via VolunteerBadge" under the
// subject "Volunteer Application", which mentees are not and which nobody recognised. Their
// wording cannot be changed, so we order the check link-only and send this instead. The form
// itself is still theirs, so the email says where the button goes.

export interface BackgroundCheckInviteProps {
  firstName?: string;
  eventTitle: string;
  checkUrl: string;
  /** "Thursday, November 5". When the link stops working. */
  linkExpires: string | null;
}

export function BackgroundCheckInvite({
  firstName,
  eventTitle,
  checkUrl,
  linkExpires,
}: BackgroundCheckInviteProps) {
  return (
    <EmailLayout preview={`One more step for ${eventTitle}: your background check`}>
      <Greeting name={firstName} />
      <P>
        Thanks for registering for <strong>{eventTitle}</strong>. One step is left: a background
        check. We run one on every adult who comes to camp, and the cost is already covered by
        what you paid.
      </P>
      <P>It takes about three minutes, and it must be done before camp.</P>

      <BrandButton href={checkUrl}>Start Your Background Check</BrandButton>

      <P style={{ fontSize: "14px", color: colors.muted }}>
        The button opens a secure form run by VolunteerBadge, our background check provider.
        Your details go to them, not to us: we only see whether the check is clear.
        {linkExpires ? ` This link works until ${linkExpires}.` : ""}
      </P>

      <P>
        Questions, or the link will not open? Reply to this email and we will help.
      </P>
      <Signoff />
    </EmailLayout>
  );
}
