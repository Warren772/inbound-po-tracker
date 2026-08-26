import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { PurchaseOrder } from '@/data/purchase-orders';
import { StatusIndicator } from '@/components/status-indicator';
import { TransitionForm } from '@/components/transition-form';
import { daysBetween, formatDate, formatUnits, formatUsd } from '@/lib/dates';
import {
  attentionFor,
  daysAtSea,
  orderValueUsd,
  totalUnits,
} from '@/lib/derived';
import { EXCEPTION_CODES, EXCEPTION_LABEL, movesFor, STATUS_LABEL } from '@/lib/status';
import { getPurchaseOrder } from '@/lib/store';

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ poNumber: string }>;
}) {
  const { poNumber } = await params;
  const po = getPurchaseOrder(decodeURIComponent(poNumber));

  if (!po) notFound();

  const attention = attentionFor(po);

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-xs text-slate-600 hover:text-slate-900">
        &larr; All purchase orders
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-white px-5 py-4 ring-1 ring-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="numeric text-lg font-semibold tracking-tight text-slate-900">
              {po.poNumber}
            </h1>
            <StatusIndicator status={po.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {po.brand} &middot; {po.vendor}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {po.originPort} &rarr; {po.destinationPort}
          </p>
        </div>

        <dl className="flex gap-8 text-right">
          <div>
            <dt className="text-xs tracking-wide text-slate-500 uppercase">Units</dt>
            <dd className="numeric mt-0.5 text-base font-semibold text-slate-900">
              {formatUnits(totalUnits(po))}
            </dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-slate-500 uppercase">Order value</dt>
            <dd className="numeric mt-0.5 text-base font-semibold text-slate-900">
              {formatUsd(orderValueUsd(po))}
            </dd>
          </div>
        </dl>
      </header>

      {attention && po.exception === null ? (
        <p
          data-testid="attention-banner"
          className={`rounded-lg px-4 py-3 text-sm leading-relaxed ring-1 ring-inset ${
            attention.level === 'critical'
              ? 'bg-rose-50 text-rose-900 ring-rose-200'
              : 'bg-amber-50 text-amber-900 ring-amber-200'
          }`}
        >
          <span className="block max-w-[70ch]">
            <span className="font-semibold">{attention.label}.</span> {attention.detail}
          </span>
        </p>
      ) : null}

      {po.exception ? (
        <section className="rounded-lg bg-white p-5 ring-1 ring-rose-200">
          <h2 className="text-sm font-semibold text-rose-900">
            {EXCEPTION_LABEL[po.exception.code]}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Raised {formatDate(po.exception.raisedOn)} from{' '}
            {STATUS_LABEL[po.exception.raisedFrom].toLowerCase()}. Clearing it returns the PO to{' '}
            {STATUS_LABEL[po.exception.raisedFrom].toLowerCase()}.
          </p>
          <p className="mt-3 max-w-[70ch] border-l-2 border-rose-200 pl-3 text-sm leading-relaxed text-slate-700">
            {po.exception.note}
          </p>
        </section>
      ) : null}

      <ActionPanel po={po} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Timeline po={po} />
        <Shipment po={po} />
      </div>

      <LineItems po={po} />
    </div>
  );
}

/**
 * Every move the machine knows about for this status, legal or not.
 *
 * Blocked moves are rendered with their reason rather than hidden. A confirmed
 * PO five days from its booked ETA that never sailed is exactly the record
 * somebody will try to receive, and "Receiving unlocks once the PO sails" on the
 * page beats a failed click and a guess.
 */
