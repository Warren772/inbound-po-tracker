## Domain

An inbound purchase order or shipment tracker for a home textiles importer. Goods are manufactured overseas and shipped by sea to a US East Coast distribution center. The user is an operations coordinator who needs to see which POs are in flight, which have landed, and which need attention.

Do not go out of scope this is a demonstration UI application that emphasizes performant rendering for dynamic UI states.

## Stack

- Next.js 15, App Router
- TypeScript, strict: true
- Tailwind CSS
- No database. No auth. No state management library. No UI component library.

Do not add dependencies. The only exception is Playwright, already planned for a single E2E testing spec.

## Architecture rules
1. Server components by default. A component becomes "use client" only when it needs user interaction that cannot be expressed as a form posting to a server action. 

2. Each client component is a deliberate choice, if you add one, note why in the PR description.

3. Data fetching happens in server components, not in effects or route handlers. There is no API layer in this app pages read the seed module directly.

4. Mutations go through server actions in `app/actions.ts`, and call `revalidatePath` so the UI reflects the change.

## Data
Seed data is hand written and committed at `data/purchase-orders.ts`, typed against an exported interface. It is imported directly and not read from disk at request time.

**Do not generate this data randomly or with a faker library**. The records are created so the client can observe the interesting distribution states. 

Random data produces incoherent records (receive dates before ship dates) and buries the states that matter.


## Data conventions:
- Dates are ISO date strings in the seed. The client should render this in a user readable format. Beware of formatting a Date differently on server and client to cause hydration mismatches.
- "Now" comes from a fixed TODAY constant, never new Date(). 
- Sea transit Asia -> US East Coast runs roughly 30-40 days. Keep ship and ETA dates internally consistent.
- Vendor origins, ports, brands, and line items should be plausible for the domain.

## Status model
A PO moves through: `draft -> confirmed -> in_transit -> received` with exception reachable from `confirmed` or `in_transit`.

The server action advances a PO through this state machine and validates the transition. You cannot receive a PO that never shipped. 

- Invalid transitions return an error the UI surfaces rather than throwing errors.

- Status values live in one place as a union type. 

- No stringly-typed statuses scattered across components.

## Persistence
The server action creates an in-memory copy of the seed. This is a workaround for a real datastore as this is a UI demo. 

Do not add a database, an ORM, or file writes to make this "real." 

## Code organization
- `app/` - routes, layouts, server actions
- `components/` - presentational components
- `data/` - seed data and its types
- `lib/` - status machine, date helpers

## Rules:
- No re-exports.
- No code abstractions until the second use.
- No premature generics. Concrete types until something actually varies.
- Create a component within its route if it's used by exactly one route.

## Testing
One Playwright E2E spec covering the primary path: load the list, open a PO detail route, fire the status transition, assert the new status renders.

- Do not expand this into a suite.

- Assert on rendered content. No setTimeout

- Reset mutated state in a fixture so repeat local runs don't fail.

## CI
One GitHub Actions workflow on push and pull_request: install, tsc --noEmit, next lint, next build, then the Playwright spec.

Deployment is out of scope. Verify commits via local testing before committing. 

## Working style
- Small, reviewable changes. Feature-sized PRs, each one merged before the next starts.
- Explain trade-offs before implementing anything structural. I want the decision, not just the diff.
- If the brief is ambiguous, state the assumption in the README rather than guessing silently.
- Push back if I ask for something that contradicts the scope rules above.
