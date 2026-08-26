'use client';

import { useActionState } from 'react';

import { createPurchaseOrder, type FormResult } from '@/app/actions';
import { Field } from '@/components/field';

/**
 * Create form reusable component.
 *
 */

const EMPTY: FormResult = { error: null, values: {} };

/** Three slots. Blank ones are skipped server-side; more lines come from editing. */
const LINE_SLOTS = [0, 1, 2];

export function CreateForm({ today }: { today: string }) {
  const [state, formAction, isPending] = useActionState(createPurchaseOrder, EMPTY);
  const value = (name: string) => state.values[name] ?? '';

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={isPending} className="space-y-4">
        <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Order
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              label="PO number"
              name="poNumber"
              defaultValue={value('poNumber')}
              required
              placeholder="PO-2026-1042"
              hint="The number the ERP issued. This app does not invent one."
            />
            <Field
              label="Order date"
              name="orderedOn"
              type="date"
              defaultValue={state.values.orderedOn ?? today}
              required
              hint="Back-date it and the draft ages against today."
            />
            <Field label="Vendor" name="vendor" defaultValue={value('vendor')} required
              placeholder="Karur Weaves Pvt Ltd" />
            <Field label="Brand" name="brand" defaultValue={value('brand')} required
              placeholder="Hearth &amp; Loom" />
            <Field label="Load port" name="originPort" defaultValue={value('originPort')} required
              placeholder="Tuticorin, India" />
            <Field
              label="Discharge port"
              name="destinationPort"
              defaultValue={value('destinationPort')}
              required
              placeholder="Savannah, GA"
            />
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Line items
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            The first line is required. Leave the rest blank if the PO is a single SKU.
          </p>

          <div className="mt-3 space-y-4">
            {LINE_SLOTS.map((index) => (
              <fieldset
                key={index}
                className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
              >
                <legend className="sr-only">Line {index + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-[1fr_2fr_100px_120px]">
                  <Field
                    label={`SKU ${index + 1}`}
                    name={`line-${index}-sku`}
                    defaultValue={value(`line-${index}-sku`)}
                    required={index === 0}
                    placeholder="HL-TWL-600"
                  />
                  <Field
                    label="Description"
                    name={`line-${index}-description`}
                    defaultValue={value(`line-${index}-description`)}
                    required={index === 0}
                    placeholder="600gsm bath towel, white"
                  />
                  <Field
                    label="Quantity"
                    name={`line-${index}-quantity`}
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={value(`line-${index}-quantity`)}
                    required={index === 0}
                  />
                  <Field
                    label="Unit cost"
                    name={`line-${index}-unitCostUsd`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={value(`line-${index}-unitCostUsd`)}
                    required={index === 0}
                  />
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          data-testid="create-submit"
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending ? 'Saving…' : 'Raise draft PO'}
        </button>

        {state.error ? (
          <p role="alert" data-testid="create-error" className="text-xs text-rose-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
