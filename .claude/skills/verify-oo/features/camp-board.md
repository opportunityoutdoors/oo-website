# Camp admin board

## Sub-features

- Seven position columns: Waitlist, Invited, Registered, Ready, Attended, Turned away,
  Dropped out. One person sits in exactly one column, decided by `position()` in
  [src/lib/camp-pipeline.ts](../../../../src/lib/camp-pipeline.ts).
- Drag and drop between columns, with no menu fallback.
- Ready refuses drops. It is computed from cleared and matched, never assigned.
- Requirement badges on each card: waiver, paid, check. Hidden on past camps.
- Categorised exit: dragging to Turned away or Dropped out opens a dialog that requires a
  reason before the move commits.
- A transition timeline per person, and per-person history on the contact profile.
- Table view under the All tab with its own sorting, filtering and bulk actions.
- Matching and Stats tabs.

## How to get to it (user POV)

Sign in at `/admin`, open Events, pick the camp. The board is the top of the event page,
above the tabs. `doctor` prints the fixture camp's board URL.

## Driving it with the Browser pane

Sign in with `bin/admin-session.mjs --js`, then navigate to the board URL.

Read the whole board in one call:

```js
JSON.stringify([...document.querySelectorAll('div.min-w-\\[150px\\]')].map(c=>({
  col: c.querySelector('span')?.textContent,
  cards: [...c.querySelectorAll('[draggable="true"]')].map(d=>d.textContent)
})))
```

Move a card with the dragstart, wait, dragover, drop sequence in the skill body. Confirm
against `snapshot.mjs`, not against the column counts.

For an exit, drop onto Turned away or Dropped out, then drive the dialog that opens: pick a
reason and confirm. The move does not commit until the dialog does.

## Gotchas

- A drop dispatched in the same tick as its dragstart does nothing, silently. Wait between
  them.
- `left_click_drag` does not start an HTML5 drag. It fails without an error.
- Ready is not droppable and the board refuses the drop locally, so no request is sent. That
  is correct, not a failure.
- Fixture people start spread across the columns on purpose. Take a `before` snapshot rather
  than assuming a starting layout.
- `npm run fixture -- reset` gives every person a new id, so a board URL from an earlier run
  will 404.
