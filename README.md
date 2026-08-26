# Inbound PO Tracker

Inbound purchase orders for a home textiles importer goods manufactured in Asia,
shipped by sea to a US East Coast DC. The client is an operations coordinator and their daily workflow relies on this dashboard. 

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npx playwright test
```

## What the UI is optimized for

The job is moving POs through states and observing preexisting states. 

- **The list is filtered by triage.** Rows sort by urgency. Exceptions
  and overdue containers first, closed POs last.
- **Status has a visual indicator.** A tinted indicator per row, coupled
  with a colored text for urgency. 
- **Transitions fire from the row.** Each row carries its one legal next move
  (`Confirm`, `Mark shipped`, `Receive`, `Clear exception`).
- **Blocked moves are shown with their reason.** For example, `PO-2026-0961` is five
  days from its booked ETA and never sailed and its detail page renders a disabled
  `Receive` state.

## Architecture

**Four client components**
[components/transition-form.tsx](components/transition-form.tsx),
[create-form.tsx](app/purchase-orders/new/create-form.tsx),
[edit-form.tsx](app/purchase-orders/%5BpoNumber%5D/edit/edit-form.tsx) and
[delete-form.tsx](app/purchase-orders/%5BpoNumber%5D/edit/delete-form.tsx). 
Every mutation is a form posting to a server action.

**Editing and the status machine own disjoint fields.** No input on the edit
form writes `status`, `confirmedOn`, `shippedOn` or `receivedOn`

**Filtering is a URL search param** The view tiles are `<Link>`s and the list re-renders on the server.

**The state machine is one module.** [lib/status.ts](lib/status.ts) owns the
transitions, the guards and the labels. 
`guard()` answers reconciles the UI and server action.

**Nothing derived is stored.** "Overdue", "arriving", "unconfirmed 50d" and order
value are computed in [lib/derived.ts](lib/derived.ts). 

**Dates are formatted with a hard-coded locale and UTC.** ISO calendar strings
are parsed as UTC midnight and rendered through a pinned `Intl` formatter, so the
server and the browser produce the same string and React reports no hydration
mismatch.

### Layout

```
app/            routes, layout, server actions
components/     ui components shared by both routes
data/           handcrafted synthetic seed
lib/            business logic: state machine, date helpers, derived state, in-memory store
e2e/            one Playwright test
```

## Persistence

[lib/store.ts](lib/store.ts) holds a module-level deep copy of the seed, mutated
by the server action. It lives as long as the Node process and resets on restart.
No database, no ORM, no file writes. The copy hangs off `globalThis` so the dev
server's hot reload does not silently discard it mid-session.

A PO raised in the app lives in that same copy, so it survives navigation and
disappears on reset or restart along with every other mutation.

"Reset demo data" in the header restores the seed. It is a real feature of a demo
whose state is in memory, and it is also the hook the Playwright fixture uses, so
repeat local runs are deterministic without a test-only back door.

## Assumptions

Stated here rather than guessed silently:

- The list defaults to all POs that are sorted by urgency.
- **`Mark shipped` records only the ship date.** Vessel, container and a booked
  ETA come from the carrier, so the action does not invent them.
- **`Clear exception` returns the PO to `exception.raisedFrom` and drops the
  exception record.** No logging or long-term storage.
- **Raising an exception requires a note.** It is the only field the next person
  to open the PO actually needs, so the action rejects an empty one.
- **A received PO is never flagged.** PO-2026-0925 landed four days after its
  ETA. 
- **Light theme only.**
- **A new PO is always a `draft`,** with every downstream date null. `draft` is
  the state machine's entry edge, so the create form has no status field.
- **The PO number is typed in, not generated.** It is the ERP's identity and it
  doubles as the route segment.
- **Editing is scoped by status.** A draft is fully editable. Anything
  `confirmed`, `in_transit` or `exception` exposes only the carrier's booking —
  ETA, vessel, container.
- **Only a draft can be deleted.** Nothing outside the app depends on a draft.

## Testing

One spec, [e2e/purchase-orders.spec.ts](e2e/purchase-orders.spec.ts), with two
tests. The primary path: load the list, open PO-2026-0948 (in transit, 16 days
overdue), receive it, assert the status renders as `Received` on the detail page
and on the list behind it. The CRUD round trip: raise a draft, edit a commercial
field, a line quantity and the ETA in one save, confirm a confirmed PO offers no
delete, then delete the draft and confirm the row is gone.

Both assert on rendered content and contain no timeouts. They share the reset
fixture.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on push and pull
request: install, `tsc --noEmit`, `next lint`, `next build`, then the spec.
Deployment is out of scope.
