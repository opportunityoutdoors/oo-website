import { Heading } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Greeting, P, Signoff } from "../components";
import { colors, fontFamily } from "../theme";

/**
 * One template for every step of the mentee and mentor nurture sequences.
 *
 * The copy itself lives in src/lib/nurture/copy.json, not here, so wording changes are a
 * one-file edit and never touch layout. This component only knows how to render a
 * heading, some paragraphs, and an optional button.
 *
 * Uses the marketing layout variant because a timed series is ongoing promotional mail:
 * that variant appends the physical mailing address and the unsubscribe link required
 * for it. `unsubscribeUrl` points at our own /nurture/unsubscribe token route, which
 * stops this series only and does not touch the Resend marketing segment.
 */

export interface NurtureEmailProps {
  firstName?: string;
  preview: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  unsubscribeUrl: string;
}

export function NurtureEmail({
  firstName,
  preview,
  heading,
  paragraphs,
  cta,
  unsubscribeUrl,
}: NurtureEmailProps) {
  return (
    <EmailLayout
      preview={preview}
      variant="marketing"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Greeting name={firstName} />

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
        {heading}
      </Heading>

      {paragraphs.map((text, i) => (
        <P key={i}>{text}</P>
      ))}

      {cta ? <BrandButton href={cta.url}>{cta.label}</BrandButton> : null}

      <Signoff />
    </EmailLayout>
  );
}
