import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";
import { colors } from "../theme";

// The 7 day and 2 day reminder to someone approved for a camp who has not registered
// (lib/registration-reminder.ts). Same link as their invite, so it opens their own form.

export interface RegistrationReminderProps {
  firstName?: string;
  eventTitle: string;
  /** "Friday, November 6". The last day to register. */
  closes: string;
  cost?: string | null;
  /** Mentors never pay the registration fee, so they are not quoted it. */
  isMentor?: boolean;
  registerUrl: string;
  /** The page where they tell us they cannot come (app/events/[slug]/cant-make-it). */
  cantMakeItUrl: string;
  /** The 2 day reminder. */
  final: boolean;
}

export function RegistrationReminder({
  firstName,
  eventTitle,
  closes,
  cost,
  isMentor,
  registerUrl,
  cantMakeItUrl,
  final,
}: RegistrationReminderProps) {
  return (
    <EmailLayout
      preview={
        final
          ? `Registration for ${eventTitle} closes ${closes}`
          : `Finish your ${eventTitle} registration by ${closes}`
      }
    >
      <Greeting name={firstName} />
      <P>
        {final ? "Last reminder: you" : "You"}&apos;re invited to <strong>{eventTitle}</strong>, but
        your registration isn&apos;t finished yet. Registration closes{" "}
        <strong>{closes}</strong>.
      </P>
      <P>
        To lock in your spot, sign the waiver
        {!isMentor && cost ? ` and pay the registration fee (${cost})` : ""}.
        {isMentor ? " Mentors pay no registration fee." : ""}
      </P>

      <BrandButton href={registerUrl}>Complete Registration</BrandButton>

      <P style={{ fontSize: "14px", color: colors.muted }}>
        This link is unique to you. Please don&apos;t share it with anyone else.
      </P>

      <P>
        Can&apos;t make it this time? Let us know, so we can offer your spot to someone else.
      </P>

      <BrandButton href={cantMakeItUrl} variant="outline">
        I Can&apos;t Make It
      </BrandButton>
      <Signoff />
    </EmailLayout>
  );
}
