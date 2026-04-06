export default {
  name: "blogPost",
  title: "Blog",
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
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      validation: (Rule: any) => Rule.required().max(200),
    },
    {
      name: "publishedAt",
      title: "Publish Date",
      type: "datetime",
      description: "Set a future date to schedule. The post won't appear on the site until this date.",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Hunting", value: "hunting" },
          { title: "Fishing", value: "fishing" },
          { title: "Conservation", value: "conservation" },
          { title: "Mentorship", value: "mentorship" },
          { title: "Gear & Tips", value: "gear-tips" },
          { title: "Community", value: "community" },
        ],
      },
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
    {
      name: "gallery",
      title: "Photo Gallery",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", title: "Alt Text", type: "string" },
            { name: "caption", title: "Caption", type: "string" },
          ],
        },
      ],
    },
    {
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", title: "Alt Text", type: "string" },
            { name: "caption", title: "Caption", type: "string" },
          ],
        },
      ],
    },
  ],
  orderings: [
    {
      title: "Published Date (Newest)",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Published Date (Oldest)",
      name: "publishedAtAsc",
      by: [{ field: "publishedAt", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", date: "publishedAt", category: "category", media: "image" },
    prepare({ title, date, category }: { title: string; date: string; category: string }) {
      const formatted = date
        ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "No date";
      return {
        title,
        subtitle: `${formatted} — ${category || "uncategorized"}`,
      };
    },
  },
};
