-- Wire the donations table (created empty in 001 as "future use") up to Stripe.
--
-- Two payment shapes land here and they are recorded from different Stripe events:
--
--   one-time    Checkout mode=payment. Recorded from checkout.session.completed.
--   recurring   Checkout mode=subscription. NOT recorded from checkout.session.completed,
--               because Stripe also fires invoice.paid for that same first charge and we
--               would count the gift twice. Every charge, first and renewal alike, is
--               recorded from invoice.paid instead. One row per billing period.
--
-- Both event types carry a payment_intent, which is why the idempotency key below is the
-- payment intent rather than the session or the event id.

alter table donations
  -- Idempotency key for the webhook. Stripe retries deliveries and guarantees at-least-once,
  -- not exactly-once, so the handler WILL see duplicates. A unique index turns a replay into
  -- a harmless conflict instead of a second donation row and a second tax receipt.
  -- Nullable because offline gifts (check, cash, DAF) are recorded by hand with no intent,
  -- and Postgres permits many NULLs under a UNIQUE constraint.
  add column stripe_payment_intent_id text,
  add column stripe_checkout_session_id text,

  -- Set on recurring gifts only. Lets the admin see who is a sustaining donor and gives us
  -- a handle for cancellations without another round trip to Stripe.
  add column stripe_subscription_id text,
  add column stripe_customer_id text,

  -- true for monthly sustaining gifts, false for one-time. Denormalised from the presence
  -- of stripe_subscription_id so reporting does not have to reason about NULLs.
  add column recurring boolean not null default false,

  -- 'succeeded' is the only state we write today: the webhook fires after the money moved.
  -- The column exists so refunds and disputes have somewhere to go without a migration.
  add column status text not null default 'succeeded',

  -- What the donor added on top to absorb processing fees, already included in `amount`.
  -- Held separately because it is the org's fee relief, not extra program funding, and
  -- lumping it into gift totals overstates giving.
  add column fee_covered_amount numeric(10,2) not null default 0,

  add column currency text not null default 'usd',

  -- Stamped when the IRS acknowledgment goes out. Doubles as the guard that stops a
  -- webhook replay from mailing a second receipt for the same gift.
  add column receipt_sent_at timestamptz;

-- The idempotency guarantee. Partial so the many NULLs from offline gifts cost nothing.
create unique index donations_stripe_payment_intent_key
  on donations (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index donations_stripe_checkout_session_key
  on donations (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Reporting reads: "gifts this year", "who gives monthly", "this donor's history".
create index donations_date_idx on donations (date desc);
create index donations_contact_idx on donations (contact_id);
create index donations_subscription_idx on donations (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- donations already has RLS enabled with zero policies from 001, which is deny-all for the
-- anon and authenticated roles. The service-role client used by the webhook bypasses RLS.
-- Restated here only so a reader of this migration does not assume the new columns are
-- publicly readable: they are not. Donation records are among the most sensitive rows in
-- the database and must never be reachable with the publishable key.
