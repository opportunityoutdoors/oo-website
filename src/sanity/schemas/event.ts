export default {
  name: "event",
  title: "Events",
  type: "document",
  groups: [
    { name: "basic", title: "Basic Info", default: true },
    { name: "dates", title: "Dates" },
    { name: "content", title: "Content" },
    { name: "camp", title: "Camp Settings" },
    { name: "private", title: "Private / Internal" },
  ],
  fields: [
    // ═══════════════════════════════════
    // BASIC INFO
    // ═══════════════════════════════════
    {
      name: "title",
      title: "Event Title",
      type: "string",
      group: "basic",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      title: "URL Slug",
      type: "slug",
      group: "basic",
      options: { source: "title", maxLength: 96 },
      description: "Auto-generated from title. Used in the event page URL.",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "eventType",
      title: "Event Type",
      type: "string",
      group: "basic",
      options: {
        list: [
          { title: "Hunt Camp", value: "hunt-camp" },
          { title: "Fish Camp", value: "fish-camp" },
          { title: "Community", value: "community" },
          { title: "Workshop", value: "workshop" },
        ],
        layout: "radio",
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "status",
      title: "Status",
      type: "string",
      group: "basic",
      description: "Auto-updates based on dates. Override manually if needed.",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Waitlist Open", value: "waitlist-open" },
          { title: "Waitlist Closed", value: "waitlist-closed" },
          { title: "Registration Open", value: "registration-open" },
          { title: "Sold Out", value: "sold-out" },
          { title: "Completed", value: "completed" },
          { title: "Archived", value: "archived" },
        ],
      },
      initialValue: "draft",
    },
    {
      name: "featured",
      title: "Featured on Homepage",
      type: "boolean",
      group: "basic",
      description: "Show this event on the homepage. Max 2 featured events.",
      initialValue: false,
    },
    {
      name: "image",
      title: "Cover Image",
      type: "image",
      group: "basic",
      options: { hotspot: true },
      description: "Used on the event card and detail page hero.",
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility.",
        },
      ],
    },

    // ═══════════════════════════════════
    // DATES
    // ═══════════════════════════════════
    {
      name: "date",
      title: "Event Start Date",
      type: "date",
      group: "dates",
      description: "First day of the event.",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "endDate",
      title: "Event End Date",
      type: "date",
      group: "dates",
      description: "Last day of the event. Leave blank for single-day events.",
    },
    {
      name: "waitlistOpens",
      title: "Waitlist Opens",
      type: "date",
      group: "dates",
      description: "Hunt/fish camps: date the waitlist form becomes visible on the event page.",
    },
    {
      name: "waitlistCloses",
      title: "Waitlist Closes",
      type: "date",
      group: "dates",
      description: "Hunt/fish camps: date the waitlist form is hidden. Reminder email sends the next day.",
    },
    {
      name: "registrationOpens",
      title: "Registration Opens",
      type: "date",
      group: "dates",
      description: "Community/workshop events: date the registration form becomes visible. Leave blank = open immediately.",
    },
    {
      name: "registrationCloses",
      title: "Registration Closes",
      type: "date",
      group: "dates",
      description: "Hard deadline for registration. Leave blank = open until event start date.",
    },

    // ═══════════════════════════════════
    // CONTENT (public-facing)
    // ═══════════════════════════════════
    {
      name: "location",
      title: "Location (Public)",
      type: "string",
      group: "content",
      description: "General area shown on the public site. Example: 'Nantahala National Forest, NC'",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "experienceLevel",
      title: "Experience Level",
      type: "string",
      group: "content",
      description: "Shown on the event detail page. Example: 'All levels welcome' or 'Intermediate'",
    },
    {
      name: "cost",
      title: "Cost (Display)",
      type: "string",
      group: "content",
      description: "Shown on event cards and detail page. Example: 'Free' or '$75'",
    },
    {
      name: "registrationFee",
      title: "Registration Fee ($)",
      type: "number",
      group: "content",
      description: "Actual amount charged via Stripe (mentees only). Set to 0 for free events. Mentors are not charged.",
    },
    {
      name: "spotsTotal",
      title: "Total Spots",
      type: "number",
      group: "content",
      description: "Maximum number of participants. Leave blank for unlimited. Remaining spots are calculated automatically.",
    },
    {
      name: "description",
      title: "Short Description",
      type: "text",
      group: "content",
      rows: 3,
      description: "One or two sentences shown on event cards (homepage, events listing). Keep it brief.",
    },
    {
      name: "body",
      title: "Full Description",
      type: "array",
      group: "content",
      of: [{ type: "block" }],
      description: "Detailed event description shown on the event detail page.",
    },
    {
      name: "schedule",
      title: "Schedule",
      type: "array",
      group: "content",
      description: "Day-by-day schedule shown on the event detail page.",
      of: [
        {
          type: "object",
          fields: [
            { name: "day", title: "Day Label", type: "string", description: "e.g., 'Day 1 — Friday'" },
            {
              name: "items",
              title: "Schedule Items",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    { name: "time", title: "Time", type: "string", description: "e.g., '6:00 AM'" },
                    { name: "activity", title: "Activity", type: "string" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "gearList",
      title: "Gear List",
      type: "object",
      group: "content",
      description: "Shown on the event detail page in three columns.",
      fields: [
        {
          name: "required",
          title: "Required Gear",
          type: "array",
          of: [{ type: "string" }],
          description: "Items participants must bring.",
        },
        {
          name: "recommended",
          title: "Recommended Gear",
          type: "array",
          of: [{ type: "string" }],
          description: "Nice-to-have items.",
        },
        {
          name: "provided",
          title: "Provided by OO",
          type: "array",
          of: [{ type: "string" }],
          description: "Items we provide. Participants don't need to bring these.",
        },
      ],
    },
    {
      name: "faq",
      title: "Event FAQ",
      type: "array",
      group: "content",
      description: "Event-specific questions and answers. Shown as an accordion on the event detail page.",
      of: [
        {
          type: "object",
          fields: [
            { name: "question", title: "Question", type: "string" },
            { name: "answer", title: "Answer", type: "text" },
          ],
        },
      ],
    },

    // ═══════════════════════════════════
    // CAMP SETTINGS (hunt/fish camps only)
    // ═══════════════════════════════════
    {
      name: "meetingSlots",
      title: "Pre-Camp Meeting Slots",
      type: "array",
      group: "camp",
      description: "Virtual meeting options. Google Calendar events and Meet links are created automatically when you publish. Attendance is required for all camp participants.",
      of: [
        {
          type: "object",
          fields: [
            { name: "date", title: "Date/Time", type: "datetime", description: "When the meeting takes place." },
            { name: "label", title: "Label", type: "string", description: "Display name. Example: 'Info Session 1'" },
            { name: "capacity", title: "Capacity", type: "number", description: "Optional. Leave blank for unlimited." },
            { name: "meetingLink", title: "Meeting Link", type: "url", description: "Auto-populated by Google Calendar. Leave blank." },
            { name: "calendarEventId", title: "Calendar Event ID", type: "string", description: "Auto-populated. Do not edit.", readOnly: true },
          ],
          preview: {
            select: { title: "label" },
          },
        },
      ],
    },
    {
      name: "teachingFocusOptions",
      title: "Teaching Focus Options (Mentors)",
      type: "array",
      group: "camp",
      of: [{ type: "string" }],
      description: "Options shown to mentors during registration. Example: 'Calling techniques', 'Scouting & setup'",
    },
    {
      name: "customFields",
      title: "Custom Registration Fields",
      type: "array",
      group: "camp",
      description: "Additional fields added to the registration form for this event.",
      of: [
        {
          type: "object",
          fields: [
            { name: "label", title: "Field Label", type: "string" },
            {
              name: "fieldType",
              title: "Field Type",
              type: "string",
              options: {
                list: ["text", "dropdown", "checkbox", "textarea", "radio"],
              },
            },
            { name: "required", title: "Required", type: "boolean", initialValue: false },
            {
              name: "options",
              title: "Options",
              type: "array",
              of: [{ type: "string" }],
              description: "For dropdown, checkbox, and radio field types.",
            },
            { name: "placeholder", title: "Placeholder", type: "string" },
          ],
          preview: {
            select: { title: "label", subtitle: "fieldType" },
          },
        },
      ],
    },
    {
      name: "mentorPerks",
      title: "Mentor Perks",
      type: "array",
      group: "camp",
      description: "Included in the mentor welcome packet email.",
      of: [
        {
          type: "object",
          fields: [
            { name: "title", title: "Perk", type: "string", description: "Example: '3 months free OnX Hunt'" },
            { name: "link", title: "Link (optional)", type: "url" },
          ],
          preview: { select: { title: "title" } },
        },
      ],
    },
    {
      name: "menteePerks",
      title: "Mentee Perks",
      type: "array",
      group: "camp",
      description: "Included in the mentee welcome packet email.",
      of: [
        {
          type: "object",
          fields: [
            { name: "title", title: "Perk", type: "string", description: "Example: '3 months free OnX Hunt'" },
            { name: "link", title: "Link (optional)", type: "url" },
          ],
          preview: { select: { title: "title" } },
        },
      ],
    },

    // ═══════════════════════════════════
    // PRIVATE / INTERNAL
    // ═══════════════════════════════════
    {
      name: "campLocations",
      title: "Camp Locations (Private)",
      type: "array",
      group: "private",
      description: "NEVER shown publicly. Shared only in the welcome packet email after registration.",
      of: [
        {
          type: "object",
          fields: [
            { name: "label", title: "Label", type: "string", description: "Example: 'Base Camp', 'Hunt Area A'" },
            { name: "coordinates", title: "Coordinates", type: "string", description: "Paste from OnX. Example: '35.4215, -83.94966'" },
            { name: "onxLink", title: "OnX Map Link", type: "url", description: "Link to this pin on OnX Maps." },
          ],
          preview: {
            select: { title: "label", coordinates: "coordinates" },
            prepare({ title, coordinates }: { title: string; coordinates: string }) {
              return { title: title || "Unnamed", subtitle: coordinates || "No coordinates" };
            },
          },
        },
      ],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "eventType", media: "image" },
  },
};
