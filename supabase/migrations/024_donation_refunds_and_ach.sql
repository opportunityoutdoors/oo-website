-- Refund tracking, and the states ACH introduces.
--
-- Until now `status` only ever held 'succeeded', because a card payment is settled by the
-- time the webhook fires. Two things break that assumption:
--
--   REFUNDS. Money can leave after the fact. Two test gifts were refunded in Stripe on
--   2026-08-05 and the database went on reporting them as revenue, because nothing was
--   subscribed to charge.refunded. Totals overstated by $10.92 with no indication.
--
--   ACH. Bank debits settle in about four business days, so checkout.session.completed
--   arrives with payment_status 'unpaid' and the money may still fail afterwards on
--   insufficient funds. A gift is therefore pending first and resolved later, and can
--   resolve either way.
--
-- `status` values, all written by the webhook and nothing else:
--   pending    ACH authorised, funds not yet settled. NOT income. No receipt sent.
--   succeeded  money received.
--   failed     ACH did not clear. Terminal.
--   refunded   money returned, fully or partly. See refunded_amount.
--
-- Anything summing donations MUST filter on status = 'succeeded', or better, subtract
-- refunded_amount. A bare sum(amount) now counts pending and refunded gifts as income.

alter table donations
  -- Partial refunds are real: a donor overpays, or a fee-cover top-up is returned. Storing
  -- the amount rather than a boolean is what makes net revenue computable.
  add column refunded_amount numeric(10,2) not null default 0,
  add column refunded_at timestamptz,

  -- 'card' or 'us_bank_account'. `method` already records the Stripe flow
  -- (stripe_checkout / stripe_subscription); this records how the donor actually paid,
  -- which is what determines the fee and therefore whether the top-up was right.
  add column payment_method_type text;

comment on column donations.status is
  'pending | succeeded | failed | refunded. Only succeeded is income. Sum with care.';

comment on column donations.refunded_amount is
  'Dollars returned to the donor. Net revenue is amount - refunded_amount for succeeded and refunded rows.';

-- Reporting reads filter on status constantly once pending and refunded rows exist.
create index donations_status_idx on donations (status);

-- Pending ACH gifts are the ones a human needs to chase or watch, and they are a small
-- slice of the table, so they get their own partial index.
create index donations_pending_idx on donations (date desc) where status = 'pending';
