-- Tracks whether staff have already been told about a background check needing attention.
--
-- Without this the daily alert would email the same names every day for as long as the
-- problem persists, which is the fastest way to train people to ignore the channel. One
-- alert per problem, then silence until the state actually changes.
--
-- Cleared wherever status changes (webhook, poller, admin decision), so a genuinely new
-- problem alerts again rather than being suppressed by a stamp from a previous one.

alter table contacts
  add column background_check_alerted_at timestamptz;

comment on column contacts.background_check_alerted_at is
  'Set when staff were alerted about this check. Cleared on any status change so the next real problem alerts again. Null means not yet alerted.';

create index contacts_bg_alert_pending_idx on contacts (background_check_status)
  where background_check_alerted_at is null
    and background_check_status in ('flagged', 'invited', 'pending', 'error');
