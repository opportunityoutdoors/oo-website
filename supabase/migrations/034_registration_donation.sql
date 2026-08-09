-- A voluntary contribution toward camp costs, chosen at registration.
--
-- Stored rather than passed through the checkout call, for the same reason the minor is
-- looked up rather than passed: the resume link for an abandoned payment must charge the
-- same total as the original attempt. A transient value would quietly change the price
-- between the first try and the second.
--
-- This replaced a $25 mentor t-shirt charge. Selling a shirt is a retail sale of tangible
-- personal property, taxable in North Carolina even for a 501(c)(3), whereas a camp fee is
-- exempt because of what it buys. Every mentor now gets a shirt regardless, which is what
-- makes this a gift rather than a price: nothing is contingent on paying it.

alter table registrations
  add column donation_cents integer not null default 0
    constraint registrations_donation_not_negative check (donation_cents >= 0);

comment on column registrations.donation_cents is
  'Voluntary contribution toward camp costs, in cents. Never required, and nothing is withheld from anyone who leaves it at zero.';
