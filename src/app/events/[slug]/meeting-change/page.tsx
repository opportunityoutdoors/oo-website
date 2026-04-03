import MeetingChangeForm from "./MeetingChangeForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Meeting Date",
  robots: "noindex, nofollow",
};

export default function MeetingChangePage() {
  return <MeetingChangeForm />;
}
