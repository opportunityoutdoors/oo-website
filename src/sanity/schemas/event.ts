export default {
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "eventType",
      title: "Event Type",
      type: "string",
      options: {
        list: [
          { title: "Hunt Camp", value: "hunt-camp" },
          { title: "Fish Camp", value: "fish-camp" },
          { title: "Community", value: "community" },
          { title: "Workshop", value: "workshop" },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "status",
      title: "Status",
      type: "string",
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
      initialValue: false,
    },
    {
      name: "date",
      title: "Start Date",
      type: "datetime",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "endDate",
      title: "End Date",
      type: "datetime",
    },
    {
      name: "location",
      title: "Location (Public)",
      type: "string",
      description: "General area shown on the public site (e.g., 'Nantahala National Forest, NC')",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "experienceLevel",
      title: "Experience Level",
      type: "string",
      description: "e.g., 'All levels welcome'",
    },
    {
      name: "cost",
      title: "Cost (Display)",
      type: "string",
      description: "e.g., 'Free' or '$75'. For display only.",
    },
    {
      name: "registrationFee",
      title: "Registration Fee ($)",
      type: "number",
      description: "Amount charged via Stripe. Set to 0 for free events.",
    },
    {
      name: "spotsTotal",
      title: "Total Spots",
      type: "number",
    },
    {
      name: "spotsRemaining",
      title: "Spots Remaining",
      type: "number",
      description: "Manually updated by team.",
    },
    {
      name: "description",
      title: "Short Description",
      type: "text",
      rows: 3,
    },
    {
      name: "image",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
        },
      ],
    },

    // ─── Registration Windows ───
    {
      name: "registrationOpens",
      title: "Registration Opens",
      type: "datetime",
      description: "For community/workshop events. Leave empty = open immediately.",
    },
    {
      name: "registrationCloses",
      title: "Registration Closes",
      type: "datetime",
      description: "For community/workshop events. Leave empty = open until start date.",
    },
    {
      name: "waitlistOpens",
      title: "Waitlist Opens",
      type: "datetime",
      description: "For hunt/fish camps only.",
    },
    {
      name: "waitlistCloses",
      title: "Waitlist Closes",
      type: "datetime",
      description: "For hunt/fish camps only.",
    },

    // ─── Perks (included in welcome packet emails) ───
    {
      name: "mentorPerks",
      title: "Mentor Perks",
      type: "array",
      description: "Perks included in the mentor welcome packet email. One per line.",
      of: [
        {
          type: "object",
          fields: [
            { name: "title", title: "Perk", type: "string", description: "e.g., '3 months free OnX Hunt'" },
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
      description: "Perks included in the mentee welcome packet email. One per line.",
      of: [
        {
          type: "object",
          fields: [
            { name: "title", title: "Perk", type: "string", description: "e.g., '3 months free OnX Hunt'" },
            { name: "link", title: "Link (optional)", type: "url" },
          ],
          preview: { select: { title: "title" } },
        },
      ],
    },

    // ─── Private Camp Location (not shown publicly) ───
    {
      name: "campLocations",
      title: "Camp Locations (Private)",
      type: "array",
      description: "Private camp location pins. NOT shown on the public event page. Shared only in the camp welcome packet email.",
      of: [
        {
          type: "object",
          fields: [
            { name: "label", title: "Label", type: "string", description: "e.g., 'Base Camp', 'Hunt Area A'" },
            { name: "coordinates", title: "Coordinates", type: "string", description: "Paste from OnX, e.g., '35.4215, -83.94966'" },
            { name: "onxLink", title: "OnX Map Link", type: "url", description: "Link to this pin on OnX Maps" },
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

    // ─── Camp-specific fields ───
    {
      name: "meetingSlots",
      title: "Pre-Camp Meeting Slots",
      type: "array",
      description: "Virtual meeting options for hunt/fish camps.",
      of: [
        {
          type: "object",
          fields: [
            { name: "date", title: "Date/Time", type: "datetime" },
            { name: "label", title: "Label", type: "string", description: "e.g., 'Saturday, May 10 @ 7pm ET'" },
            { name: "capacity", title: "Capacity", type: "number" },
            { name: "meetingLink", title: "Meeting Link (Zoom)", type: "url" },
          ],
          preview: {
            select: { title: "label" },
          },
        },
      ],
    },
    {
      name: "customFields",
      title: "Custom Registration Fields",
      type: "array",
      description: "Event-specific form fields for registration.",
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
              description: "For dropdown/checkbox/radio field types.",
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
      name: "teachingFocusOptions",
      title: "Teaching Focus Options (Mentors)",
      type: "array",
      of: [{ type: "string" }],
      description: "e.g., 'Calling techniques', 'Scouting & setup', etc.",
    },

    // ─── Content sections ───
    {
      name: "schedule",
      title: "Schedule",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "day", title: "Day Label", type: "string" },
            {
              name: "items",
              title: "Schedule Items",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    { name: "time", title: "Time", type: "string" },
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
      fields: [
        {
          name: "required",
          title: "Required Gear",
          type: "array",
          of: [{ type: "string" }],
        },
        {
          name: "recommended",
          title: "Recommended Gear",
          type: "array",
          of: [{ type: "string" }],
        },
        {
          name: "provided",
          title: "Provided Gear",
          type: "array",
          of: [{ type: "string" }],
        },
      ],
    },
    {
      name: "faq",
      title: "Event FAQ",
      type: "array",
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
    {
      name: "body",
      title: "Full Description",
      type: "array",
      of: [{ type: "block" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "eventType", media: "image" },
  },
};
