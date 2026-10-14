import { client } from "@/lib/sanity";

export type BoardMember = { id: string; name: string; title: string | null };

/**
 * The board, from the Board Members documents in Sanity: the same list the About page shows.
 *
 * No email lives in Sanity on purpose. The dataset is public, so any field there is readable
 * through Sanity's API by anyone. The link from a board member to a contact is kept in the
 * board_links table instead (migration 038), which only the server can read.
 */
export async function boardMembers(): Promise<BoardMember[]> {
  const rows = await client
    .withConfig({ useCdn: false })
    .fetch<{ _id: string; name: string; role: string | null }[]>(
      `*[_type == "teamMember" && !(_id in path("drafts.**"))] | order(order asc) { _id, name, role }`
    );
  return rows.map((r) => ({ id: r._id, name: r.name, title: r.role }));
}
