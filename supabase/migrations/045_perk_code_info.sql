-- How to redeem each list of perk codes (2026-11-10).
--
-- Entered in Sanity next to the codes (Camp Private Details, Mentee Perk Codes, How to
-- Redeem) and mirrored here, because the welcome packet is built from the Supabase event.
-- An array of { label, steps }, one entry per list of codes.

alter table events add column perk_code_info jsonb not null default '[]'::jsonb;
