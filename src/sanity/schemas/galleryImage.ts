export default {
  name: "galleryImage",
  title: "Gallery",
  type: "document",
  fields: [
    {
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      validation: (Rule: any) => Rule.required(),
      fields: [
        {
          name: "alt",
          title: "Alt Text",
          type: "string",
          description: "Describe the image for accessibility.",
        },
        {
          name: "caption",
          title: "Caption (optional)",
          type: "string",
        },
      ],
    },
    {
      name: "event",
      title: "Event Name (optional)",
      type: "string",
      description: "e.g., 'Turkey Camp 2026', 'Uwharrie Deer Camp 2025'",
    },
    {
      name: "date",
      title: "Date Taken (optional)",
      type: "date",
    },
  ],
  preview: {
    select: {
      media: "image",
      title: "image.caption",
      subtitle: "event",
    },
    prepare({ media, title, subtitle }: { media: unknown; title: string; subtitle: string }) {
      return {
        media,
        title: title || "Untitled",
        subtitle: subtitle || "",
      };
    },
  },
};
