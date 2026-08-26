'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { transitionPurchaseOrder, type TransitionResult } from '@/app/actions';
import type { TransitionKind } from '@/lib/status';

/** Client for pending state and errors-as-values. Paints via useFormStatus, not useOptimistic: a client closure would drop no-JS submission. */

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
  /** The status the PO becomes. Painted on the button the instant it is clicked. */
  to: string;
  /** Rendered inside the form, above the button. Used by the flag-exception form. */
  children?: React.ReactNode;
}

function SubmitButton({
  kind,
  label,
  to,
  variant,
}: {
  kind: TransitionKind;
  label: string;
  to: string;
  variant: keyof typeof VARIANT_STYLE;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      data-testid={`transition-${kind}`}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANT_STYLE[variant]}`}
    >
      {pending ? `\u2192 ${to}` : label}
    </button>
  );
}

export function TransitionForm({
  poNumber,
  kind,
  label,
  variant,
  to,
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

      <SubmitButton kind={kind} label={label} to={to} variant={variant} />

      {state.error ? (
        <p role="alert" data-testid="transition-error" className="text-xs text-rose-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
