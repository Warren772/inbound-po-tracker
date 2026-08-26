'use client';

import { useActionState } from 'react';

import { transitionPurchaseOrder, type TransitionResult } from '@/app/actions';
import type { TransitionKind } from '@/lib/status';

/**
 * The only client component in the app.
 *
 * A status change is a form posting to a server action. 
 * Two things make this a client component:
 *
 *   1. Pending state.
 *   2. Errors as values. `transitionPurchaseOrder` returns `{ error }` instead of
 *      throwing, so an illegal move has to be rendered next to the button that
 *      caused it.
 *
 * Everything else on both routes is a server component.
 */

const NO_ERROR: TransitionResult = { error: null };

const VARIANT_STYLE = {
  primary:
    'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400 shadow-sm',
  quiet:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:text-slate-400',
} as const;

interface TransitionFormProps {
  poNumber: string;
  kind: TransitionKind;
  label: string;
  variant: keyof typeof VARIANT_STYLE;
  /** Rendered inside the form, above the button. Used by the flag-exception form. */
  children?: React.ReactNode;
}

export function TransitionForm({
  poNumber,
  kind,
  label,
  variant,
  children,
}: TransitionFormProps) {
  const [state, formAction, isPending] = useActionState(transitionPurchaseOrder, NO_ERROR);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="poNumber" value={poNumber} />
      <input type="hidden" name="kind" value={kind} />

      {children ? (
        <fieldset disabled={isPending} className="w-full space-y-2">
          {children}
        </fieldset>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid={`transition-${kind}`}
        className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANT_STYLE[variant]}`}
      >
        {isPending ? 'Saving…' : label}
      </button>

      {state.error ? (
        <p role="alert" data-testid="transition-error" className="text-xs text-rose-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
