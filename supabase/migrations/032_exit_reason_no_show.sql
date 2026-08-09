-- "Did not show up" is its own thing.
--
-- It was being folded into "told us they cannot make it", which is the opposite behaviour:
-- one person let you know so the place could be re-offered, the other left a mentor waiting
-- at a trailhead. Those want different follow-up and say different things about a camp.
--
-- It is also the only exit that can happen to somebody who cleared every requirement: they
-- paid, signed, screened, matched, and got a welcome packet. Everything upstream worked and
-- they still did not come, which is worth being able to count separately.

alter table registrations
  drop constraint registrations_exit_reason_known;

alter table registrations
  add constraint registrations_exit_reason_known check (
    exit_reason is null or exit_reason in (
      'denied_at_review',
      'screening_declined',
      'removed_for_conduct',
      'never_registered',
      'never_paid',
      'stopped_responding',
      'cannot_make_it',
      'withdrew_after_paying',
      'no_show'
    )
  );