function ActionPanel({ po }: { po: PurchaseOrder }) {
  const moves = movesFor(po);
  const flag = moves.find((move) => move.kind === 'flag' && move.guard.ok);
  const lane = moves.filter((move) => move.kind !== 'flag');

  return (
    <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">Move this PO</h2>

      {moves.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          Received {po.receivedOn ? formatDate(po.receivedOn) : ''}. This PO is closed and has no
          transitions left.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-start gap-6">
          {lane.map((move) =>
            move.guard.ok ? (
              <div key={move.kind}>
                <TransitionForm
                  poNumber={po.poNumber}
                  kind={move.kind}
                  label={move.label}
                  variant="primary"
                />
                <p className="mt-1.5 text-xs text-slate-500">&rarr; {move.to}</p>
              </div>
            ) : (
              <div key={move.kind} className="max-w-xs">
                <button
                  type="button"
                  disabled
                  data-testid={`blocked-${move.kind}`}
                  className="cursor-not-allowed rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-400"
                >
                  {move.label}
                </button>
                <p className="mt-1.5 text-xs text-slate-500">{move.guard.reason}</p>
              </div>
            ),
          )}
        </div>
      )}

      {flag ? (
        <details className="mt-5 border-t border-slate-100 pt-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
            Something is wrong with this PO
          </summary>
          <div className="mt-3 max-w-md">
            <TransitionForm
              poNumber={po.poNumber}
              kind="flag"
              label="Raise exception"
              variant="quiet"
            >
              <label className="block text-xs font-medium text-slate-600">
                Type
                <select
                  name="exceptionCode"
                  defaultValue="customs_hold"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                >
                  {EXCEPTION_CODES.map((code) => (
                    <option key={code} value={code}>
                      {EXCEPTION_LABEL[code]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                What happened
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Container pulled for CBP exam at Savannah…"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </label>
            </TransitionForm>
          </div>
        </details>
      ) : null}
    </section>
  );
}

function Timeline({ po }: { po: PurchaseOrder }) {
  const steps: { label: string; date: string | null; projected?: boolean }[] = [
    { label: 'Ordered', date: po.orderedOn },
    { label: 'Confirmed by vendor', date: po.confirmedOn },
    { label: 'Sailed from origin', date: po.shippedOn },
    { label: po.receivedOn ? 'Booked ETA' : 'ETA at destination', date: po.etaOn, projected: true },
    { label: 'Received at DC', date: po.receivedOn },
  ];

  let previousStepDate: string | null = null;

  return (
    <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">Timeline</h2>
      <ol className="mt-3">
        {steps.map((step) => {
          const gap =
            step.date && previousStepDate ? daysBetween(previousStepDate, step.date) : null;
          previousStepDate = step.date;

          return (
            <li key={step.label} className="flex items-baseline gap-3 py-1.5">
              <span
                aria-hidden
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  step.date
                    ? step.projected && !po.receivedOn
                      ? 'ring-2 ring-slate-400 ring-inset'
                      : 'bg-slate-900'
                    : 'bg-slate-200'
                }`}
              />
              <span className={`text-sm ${step.date ? 'text-slate-800' : 'text-slate-500'}`}>
                {step.label}
              </span>
              <span className="numeric ml-auto text-sm whitespace-nowrap text-slate-700">
                {step.date ? formatDate(step.date) : 'Not set'}
              </span>
              <span className="numeric w-16 shrink-0 text-right text-xs whitespace-nowrap text-slate-500">
                {gap === null ? '' : `+${gap}d`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Shipment({ po }: { po: PurchaseOrder }) {
  const atSea = daysAtSea(po);

  return (
    <section className="h-fit rounded-lg bg-white p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">Shipment</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <Fact label="Vessel" value={po.vessel} />
        <Fact label="Container" value={po.containerNumber} mono />
        <Fact label="Load port" value={po.originPort} />
        <Fact label="Discharge" value={po.destinationPort} />
        <Fact
          label={po.receivedOn ? 'Total transit' : 'Days at sea'}
          value={atSea === null ? null : `${atSea} days`}
        />
      </dl>
      {po.vessel === null && po.status !== 'received' ? (
        <p className="mt-4 text-xs text-slate-500">
          No booking on file. Vessel and container land here once the carrier confirms.
        </p>
      ) : null}
    </section>
  );
}

function Fact({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-slate-500">{label}</dt>
      <dd
        className={`text-right ${
          value ? `text-slate-800 ${mono ? 'numeric font-mono text-xs' : ''}` : 'text-slate-500'
        }`}
      >
        {value ?? 'Not set'}
      </dd>
    </div>
  );
}

function LineItems({ po }: { po: PurchaseOrder }) {
  return (
    <section className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
      <h2 className="border-b border-slate-200 px-5 py-3 text-xs font-medium tracking-wide text-slate-500 uppercase">
        Line items
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
              <th scope="col" className="py-2 pr-3 pl-5 font-medium">
                SKU
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Qty
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Unit
              </th>
              <th scope="col" className="py-2 pr-5 pl-3 text-right font-medium">
                Extended
              </th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((line) => (
              <tr key={line.sku} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-3 pl-5">
                  <span className="numeric font-mono text-xs text-slate-900">{line.sku}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{line.description}</span>
                </td>
                <td className="numeric px-3 py-2.5 text-right whitespace-nowrap text-slate-700">
                  {formatUnits(line.quantity)}
                </td>
                <td className="numeric px-3 py-2.5 text-right whitespace-nowrap text-slate-700">
                  ${line.unitCostUsd.toFixed(2)}
                </td>
                <td className="numeric py-2.5 pr-5 pl-3 text-right whitespace-nowrap text-slate-900">
                  {formatUsd(line.quantity * line.unitCostUsd)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-medium">
              <td className="py-2.5 pr-3 pl-5 text-slate-600">
                {po.lines.length} {po.lines.length === 1 ? 'line' : 'lines'}
              </td>
              <td className="numeric px-3 py-2.5 text-right text-slate-900">
                {formatUnits(totalUnits(po))}
              </td>
              <td />
              <td className="numeric py-2.5 pr-5 pl-3 text-right text-slate-900">
                {formatUsd(orderValueUsd(po))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
