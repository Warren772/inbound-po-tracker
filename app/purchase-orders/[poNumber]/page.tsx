import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { PurchaseOrder } from '@/data/purchase-orders';
import { StatusIndicator, STATUS_DOT } from '@/components/status-indicator';
import { TransitionForm } from '@/components/transition-form';
import { daysBetween, formatDate, formatUnits, formatUsd } from '@/lib/dates';
import {
  attentionFor,
  daysAtSea,
  orderValueUsd,
  totalUnits,
} from '@/lib/derived';
import {
  editScope,
  EXCEPTION_CODES,
  EXCEPTION_LABEL,
  movesFor,
  STATUS_LABEL,
} from '@/lib/status';
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
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="inline-block text-xs text-slate-600 hover:text-slate-900">
          &larr; All purchase orders
        </Link>
        {editScope(po) === 'none' ? null : (
          <Link
            href={`/purchase-orders/${po.poNumber}/edit`}
            data-testid="edit-po"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            Edit
          </Link>
        )}
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-white px-5 py-4 ring-1 ring-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title numeric">
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
            <dt className="section-title">Units</dt>
            <dd className="numeric mt-0.5 text-base font-semibold text-slate-900">
              {formatUnits(totalUnits(po))}
            </dd>
          </div>
          <div>
            <dt className="section-title">Order value</dt>
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
          <h2 className="section-title text-rose-900">
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
      <h2 className="section-title">Move this PO</h2>

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

/**
 * Where each status sits on the five milestones below.
 *
 * `received` is the last of them rather than the fourth: a received PO has its
 * booked ETA behind it, and the ETA is a projection the receipt supersedes.
 */
const STAGE_INDEX: Record<'draft' | 'confirmed' | 'in_transit' | 'received', number> = {
  draft: 0,
  confirmed: 1,
  in_transit: 2,
  received: 4,
};

/**
 * 
 * The pulse is one CSS animation on one element, transform and opacity only, so
 * a live PO costs the same to render as a closed one.
 */
function Timeline({ po }: { po: PurchaseOrder }) {
  const steps: { label: string; date: string | null; projected?: boolean }[] = [
    { label: 'Ordered', date: po.orderedOn },
    { label: 'Confirmed by vendor', date: po.confirmedOn },
    { label: 'Sailed from origin', date: po.shippedOn },
    { label: po.receivedOn ? 'Booked ETA' : 'ETA at destination', date: po.etaOn, projected: true },
    { label: 'Received at DC', date: po.receivedOn },
  ];

  // An exception is not a stage of its own. The PO is still parked at the stage
  // it was raised from, so that is where the head of the track sits, and the
  // head takes the rose of the exception rather than the hue of that stage.
  const stage: keyof typeof STAGE_INDEX =
    po.status === 'exception' ? (po.exception?.raisedFrom ?? 'confirmed') : po.status;
  const headIndex = STAGE_INDEX[stage];

  // A received PO is closed. Nothing is in flight, so nothing pulses.
  const moving = po.status !== 'received';

  let previousStepDate: string | null = null;

  return (
    <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
      <h2 className="section-title">Timeline</h2>
      <ol className="mt-4">
        {steps.map((step, index) => {
          const gap =
            step.date && previousStepDate ? daysBetween(previousStepDate, step.date) : null;
          previousStepDate = step.date;

          const head = index === headIndex;
          const done = index < headIndex && step.date !== null;

          return (
            <li key={step.label} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {index === steps.length - 1 ? null : (
                <span
                  aria-hidden
                  className={`absolute top-4 -bottom-1 left-1 ${
                    index < headIndex
                      ? 'w-0.5 rounded-full bg-emerald-400'
                      : 'w-0 border-l-2 border-dashed border-slate-200'
                  }`}
                />
              )}

              <span aria-hidden className="relative mt-1 flex size-2.5 shrink-0">
                {head && moving ? (
                  <span
                    className={`timeline-pulse absolute inset-0 rounded-full ${STATUS_DOT[po.status]}`}
                  />
                ) : null}
                <span
                  className={`relative size-2.5 rounded-full ${
                    head
                      ? STATUS_DOT[po.status]
                      : done
                        ? 'bg-emerald-500'
                        : step.projected
                          ? 'bg-white ring-2 ring-slate-300 ring-inset'
                          : 'bg-slate-200'
                  }`}
                />
              </span>

              <span
                className={`text-sm ${
                  head
                    ? 'font-medium text-slate-900'
                    : step.date
                      ? 'text-slate-700'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
                {head ? <span className="sr-only"> (current stage)</span> : null}
              </span>

              <span
                className={`numeric ml-auto text-sm whitespace-nowrap ${
                  step.date ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step.date ? formatDate(step.date) : 'Not set'}
              </span>
              <span className="numeric w-14 shrink-0 text-right text-xs whitespace-nowrap text-slate-400">
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
      <h2 className="section-title">Shipment</h2>
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
      <h2 className="section-title border-b border-slate-200 px-5 py-3">
        Line items
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="section-title py-2 pr-3 pl-5">
                SKU
              </th>
              <th scope="col" className="section-title px-3 py-2 text-right">
                Qty
              </th>
              <th scope="col" className="section-title px-3 py-2 text-right">
                Unit
              </th>
              <th scope="col" className="section-title py-2 pr-5 pl-3 text-right">
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
