# Registration

## Sub-features

- Four steps: camp details, a before-camp survey, commitments and consent with the waiver,
  and payment.
- Token-gated. `GET /api/register?token=` refuses anyone whose registration is not
  `approved`, and reports `already_registered` for someone who finished.
- Minor and guardian handling, including a nullable email for a minor and a second survey
  answered on the minor's behalf.
- Waiver with a full audit trail: text, typed signature, timestamp, IP, and a PDF.
- The waiver checkbox stays disabled until the waiver is scrolled to the bottom.
- The step 4 total adds the camp fee and, where one is owed, the background check fee.
- Mentors are asked their shirt size rather than charged.
- Submitting creates the registration and redirects to Stripe Checkout.

## How to get to it (user POV)

The approval email carries a tokenised link. There is no other way in.

```
http://localhost:3000/events/zz-test-fixture-camp/register?token=zz-fixture-invited
```

Ivy Invited is the fixture person who exists for this. Everyone else is past it.

## Driving it with the Browser pane

No session needed. Navigate to Ivy's URL, then use `read_page` to get refs and `form_input`
to fill fields. Each step's heading is an `h2`: Camp Details or Your Details, Before Camp,
Commitments, Payment.

Advance with the Next button. It is a plain `button`, never a submit, so pressing Enter in a
field does not skip a step.

To prove a step refuses to advance, click Next with a required field empty and read the
message back. It names what is missing.

## Gotchas

- The token is one use in effect: once Ivy registers, the API answers `already_registered`
  and the form will not open again. Re-run `npm run fixture -- reset` before a second pass.
- Stripe Checkout carries an invisible hCaptcha. Stop at the redirect. A person completes
  payment by hand with a test card, and the webhook does the rest. Say so in the report.
- The page is client-rendered. A `200` from the route proves nothing; read the heading.
- `slug` in the URL is decoration. The form loads from the token, so a wrong slug still
  works and will hide a broken link.
- Fixture registrations carry no `stripe_payment_id` on purpose, so a refund correctly
  reports that it cannot run automatically.
