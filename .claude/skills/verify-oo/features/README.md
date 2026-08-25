# Feature map

What a person can actually do in this app, and how to drive each one. The map is the
maintained source for verification: a proof that drives one convenient entry point is
incomplete when the map lists others.

| Feature | File | Surface |
|---|---|---|
| Camp admin board | [camp-board.md](camp-board.md) | `/admin/events/<id>` |
| Registration | [registration.md](registration.md) | `/events/<slug>/register?token=` |
| Background screening | [background-screening.md](background-screening.md) | `/admin/events/<id>` |
| Welcome packet | [welcome-packet.md](welcome-packet.md) | `/admin/events/<id>` |
| Waitlist | [waitlist.md](waitlist.md) | `/events/<slug>` |

Not mapped yet, and worth adding when something touches them: donations and the Stripe
donation webhook, the mentee nurture sequence, pre and post camp surveys, partner events,
admin invites and roles, the Sanity Studio at `/admin/studio`, and the marketing pages.

## Keeping it honest

When a run fails because the app moved rather than because the app broke, fix the feature
file in the same session and say that is what happened. Do not quietly rewrite a file to
match whatever the app does now: that turns the map into a mirror instead of a check.
