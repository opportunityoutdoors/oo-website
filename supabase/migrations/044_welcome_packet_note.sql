-- A short note from the camp at the top of every welcome packet (2026-11-10).
--
-- Written in Sanity (Welcome Packet Note) and mirrored here like the perks, because the
-- packet is built from the Supabase event row. Empty means no note.

alter table events add column welcome_packet_note text;
