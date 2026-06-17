import { Link } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { Greeting, P } from "../components";
import { colors, fontFamily, siteUrl } from "../theme";

export interface DenialProps {
  firstName?: string;
  eventTitle: string;
  instagramUrl?: string;
}

export function Denial({ firstName, eventTitle, instagramUrl }: DenialProps) {
  const base = siteUrl();
  const ig = instagramUrl || "https://www.instagram.com/opportunityoutdoors/";
  const link = { color: colors.darkGreen, fontWeight: 600 } as React.CSSProperties;
  return (
    <EmailLayout preview={`Update on your ${eventTitle} registration`}>
      <Greeting name={firstName} />
      <P>
        Thank you for signing up for <strong>{eventTitle}</strong>. We really
        appreciate your interest in Opportunity Outdoors and getting involved
        with the community.
      </P>
      <P>
        Unfortunately, we&apos;re only able to accommodate a certain number of
        participants for this event, and we weren&apos;t able to include everyone
        this time around. We know that&apos;s not the news you were hoping for,
        and we&apos;re sorry.
      </P>
      <P>
        But this isn&apos;t the end of the road. We have events throughout the
        year, and we&apos;d love to see you at the next one. Here are some ways to
        stay involved in the meantime:
      </P>

      <ul
        style={{
          color: colors.nearBlack,
          fontFamily,
          fontSize: "16px",
          lineHeight: "1.8",
          paddingLeft: "20px",
          margin: "0 0 16px",
        }}
      >
        <li>
          <Link href={`${base}/events`} style={link}>
            Check out upcoming events
          </Link>
        </li>
        <li>
          <Link href={`${base}/get-involved`} style={link}>
            Other ways to get involved
          </Link>
        </li>
        <li>
          Follow us on{" "}
          <Link href={ig} style={link}>
            Instagram
          </Link>{" "}
          for updates
        </li>
      </ul>

      <P>Thanks for being part of the OO community. We&apos;ll see you out there.</P>
      <P>— The Opportunity Outdoors Team</P>
    </EmailLayout>
  );
}
