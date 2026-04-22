# TODO

*Nothing currently outstanding.*

## Completed

### ~~Event date display off by one day in Eastern Time~~ (fixed in 371caec)

Sanity date-only values stored as midnight UTC in `timestamptz` columns
caused all frontend renders to shift dates back a day in non-UTC browsers.
Fixed by adding a shared `formatEventDateRange` helper at
`src/lib/format-event-date.ts` that pins all date formatting to
`timeZone: "UTC"`. Applied to admin events list, admin event detail,
public events grid, and public event detail page.
