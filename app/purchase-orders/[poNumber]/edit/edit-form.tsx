'use client';

import { useActionState } from 'react';

import { editPurchaseOrder, type FormResult } from '@/app/actions';
import { Field } from '@/components/field';
import type { PurchaseOrder } from '@/data/purchase-orders';

/**
 * Reusable component for the edit forms.
 * `scope` decides which fieldsets render, and the action re-checks it.
 */

const EMPTY: FormResult = { error: null, values: {} };

export function EditForm({
  po,
  scope,
}: {
  po: PurchaseOrder;
  scope: 'full' | 'logistics';
}) {
  const [state, formAction, isPending] = useActionState(editPurchaseOrder, EMPTY);
  const value = (name: string, fallback: string) => state.values[name] ?? fallback;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="poNumber" value={po.poNumber} />
      <input type="hidden" name="scope" value={scope} />

      <fieldset disabled={isPending} className="space-y-4">
        {scope === 'full' ? (
          <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
            <h2 className="section-title">Order</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Vendor" name="vendor" defaultValue={value('vendor', po.vendor)} required />
              <Field label="Brand" name="brand" defaultValue={value('brand', po.brand)} required />
              <Field
                label="Load port"
                name="originPort"
                defaultValue={value('originPort', po.originPort)}
                required
              />
              <Field
                label="Discharge port"
                name="destinationPort"
                defaultValue={value('destinationPort', po.destinationPort)}
                required
              />
              <Field
                label="Order date"
                name="orderedOn"
                type="date"
                defaultValue={value('orderedOn', po.orderedOn)}
                required
              />
            </div>
          </section>
        ) : null}

        <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
          <h2 className="section-title">Booking</h2>
          <p className="mt-1 max-w-[70ch] text-xs text-slate-500">
            Marking a PO shipped records only that it sailed. These three come back from the
            carrier afterwards, and this is where they land.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field
              label="Booked ETA"
              name="etaOn"
              type="date"
              defaultValue={value('etaOn', po.etaOn ?? '')}
              hint={po.shippedOn ? 'Asia to US East runs 30–40 days from sailing.' : undefined}
            />
            <Field label="Vessel" name="vessel" defaultValue={value('vessel', po.vessel ?? '')} />
            <Field
              label="Container"
              name="containerNumber"
              defaultValue={value('containerNumber', po.containerNumber ?? '')}
            />
          </div>
        </section>

        {scope === 'full' ? (
          <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
            <h2 className="section-title">Line items</h2>
            <p className="mt-1 max-w-[70ch] text-xs text-slate-500">
              Quantities and costs only. Changing a SKU makes it a different order, which is a new
              PO rather than an edit.
            </p>
            <div className="mt-3 space-y-4">
              {po.lines.map((line, index) => (
                <fieldset
                  key={line.sku}
                  className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                >
                  <legend className="sr-only">{line.sku}</legend>
                  <div className="grid gap-3 sm:grid-cols-[1fr_100px_120px]">
                    <div>
                      <span className="numeric block text-sm font-medium text-slate-900">
                        {line.sku}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{line.description}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        was {line.quantity} @ ${line.unitCostUsd.toFixed(2)}
                      </span>
                    </div>
                    <Field
                      label="Quantity"
                      name={`line-${index}-quantity`}
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={value(`line-${index}-quantity`, String(line.quantity))}
                      required
                    />
                    <Field
                      label="Unit cost"
                      name={`line-${index}-unitCostUsd`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={value(`line-${index}-unitCostUsd`, String(line.unitCostUsd))}
                      required
                    />
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        ) : null}
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          data-testid="edit-submit"
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>

        {state.error ? (
          <p role="alert" data-testid="edit-error" className="text-xs text-rose-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
