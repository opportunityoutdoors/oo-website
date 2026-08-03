import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";

export interface SurveyInviteProps {
  firstName?: string;
  eventTitle: string;
  surveyUrl: string;
  /** Set when a guardian is answering on behalf of a minor participant. */
  participantName?: string | null;
  /** Second-chance send. Same link, softer ask. */
  isReminder?: boolean;
}

/**
 * Post-event survey invitation, and its one reminder.
 *
 * Transactional variant: this is tied to a specific registration for an event the person
 * actually attended, not a broadcast, so it carries no unsubscribe footer. The link is
 * token-gated and stops working once the survey is submitted.
 */
export function SurveyInvite({
  firstName,
  eventTitle,
  surveyUrl,
  participantName,
  isReminder,
}: SurveyInviteProps) {
  const onBehalf = Boolean(participantName);

  return (
    <EmailLayout
      preview={
        isReminder
          ? `Two minutes on ${eventTitle}?`
          : `How was ${eventTitle}?`
      }
    >
      <Greeting name={firstName} />

      {isReminder ? (
        <>
          <P>
            We asked a few days ago and know it is easy to miss, so here is one
            more nudge. It takes about two minutes.
          </P>
          <P>
            {onBehalf
              ? `Telling us how ${participantName} found ${eventTitle} helps us build the next one better.`
              : `Telling us how ${eventTitle} went helps us build the next one better.`}
          </P>
        </>
      ) : (
        <>
          <P>
            {onBehalf
              ? `Thanks for bringing ${participantName} out to ${eventTitle}. We would love to hear how it went for them.`
              : `Thanks for coming out to ${eventTitle}. We would love to hear how it went.`}
          </P>
          <P>
            It is the same few questions you answered when you registered, which
            is the point: comparing the two is how we tell whether what we are
            doing is actually working. It takes about two minutes.
          </P>
        </>
      )}

      <BrandButton href={surveyUrl}>
        {isReminder ? "Finish the Survey" : "Answer a Few Questions"}
      </BrandButton>

      <Signoff />
    </EmailLayout>
  );
}
