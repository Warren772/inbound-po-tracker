'use server';

import { revalidatePath } from 'next/cache';

import { TODAY } from '@/data/purchase-orders';
import {
  getPurchaseOrder,
  resetPurchaseOrders as resetStore,
  savePurchaseOrder,
} from '@/lib/store';
import { applyTransition, guard, isExceptionCode, isTransitionKind } from '@/lib/status';

/**
 * Actions report failure as a state value and do not throw. 
 */
export interface TransitionResult {
  error: string | null;
}

export async function transitionPurchaseOrder(
  _previous: TransitionResult,
  formData: FormData,
): Promise<TransitionResult> {
  const poNumber = String(formData.get('poNumber') ?? '');
  const kind = String(formData.get('kind') ?? '');

  if (!isTransitionKind(kind)) {
    return { error: `Unknown transition "${kind}".` };
  }

  const po = getPurchaseOrder(poNumber);
  if (!po) {
    return { error: `No purchase order ${poNumber}.` };
  }

  // Re-checked server side even though the UI already hid the button. The page
  // may have been open while the PO moved underneath it.
  const allowed = guard(po, kind);
  if (!allowed.ok) {
    return { error: allowed.reason };
  }

  if (kind === 'flag') {
    const code = String(formData.get('exceptionCode') ?? '');
    const note = String(formData.get('note') ?? '').trim();

    if (!isExceptionCode(code)) {
      return { error: 'Pick an exception type.' };
    }
    if (note.length === 0) {
      return { error: 'Add a note. Whoever picks this up next needs to know what happened.' };
    }

    savePurchaseOrder(applyTransition(po, kind, { today: TODAY, exceptionCode: code, note }));
  } else {
    savePurchaseOrder(applyTransition(po, kind, { today: TODAY }));
  }

  revalidatePath('/');
  revalidatePath(`/purchase-orders/${poNumber}`);

  return { error: null };
}

/**
 * Restores the seed. This resets the server in memory store.
 * Playwright tests hook to make repeat local runs deterministic.
 */
export async function resetPurchaseOrders(): Promise<void> {
  resetStore();
  revalidatePath('/', 'layout');
}
