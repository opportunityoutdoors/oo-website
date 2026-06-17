import { Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, Callout, CalloutLabel, CalloutLine, P } from "../components";
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

function personLine(p: Person) {
  return `${p.name} — ${p.email}${p.phone ? ` — ${p.phone}` : ""}`;
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
  eventUrl,
}: WelcomePacketProps) {
  return (
    <EmailLayout preview={`Welcome packet for ${eventTitle}`}>
      <P>Hey {greetingName},</P>
      <P>
        We&apos;re counting down to <strong>{eventTitle}</strong>! Here&apos;s
        everything you need to know.
      </P>

      {eventDateStr || location ? (
        <Callout>
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
        </Callout>
      ) : null}

      {/* Match info */}
      {isMentor && mentees.length > 0 ? (
        <>
          <P>
            <strong>Your assigned mentee{mentees.length > 1 ? "s" : ""}:</strong>
          </P>
          <ul
            style={{
              color: colors.nearBlack,
              fontFamily,
              fontSize: "15px",
              lineHeight: "1.8",
              paddingLeft: "20px",
              margin: "0 0 12px",
            }}
          >
            {mentees.map((m) => (
              <li key={m.email}>
                <strong>{m.name}</strong>
                {" — "}
                {m.email}
                {m.phone ? ` — ${m.phone}` : ""}
              </li>
            ))}
          </ul>
          <Text style={muted}>
            We encourage you to reach out to your mentee
            {mentees.length > 1 ? "s" : ""} before camp to introduce yourself. A
            quick text or email goes a long way.
          </Text>
        </>
      ) : null}

      {!isMentor && mentor ? (
        <>
          <P>
            <strong>Your assigned mentor:</strong>
          </P>
          <Text
            style={{
              color: colors.nearBlack,
              fontFamily,
              fontSize: "15px",
              lineHeight: "1.6",
              paddingLeft: "20px",
              margin: "0 0 12px",
            }}
          >
            {personLine(mentor)}
          </Text>
          <Text style={muted}>
            Your mentor is a volunteer who will be your buddy at camp. Feel free
            to reach out before the event to introduce yourself.
          </Text>
        </>
      ) : null}

      <Hr style={divider} />

      <P style={{ fontWeight: 600 }}>
        Camp Location{campLocations.length > 1 ? "s" : ""}
      </P>
      <Text style={muted}>
        Please keep these coordinates private and do not share publicly.
      </Text>
      {campLocations.map((loc, i) => (
        <Section
          key={i}
          style={{
            backgroundColor: colors.cream,
            borderRadius: "4px",
            padding: "12px 16px",
            margin: "0 0 12px",
          }}
        >
          <CalloutLabel>{loc.label || "Camp Location"}</CalloutLabel>
          {loc.coordStr ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily,
                fontSize: "13px",
                margin: "0 0 8px",
              }}
            >
              {loc.coordStr}
            </Text>
          ) : null}
          <Text style={{ fontFamily, fontSize: "13px", margin: 0 }}>
            {loc.googleMapsUrl ? (
              <Link href={loc.googleMapsUrl} style={link}>
                Google Maps Directions
              </Link>
            ) : null}
            {loc.onxLink ? (
              <>
                {loc.googleMapsUrl ? " · " : ""}
                <Link href={loc.onxLink} style={link}>
                  View on OnX
                </Link>
              </>
            ) : null}
          </Text>
        </Section>
      ))}

      {perks.length > 0 ? (
        <>
          <Hr style={divider} />
          <P style={{ fontWeight: 600 }}>Your Perks</P>
          <ul
            style={{
              color: colors.nearBlack,
              fontFamily,
              fontSize: "15px",
              lineHeight: "1.8",
              paddingLeft: "20px",
              margin: "0 0 16px",
            }}
          >
            {perks.map((p, i) => (
              <li key={i}>
                {p.link ? (
                  <Link href={p.link} style={link}>
                    {p.title}
                  </Link>
                ) : (
                  p.title
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Hr style={divider} />

      <P>
        Check the event page for the full schedule, gear list, and other details:
      </P>
      <BrandButton href={eventUrl}>View Event Details</BrandButton>

      <P>See you in the field!</P>
      <P>— The Opportunity Outdoors Team</P>
    </EmailLayout>
  );
}
