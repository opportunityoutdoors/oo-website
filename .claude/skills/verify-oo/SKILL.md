---
name: verify-oo
description: Drive the real Opportunity Outdoors site and admin in a browser against the ZZ TEST fixture camp, and capture evidence that a change works. Use before reporting any task complete, and whenever a claim needs proof rather than a passing build.
---

# Verify Opportunity Outdoors

The surface is a web app: the public marketing site, and the admin at `/admin` that carries
the camp workflow. You drive it with the Browser pane tools (`mcp__Claude_Browser__*`)
against a local dev server, using the ZZ TEST fixture camp as the data.

Read [TESTING.md](../../../TESTING.md) once before your first run. This skill is layer 2 of
what that file describes, made scriptable.

## Read this before you touch anything

**The dev server talks to production Supabase, production Sanity, and production Resend.**
There is no staging database. What protects real people is the fixture camp, not the
environment:

- Touch only rows belonging to **ZZ TEST Fixture Camp** and the nine `zz.*` contacts.
- Never drag, edit, or delete a card in any other event.
- Anything that sends mail sends real mail, to the `FIXTURE_EMAIL` inbox. That is fine for
  fixture people and unacceptable for anyone else.
- Stripe is in test mode locally. `doctor` refuses to pass on a live key.

## Launch

```bash
npm run fixture -- status
```

If the fixture camp is absent, create it:

```bash
npm run fixture -- create
```

Start the dev server through the Browser pane, never through Bash:

`mcp__Claude_Browser__preview_start` with `{"name": "dev"}`. It reads
[.claude/launch.json](../../launch.json), runs `npm run dev` on port 3000, and returns a
`serverId` (for teardown) and a `tabId` (for driving). It is ready when `doctor` reports the
dev server line, which takes about 8 seconds on a cold start.

Teardown is `mcp__Claude_Browser__preview_stop` with that `serverId`. See Cleanup.

## Doctor

Run this first, every run, and again whenever anything looks off:

```bash
node .claude/skills/verify-oo/bin/doctor.mjs
```

Read-only. It prints what it actually saw, and exits non-zero on any failure:

- which Supabase project the env points at, expecting `ffivubkouyqzvebuxflf`
- that `STRIPE_SECRET_KEY` is `sk_test_`, refusing to continue on a live key
- that `FIXTURE_EMAIL` is set, because unset means fixture mail hard bounces onto Resend's
  suppression list
- the git sha and whether the tree is dirty, so you know which build you are driving
- that port 3000 answers **and the page names Opportunity Outdoors**, which is what proves
  the port is ours rather than another Next app
- the fixture camp, its board URL, and every person's status and registration token

## Drive

### Signing into the admin

`/admin/*` sits behind Supabase Auth. Nobody types a password. The helper mints a real
session with the service role and prints it as a cookie the browser can hold:

```bash
node .claude/skills/verify-oo/bin/admin-session.mjs --js
```

Paste that one line into `mcp__Claude_Browser__javascript_tool` on a tab already on
`http://localhost:3000`, then navigate to the admin URL. The session is the same one the
login form produces, so the middleware and every server component accept it. It lasts an
hour. Pass an email as the first argument to sign in as a different board member.

### Handles

The admin has no test ids. These selectors are stable because they follow the layout, not
the styling of one element:

| Thing | Handle |
|---|---|
| A board column | `[...document.querySelectorAll('div.min-w-\\[150px\\]')]`, matched on its `span` label |
| A card | `[draggable="true"]`, matched on the person's name in `textContent` |
| Column labels | Waitlist, Invited, Registered, Ready, Attended, Turned away, Dropped out |
| A tab | button text: All, Matching, Stats |

### Dragging a card

The board is drag and drop with no menu fallback, and `left_click_drag` will not move a
card: the HTML5 drag never starts. Dispatch the drag events instead, **with a wait between
dragstart and drop**. React holds the dragged card in state, and a drop in the same tick
reads a stale closure and silently does nothing, which looks exactly like a passing test.

