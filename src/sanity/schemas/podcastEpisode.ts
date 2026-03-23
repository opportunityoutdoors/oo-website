export default {
  name: "podcastEpisode",
  title: "Podcast Episode",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "episodeNumber",
      title: "Episode Number",
      type: "number",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    },
    {
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: "audioUrl",
      title: "Audio URL",
      type: "url",
    },
    {
      name: "duration",
      title: "Duration",
      type: "string",
      description: "e.g. '45:30'",
    },
  ],
  orderings: [
    {
      title: "Episode Number",
      name: "episodeDesc",
      by: [{ field: "episodeNumber", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "episodeNumber" },
    prepare({ title, subtitle }: { title: string; subtitle: number }) {
      return { title, subtitle: `Episode ${subtitle}` };
    },
  },
};
