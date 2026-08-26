import { TODAY } from '@/data/purchase-orders';
import { currentSession } from '@/lib/auth';
import { listPurchaseOrders } from '@/lib/store';

/** The live store as JSON. A route handler because middleware's Edge sandbox cannot see it. */
export const dynamic = 'force-dynamic';

export async function GET() {
  // The gate matching how every mutation in app/actions.ts
  // re-checks rather than trusting middleware. The matcher already 307s an
  // anonymous caller, but a matcher is one regex: narrow it to skip static
  // assets and this route would hand the whole book to an anonymous curl while
  // every page stayed gated and every test stayed green.
  if (!(await currentSession())) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  return Response.json(
    { today: TODAY, purchaseOrders: listPurchaseOrders() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
