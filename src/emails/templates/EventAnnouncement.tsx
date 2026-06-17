import { Heading, Img, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLine, P } from "../components";
import { colors, fontFamily } from "../theme";

export interface EventAnnouncementProps {
  title: string;
  /** Pre-formatted, e.g. "Saturday, August 15, 2026" (format with timeZone UTC). */
  dateStr: string;
  location?: string | null;
  cost?: string | null;
  experienceLevel?: string | null;
  description?: string | null;
  /** Absolute image URL (e.g. Sanity CDN with ?w=1200&h=600&fit=crop). */
  imageUrl?: string | null;
  eventUrl: string;
  /** Pre-formatted registration deadline, e.g. "August 13". */
  registrationClosesStr?: string | null;
  /** Pass "{{{RESEND_UNSUBSCRIBE_URL}}}" for Resend broadcasts. */
  unsubscribeUrl?: string;
}

export function EventAnnouncement({
  title,
  dateStr,
  location,
  cost,
  experienceLevel,
  description,
  imageUrl,
  eventUrl,
  registrationClosesStr,
  unsubscribeUrl,
}: EventAnnouncementProps) {
  return (
    <EmailLayout
      preview={`${title} — ${dateStr}${cost ? ` · ${cost}` : ""}`}
      variant="marketing"
      unsubscribeUrl={unsubscribeUrl}
    >
      {imageUrl ? (
        <Img
          src={imageUrl}
          alt={title}
          width={536}
          style={{
            width: "100%",
            maxWidth: "536px",
            height: "auto",
            borderRadius: "6px",
            display: "block",
            margin: "0 0 20px",
          }}
        />
      ) : null}

      <Heading
        as="h1"
        style={{
          color: colors.nearBlack,
          fontFamily,
          fontSize: "24px",
          fontWeight: 800,
          lineHeight: "1.25",
          margin: "0 0 16px",
        }}
      >
        {title}
      </Heading>

      <Callout>
        <CalloutLine>
          <strong>When:</strong> {dateStr}
        </CalloutLine>
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
        {experienceLevel ? (
          <CalloutLine>
            <strong>Who:</strong> {experienceLevel}
          </CalloutLine>
        ) : null}
      </Callout>

      {description ? <P>{description}</P> : null}

      <BrandButton href={eventUrl}>Reserve Your Spot</BrandButton>

      {registrationClosesStr ? (
        <Text
          style={{
            color: colors.muted,
            fontFamily,
            fontSize: "14px",
            lineHeight: "1.6",
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          Registration closes {registrationClosesStr} — spots are limited.
        </Text>
      ) : null}

      <P style={{ fontSize: "14px", color: colors.muted }}>
        Questions? Just reply to this email or visit{" "}
        <Link href={eventUrl} style={{ color: colors.darkGreen, fontWeight: 600 }}>
          the event page
        </Link>
        .
      </P>
    </EmailLayout>
  );
}
