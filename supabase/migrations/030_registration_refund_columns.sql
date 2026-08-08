-- Refund bookkeeping for camp registrations.
--
-- refund.ts has selected and written registrations.refunded_at since the adverse action
-- work. The column has never existed. Migration 024 added refunded_at and refunded_amount
-- to `donations`, and the registration half was simply missed.
--
-- The failure was invisible, which is the part worth recording. PostgREST rejects a select
-- naming an unknown column, returns null data, and refund.ts read that null as "this person
-- has no paid registrations" and reported nothing to refund. Every layer behaved correctly.
-- A live adverse action would have logged "Refunds issued: 0", looked like a clean run, and
-- returned nobody's money. It was found by exercising the path against a test fixture rather
-- than by anything failing loudly.
--
-- refunded_amount is added alongside, not just refunded_at. These refunds are partial by
-- design (less the processing fee and the background check fee), so payment_status alone
-- cannot answer "how much went back", and that is exactly the question asked when a
-- participant queries their refund a month later.

alter table registrations
  add column refunded_at timestamptz,
  add column refunded_amount numeric(10,2);

comment on column registrations.refunded_at is
  'When a refund was issued. Null means never refunded.';
comment on column registrations.refunded_amount is
  'What was actually returned, which is less than payment_amount: the Stripe fee and any background check fee are withheld and disclosed at registration.';

-- Partial index because the overwhelming majority of registrations are never refunded, and
-- the only query that matters is "which ones were".
create index registrations_refunded_idx on registrations (refunded_at)
  where refunded_at is not null;
