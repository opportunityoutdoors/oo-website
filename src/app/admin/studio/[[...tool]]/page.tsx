"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../../sanity.config";

export default function StudioPage() {
  return (
    <div className="fixed inset-0 left-56 top-0 z-[60]">
      <NextStudio config={config} />
    </div>
  );
}
