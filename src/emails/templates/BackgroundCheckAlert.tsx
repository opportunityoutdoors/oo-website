import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLabel, CalloutLine, P } from "../components";

export type AlertPerson = {
  name: string;
  email: string;
  event: string | null;
  detail: string;
};

export interface BackgroundCheckAlertProps {
  /** 'flagged' needs a decision. 'stalled' needs chasing. */
  kind: "flagged" | "stalled";
  people: AlertPerson[];
  adminUrl: string;
}

/**
 * Internal alert to staff. Not sent to participants.
 *
 * Exists because every part of this feature can fail correctly and silently. A check comes
 * back needing a decision and nothing happens until a human looks; an invite goes unopened
 * and someone who paid quietly cannot attend. Neither state announces itself, and the admin
 * screen only helps somebody who thinks to open it.
 *
 * Deliberately says what to DO, not just what happened. An alert that reports a status and
 * leaves the reader to work out the consequence gets archived.
 */
export function BackgroundCheckAlert({
  kind,
  people,
  adminUrl,
}: BackgroundCheckAlertProps) {
  const flagged = kind === "flagged";
  const count = people.length;

  return (
    <EmailLayout
      preview={
        flagged
          ? `${count} background check${count === 1 ? "" : "s"} need${count === 1 ? "s" : ""} a decision`
          : `${count} paid registrant${count === 1 ? "" : "s"} not screened yet`
      }
    >
      <P>
        {flagged ? (
          <>
            {count === 1 ? "A background check has" : `${count} background checks have`}{" "}
            come back with records found and confirmed. Nothing moves until
            someone reviews and decides.
          </>
        ) : (
          <>
            {count === 1
              ? "Someone has paid for a camp and has not finished their background check."
              : `${count} people have paid for a camp and have not finished their background checks.`}{" "}
            They cannot attend until it is done.
          </>
        )}
      </P>

      <Callout>
        {people.map((p) => (
          <React.Fragment key={p.email}>
            <CalloutLabel>
              {p.name}
              {p.event ? ` · ${p.event}` : ""}
            </CalloutLabel>
            <CalloutLine>{p.email}</CalloutLine>
            <CalloutLine>{p.detail}</CalloutLine>
          </React.Fragment>
        ))}
      </Callout>

      {flagged ? (
        <>
          <P>
            Open the CRA reviewer note in VolunteerBadge before deciding. A
            record is not automatically disqualifying: assess whether it is
            relevant to the role, and how long ago it was.
          </P>
          <P>
            If you decline someone, the adverse action sequence has to run from
            VolunteerBadge: pre-adverse notice, a five business day window for
            them to dispute, then the final notice. Declining is only recorded
            after that last step.
          </P>
        </>
      ) : (
        <P>
          The link was emailed to them when they paid, and it is also on their
          confirmation page. Invites expire after 14 days, so if one has lapsed
          it needs re-sending from the admin.
        </P>
      )}

      <BrandButton href={adminUrl}>Open the Admin</BrandButton>
    </EmailLayout>
  );
}
