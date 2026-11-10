// Private details for one camp: where it is, the welcome packet note, and the mentee perk codes.
//
// The dataset is public on Sanity's free plan, so anyone can read a normal document with no
// login. Sanity hides any document whose ID contains a dot from anonymous reads, the same way
// it hides drafts. So each camp's private details live in their own document with the ID
// "private.<event id>", opened from Studio's "Camp Private Details" list (sanity.config.ts).
// The site reads it with a server token. Decided 2026-11-10.

export const CAMP_PRIVATE_PREFIX = "private.";

export default {
  name: "campPrivate",
  title: "Camp Private Details",
  type: "document",
  fields: [
    {
      name: "campLocations",
      title: "Camp Locations",
      type: "array",
      description: "Shared only in the welcome packet email after registration.",
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
    {
      name: "welcomePacketNote",
      title: "Welcome Packet Note",
      type: "text",
      rows: 4,
      description:
        "A short note at the top of every welcome packet email, for mentors, mentees and staff. Leave blank for none. Blank lines start a new paragraph.",
    },
    {
      name: "perkCodes",
      title: "Mentee Perk Codes",
      type: "array",
      description:
        "Single-use codes, a different one for each mentee, such as OnX promo codes. Each adult mentee gets one from each list in their welcome packet, and keeps it if the packet is sent again. Removing a code here takes it back only if nobody has it yet.",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "label",
              title: "Name",
              type: "string",
              initialValue: "OnX",
              description: "Shows in the packet as 'Your OnX code'.",
              validation: (rule: { required: () => unknown }) => rule.required(),
            },
            {
              name: "codes",
              title: "Codes",
              type: "text",
              rows: 10,
              description: "One code per line.",
            },
            {
              name: "redeemSteps",
              title: "How to Redeem",
              type: "text",
              rows: 4,
              initialValue:
                "Visit https://webmap.onxmaps.com/hunt/redeem/create-account\nCreate your account\nEnter your redemption code: {code}",
              description:
                "Shown under the code as numbered steps, one step per line. {code} becomes the mentee's own code. A web address becomes a link.",
            },
          ],
          preview: {
            select: { title: "label", codes: "codes" },
            prepare({ title, codes }: { title?: string; codes?: string }) {
              const n = (codes || "").split(/[\s,;]+/).filter(Boolean).length;
              return { title: title || "Codes", subtitle: `${n} code${n === 1 ? "" : "s"}` };
            },
          },
        },
      ],
    },
  ],
  preview: {
    prepare() {
      return { title: "Camp Private Details" };
    },
  },
};
