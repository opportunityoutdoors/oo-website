import { defineConfig, type SchemaTypeDefinition } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./src/sanity/schemas";
import { CAMP_PRIVATE_PREFIX } from "./src/sanity/schemas/campPrivate";

export default defineConfig({
  name: "opportunity-outdoors",
  title: "Opportunity Outdoors",

  projectId: "u7umrp54",
  dataset: "production",

  plugins: [
    structureTool({
      // "Camp Private Details" lists the camps. Picking one opens that camp's private
      // document, whose ID "private.<event id>" keeps it out of anonymous reads
      // (src/sanity/schemas/campPrivate.ts). It is never created from a bare "+" button,
      // because Studio would give it a plain, public ID.
      structure: (S) =>
        S.list()
          .title("Content")
          .items([
            S.listItem()
              .id("campPrivate")
              .title("Camp Private Details")
              .child(
                S.documentTypeList("event")
                  .title("Camp Private Details")
                  .filter('_type == "event" && eventType in ["hunt-camp", "fish-camp"]')
                  .child((eventId: string) =>
                    S.document()
                      .schemaType("campPrivate")
                      .documentId(`${CAMP_PRIVATE_PREFIX}${eventId}`)
                      .title("Private details")
                  )
              ),
            S.divider(),
            ...S.documentTypeListItems().filter((item) => item.getId() !== "campPrivate"),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes as SchemaTypeDefinition[],
    // No "+ Camp Private Details" in the new-document menu, for the same reason.
    templates: (prev) => prev.filter((t) => t.schemaType !== "campPrivate"),
  },
});
