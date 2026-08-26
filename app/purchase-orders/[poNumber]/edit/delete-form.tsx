'use client';

import { useActionState } from 'react';

import { deletePurchaseOrder, type TransitionResult } from '@/app/actions';

/**
 *
 * It is a separate form rather than a second button on the edit form because
 * forms do not nest and the two submits mean different things.
 */

const NO_ERROR: TransitionResult = { error: null };

export function DeleteForm({ poNumber }: { poNumber: string }) {
  const [state, formAction, isPending] = useActionState(deletePurchaseOrder, NO_ERROR);

  return (
    <section className="rounded-lg bg-white p-5 ring-1 ring-rose-200">
      <h2 className="text-xs font-medium tracking-wide text-rose-900 uppercase">Delete</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
        Nothing outside this app depends on {poNumber} yet. Once a vendor confirms it there is a
        commitment behind the record and it stops being deletable.
      </p>

      <form action={formAction} className="mt-3 flex items-center gap-4">
        <input type="hidden" name="poNumber" value={poNumber} />
        <button
          type="submit"
          disabled={isPending}
          data-testid="delete-submit"
          className="inline-flex items-center rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {isPending ? 'Deleting…' : 'Delete this draft'}
        </button>

        {state.error ? (
          <p role="alert" data-testid="delete-error" className="text-xs text-rose-700">
            {state.error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