```js
(async()=>{
  const col=n=>[...document.querySelectorAll('div.min-w-\\[150px\\]')].find(c=>c.querySelector('span')?.textContent===n);
  const card=n=>[...document.querySelectorAll('[draggable="true"]')].find(d=>d.textContent.includes(n));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const c=card('Ada Ready'), t=col('Attended');
  if(!c||!t) return 'handle not found';
  const ev=k=>new DragEvent(k,{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()});
  c.dispatchEvent(ev('dragstart')); await wait(100);
  t.dispatchEvent(ev('dragover')); await wait(50);
  t.dispatchEvent(ev('drop'));     await wait(1500);
  return JSON.stringify([...document.querySelectorAll('div.min-w-\\[150px\\]')]
    .map(x=>({col:x.querySelector('span')?.textContent,n:x.querySelectorAll('[draggable="true"]').length})));
})()
```

This fires the app's own drop handler and its real `POST /api/admin/registrations/move`. It
does not exercise the operating system's drag, so it cannot catch a broken `draggable`
attribute. Confirm the card is draggable by reading the attribute, and confirm the move by
the database, never by the returned column counts alone.

### Everything else

Prefer `read_page` for structure and text, `computer` for clicks and typing, `form_input`
for fields. Use `read_network_requests` to confirm the request the UI claims to have made,
and `read_console_messages` and `preview_logs` for errors. Public pages need no session.

Per-feature routes, entry points and traps live in [features/](features/README.md). Read the
feature file before driving that feature.

## Evidence

Put every artifact in `.verify/<run-label>/`, which is gitignored and survives teardown.

Take a database snapshot before and after any action that should change state:

```bash
node .claude/skills/verify-oo/bin/snapshot.mjs before .verify/board-move
# drive the app
node .claude/skills/verify-oo/bin/snapshot.mjs after  .verify/board-move
```

Each snapshot writes the fixture event, all nine people with their status, payment, waiver,
match, exit reason and screening status, and every `registration_events` row. The diff
between the two is the proof.

What counts as proof here:

- **Drive the real user path.** Sign in as an admin and drag the card. Do not call
  `/api/admin/registrations/move` with curl and call the board verified.
- **Capture the action and the resulting state**, not just the final screen. A snapshot pair
  plus the network request beats a screenshot of a board that could have rendered from
  stale props.
- **Check the side effect, not the attempt.** A `200` from a client-rendered page proves the
  shell loaded. `sent: 1` proves we called Resend. Confirm the row changed, the timeline row
  appeared, the mail arrived in the `FIXTURE_EMAIL` inbox.
- **Mock nothing.** Every external system this app touches already has a fixture-safe
  boundary: Stripe is in test mode, VolunteerBadge is in sandbox, fixture registrations
  carry no `stripe_payment_id` so the refund path cannot reach a real payment intent.
- **Stripe Checkout stops the browser run.** It carries an invisible hCaptcha, so a person
  completes that one step by hand with a test card. Verify up to the redirect and after the
  webhook, and say in your report that the middle step was manual.
- Screenshots from `computer` are visible in the session but are not files. When a change is
  visual, take one, and also write the page text or `outerHTML` into the run directory so
  the evidence outlives the conversation.

## Cleanup

In this order:

```bash
npm run fixture -- reset      # discards every change you made to fixture rows
```

Then `mcp__Claude_Browser__preview_stop` with the `serverId` **you** got from
`preview_start`. Never kill by process name or by port: another session may own it.

`reset` rebuilds the camp with new ids, so take your snapshots before you run it. Cleanup
never touches `.verify/`; the evidence stays.

If a run leaves fixture rows in a strange state and `reset` fails, `npm run fixture -- destroy`
then `create`. Both only ever match `+fixture@opportunityoutdoors.org` addresses and the
fixture event title, so neither can reach a real registrant.

## Helpers

| Script | Invocation |
|---|---|
| Doctor | `node .claude/skills/verify-oo/bin/doctor.mjs` |
| Admin session | `node .claude/skills/verify-oo/bin/admin-session.mjs [email] [--js]` |
| Database snapshot | `node .claude/skills/verify-oo/bin/snapshot.mjs <label> [runDir]` |

All three read `.env.local` through dotenv and are project-scoped by that alone. None of
them accept a URL or a key argument, so none can be pointed at another account.
