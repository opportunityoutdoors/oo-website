export default {
  name: "galleryImage",
  title: "From the Field",
  type: "document",
  fields: [
    {
      name: "title",
      title: "Batch Name",
      type: "string",
      description: "e.g., 'Turkey Camp 2026 Photos', 'Uwharrie Deer Camp'. Just for your reference.",
    },
    {
      name: "images",
      title: "Photos",
      type: "array",
      description: "Upload multiple photos at once. Drag and drop or click to add.",
      of: [
        {
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
      ],
      options: {
        layout: "grid",
      },
    },
  ],
  preview: {
    select: { title: "title", images: "images" },
    prepare({ title, images }: { title: string; images: unknown[] }) {
      return {
        title: title || "Untitled Batch",
        subtitle: `${images?.length || 0} photos`,
      };
    },
  },
};
