import Link from 'next/link';

import type { PurchaseOrder } from '@/data/purchase-orders';
import { StatusIndicator } from '@/components/status-indicator';
import { TransitionForm } from '@/components/transition-form';
import { formatDateShort, formatUnits, formatUsd } from '@/lib/dates';
import {
  attentionFor,
  byUrgency,
  isViewKey,
  matchesView,
  milestoneFor,
  orderValueUsd,
  totalUnits,
  VIEWS,
  type ViewKey,
} from '@/lib/derived';
import { primaryMove } from '@/lib/status';
import { listPurchaseOrders } from '@/lib/store';

/**
 * The working list.
 *
 * Filtering is a URL search param read on the server.
 * The views are `<Link>`s and the page re-renders on the server, so a client who
 * lives in the dashboard can bookmark the view they work from.
 */
export default async function PurchaseOrderListPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: requestedView } = await searchParams;
  const view: ViewKey = requestedView && isViewKey(requestedView) ? requestedView : 'all';

  const all = listPurchaseOrders();
  const rows = all.filter((po) => matchesView(po, view)).sort(byUrgency);

  return (
    <div className="space-y-5">
      <nav aria-label="Views" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {VIEWS.map((definition) => {
          const count = all.filter((po) => matchesView(po, definition.key)).length;
          const active = definition.key === view;

          return (
            <Link
              key={definition.key}
              href={definition.key === 'all' ? '/' : `/?view=${definition.key}`}
              aria-current={active ? 'page' : undefined}
              data-testid={`view-${definition.key}`}
              className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-900 ring-1 ring-slate-200 ring-inset hover:bg-slate-50'
              }`}
            >
              <span className="numeric block text-2xl leading-none font-semibold tracking-tight">
                {count}
              </span>
              <span className="mt-2 block text-xs font-semibold">{definition.label}</span>
              <span
                className={`mt-0.5 block text-2xs ${active ? 'text-slate-300' : 'text-slate-500'}`}
              >
                {definition.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <h1 className="page-title">
            {VIEWS.find((definition) => definition.key === view)?.label}
          </h1>
          <div className="flex items-baseline gap-4">
            <p className="text-xs text-slate-500">
              {rows.length} {rows.length === 1 ? 'order' : 'orders'} &middot; most urgent first
            </p>
            <Link
              href="/purchase-orders/new"
              data-testid="new-po"
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
            >
              New PO
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            No purchase orders match this view.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th scope="col" className="section-title py-2 pr-3 pl-4">
                    PO
                  </th>
                  <th scope="col" className="section-title px-3 py-2">
                    Status
                  </th>
                  <th scope="col" className="section-title px-3 py-2">
                    Vendor &amp; lane
                  </th>
                  <th scope="col" className="section-title px-3 py-2">
                    Next date
                  </th>
                  <th scope="col" className="section-title px-3 py-2 text-right">
                    Units
                  </th>
                  <th scope="col" className="section-title px-3 py-2 text-right">
                    Value
                  </th>
                  <th scope="col" className="section-title py-2 pr-4 pl-3">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((po) => (
                  <PurchaseOrderRow key={po.poNumber} po={po} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Urgency reads as colour on the date.
 *
 * Both shades clear WCAG AA on white at this size; the lighter -500 and -600
 * steps of each hue do not.
 */
const ATTENTION_TEXT = {
  critical: 'text-rose-700',
  warning: 'text-amber-700',
} as const;

function PurchaseOrderRow({ po }: { po: PurchaseOrder }) {
  const attention = attentionFor(po);
  const milestone = milestoneFor(po);
  const move = primaryMove(po);

  return (
    <tr
      data-testid={`po-row-${po.poNumber}`}
      className="border-b border-slate-100 align-top transition-colors last:border-0 hover:bg-slate-50/70"
    >
      <td className="py-3 pr-3 pl-4">
        <Link
          href={`/purchase-orders/${po.poNumber}`}
          className="numeric font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          {po.poNumber}
        </Link>
        <span className="mt-0.5 block text-xs text-slate-500">{po.brand}</span>
      </td>

      <td className="px-3 py-3">
        <StatusIndicator status={po.status} />
      </td>

      <td className="px-3 py-3">
        <span className="block text-slate-800">{po.vendor}</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {po.originPort} &rarr; {po.destinationPort}
        </span>
      </td>

      <td className="numeric px-3 py-3 whitespace-nowrap">
        <span className="block text-slate-800">
          <span className="text-slate-500">{milestone.label}</span>{' '}
          {milestone.date ? formatDateShort(milestone.date) : 'Not set'}
        </span>
        {attention ? (
          <span
            data-testid="attention"
            className={`mt-0.5 block text-xs font-semibold ${ATTENTION_TEXT[attention.level]}`}
          >
            {attention.label}
          </span>
        ) : milestone.offset ? (
          <span className="mt-0.5 block text-xs text-slate-500">{milestone.offset}</span>
        ) : null}
      </td>

      <td className="numeric px-3 py-3 text-right whitespace-nowrap text-slate-700">
        {formatUnits(totalUnits(po))}
      </td>

      <td className="numeric px-3 py-3 text-right whitespace-nowrap text-slate-900">
        {formatUsd(orderValueUsd(po))}
      </td>

      <td className="py-3 pr-4 pl-3">
        {move ? (
          <TransitionForm
            poNumber={po.poNumber}
            kind={move.kind}
            label={move.label}
            variant="primary"
          />
        ) : (
          <span className="text-xs text-slate-500">Closed</span>
        )}
      </td>
    </tr>
  );
}
