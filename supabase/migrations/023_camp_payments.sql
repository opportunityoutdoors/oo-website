-- Camp registration payments.
--
-- Migration 011 added registrations.stripe_payment_id and payment_amount in anticipation
-- of this. Both have sat null ever since. What was missing was the amount to charge.
--
-- Sanity has had a numeric `registrationFee` field all along, described as "Actual amount
-- charged via Stripe", but it was never projected into any GROQ query and never synced
-- here. In its absence the registration form derived the fee by stripping non-digits out
-- of `cost`, which is the DISPLAY string ("$75", "Free", "$75 per person"). That is fine
-- for showing a total to a human and unacceptable for deciding what to charge a card:
-- "$1,200" and "$1200" differ, "Free" parses to NaN, and any editor typing "75 dollars"
-- silently changes the price. This column gives the server a number to trust.

alter table events
  -- Authoritative amount charged per paying participant, in dollars. Null means the event
  -- predates this column or the Sanity field is unset; the fee computation treats null as
  -- free rather than guessing from the display string.
  add column registration_fee numeric(10,2);

comment on column events.registration_fee is
  'Charged per paying participant. Synced from Sanity event.registrationFee. The `cost` column is display copy only and must never be parsed for pricing.';

alter table registrations
  -- When the money actually landed. payment_status alone cannot answer "how long did this
  -- person sit unpaid", which is the question that matters for chasing balances.
  add column paid_at timestamptz;

-- Idempotency, same reasoning as donations: Stripe delivers at-least-once, so a replayed
-- checkout.session.completed must not be able to re-stamp a registration or double-count
-- payment_amount. Partial because the column is null for every free and unpaid registration
-- and those must not collide with each other.
create unique index registrations_stripe_payment_key
  on registrations (stripe_payment_id)
  where stripe_payment_id is not null;

-- Finding who still owes money is the single most common admin question this feature
-- creates, and it is a poor fit for a sequential scan once there are several camps.
create index registrations_unpaid_idx
  on registrations (event_id)
  where payment_status = 'pending';
