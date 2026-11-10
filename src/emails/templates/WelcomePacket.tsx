import { Hr, Link, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLabel, CalloutLine, P, Signoff } from "../components";
import { colors, fontFamily } from "../theme";

interface Person {
  name: string;
  email: string;
  phone?: string | null;
}

interface CampLocationView {
  label: string;
  coordStr?: string;
  googleMapsUrl?: string | null;
  onxLink?: string | null;
}

export interface WelcomePacketProps {
  greetingName: string;
  eventTitle: string;
  eventDateStr?: string | null;
  location?: string | null;
  isMentor: boolean;
  mentees?: Person[];
  mentor?: Person | null;
  campLocations: CampLocationView[];
  perks?: Array<{ title: string; link?: string }>;
  /** Codes unique to this person, such as an OnX promo code (lib/perk-codes.ts). */
  codes?: Array<{ label: string; code: string; steps?: string[] }>;
  /** The camp's note from Sanity (Welcome Packet Note). Blank lines split paragraphs. */
  note?: string | null;
  eventUrl: string;
}

const link = { color: colors.darkGreen, fontWeight: 600 } as React.CSSProperties;
const divider: React.CSSProperties = {
  borderColor: colors.warmGray,
  margin: "24px 0",
};
const muted: React.CSSProperties = {
  color: colors.muted,
  fontFamily,
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

/** "9196496907" reads as "919-649-6907". Anything that is not 10 digits prints as stored. */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : phone;
}

/** A step's web addresses become links, so "Visit https://..." can be tapped. */
function withLinks(text: string): React.ReactNode[] {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <Link key={i} href={part} style={link}>
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

/** Name, email and phone. The phone never wraps, so "919-649-6907" stays on one line. */
function personLine(p: Person): React.ReactNode {
  return (
    <>
      {p.name} · {p.email}
      {p.phone ? (
        <>
          {" · "}
          <span style={{ whiteSpace: "nowrap" }}>{formatPhone(p.phone)}</span>
        </>
      ) : null}
    </>
  );
}

export function WelcomePacket({
  greetingName,
  eventTitle,
  eventDateStr,
  location,
  isMentor,
  mentees = [],
  mentor,
  campLocations,
  perks = [],
  codes = [],
  note,
  eventUrl,
}: WelcomePacketProps) {
  return (
    <EmailLayout preview={`Welcome packet for ${eventTitle}`}>
      <P>Hey {greetingName},</P>
      <P>
        We&apos;re counting down to <strong>{eventTitle}</strong>! Here&apos;s
        everything you need to know.
      </P>

      {/* The camp's own note, written in Sanity. Plain text: blank lines split paragraphs,
          single line breaks stay inside one. */}
      {note?.trim()
        ? note
            .trim()
            .split(/\n\s*\n/)
            .map((para, i) => (
              <P key={i} style={{ whiteSpace: "pre-line" }}>
                {para.trim()}
              </P>
            ))
        : null}

      {/* Condensed 2026-11-10: the camp's note can run long, so the facts sit in two
          compact boxes under it. The note's own wording points "below" to them. */}
      <Callout>
        <CalloutLabel>Camp Details</CalloutLabel>
        {eventDateStr ? (
          <CalloutLine>
            <strong>When:</strong> {eventDateStr}
          </CalloutLine>
        ) : null}
        {location ? (
          <CalloutLine>
            <strong>Where:</strong> {location}
          </CalloutLine>
        ) : null}
        {campLocations.map((loc, i) => (
          <CalloutLine key={i}>
            <strong>{campLocations.length > 1 ? `${loc.label || "Camp"}:` : "Camp:"}</strong>{" "}
            {campLocations.length > 1 ? null : `${loc.label || "Camp location"} `}
            {loc.coordStr ? <span style={{ color: colors.muted }}>({loc.coordStr})</span> : null}
            {loc.googleMapsUrl || loc.onxLink ? <br /> : null}
            {loc.googleMapsUrl ? (
              <Link href={loc.googleMapsUrl} style={link}>
                Google Maps Directions
              </Link>
            ) : null}
            {loc.googleMapsUrl && loc.onxLink ? " · " : null}
            {loc.onxLink ? (
              <Link href={loc.onxLink} style={link}>
                View on OnX
              </Link>
            ) : null}
          </CalloutLine>
        ))}
        {!isMentor && mentor ? (
          <CalloutLine>
            <strong>Your mentor:</strong> {personLine(mentor)}
          </CalloutLine>
        ) : null}
        {isMentor && mentees.length > 0 ? (
          <CalloutLine>
            <strong>Your mentee{mentees.length > 1 ? "s" : ""}:</strong>
            {mentees.map((m) => (
              <React.Fragment key={m.email}>
                <br />
                {personLine(m)}
              </React.Fragment>
            ))}
          </CalloutLine>
        ) : null}
        {campLocations.length > 0 ? (
          <Text style={{ ...muted, fontSize: "13px", margin: "8px 0 0" }}>
            Please keep the camp location private.
          </Text>
        ) : null}
      </Callout>

      {perks.length > 0 || codes.length > 0 ? (
        <Callout>
          <CalloutLabel>Your Perks</CalloutLabel>
          {perks.map((p, i) => (
            <CalloutLine key={i}>
              {p.link ? (
                <Link href={p.link} style={link}>
                  {p.title}
                </Link>
              ) : (
                p.title
              )}
            </CalloutLine>
          ))}
          {/* The person's own codes, with the steps to redeem each from Sanity. */}
          {codes.map((c) => (
            <React.Fragment key={c.label}>
              <CalloutLine>
                Your {c.label} code: <strong style={{ fontSize: "16px" }}>{c.code}</strong>
              </CalloutLine>
              {c.steps?.length ? (
                <ol
                  style={{
                    color: colors.nearBlack,
                    fontFamily,
                    fontSize: "14px",
                    lineHeight: "1.6",
                    paddingLeft: "20px",
                    margin: "4px 0 0",
                  }}
                >
                  {c.steps.map((step, i) => (
                    <li key={i}>{withLinks(step)}</li>
                  ))}
                </ol>
              ) : null}
            </React.Fragment>
          ))}
          {codes.length > 0 ? (
            <Text style={{ ...muted, fontSize: "13px", margin: "8px 0 0" }}>
              {codes.length === 1
                ? "This code is yours alone and works once. Please don't share it."
                : "These codes are yours alone and work once. Please don't share them."}
            </Text>
          ) : null}
        </Callout>
      ) : null}

      <Hr style={divider} />

      <P>
        Check the event page for the full schedule, gear list, and other
        details:
      </P>
      <BrandButton href={eventUrl}>View Event Details</BrandButton>

      <P>See you in the field!</P>
      <Signoff />
    </EmailLayout>
  );
}
