'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { TODAY, type PurchaseOrder, type PurchaseOrderLine } from '@/data/purchase-orders';
import { daysBetween, isIsoDate } from '@/lib/dates';
import {
  addPurchaseOrder,
  deletePurchaseOrder as removePurchaseOrder,
  getPurchaseOrder,
  resetPurchaseOrders as resetStore,
  savePurchaseOrder,
} from '@/lib/store';
import {
  applyTransition,
  canDelete,
  editScope,
  guard,
  isExceptionCode,
  isTransitionKind,
} from '@/lib/status';

/**
 * Actions report failure as a state value and do not throw. 
 */
export interface TransitionResult {
  error: string | null;
}

/**
 * What the create and edit forms get back.
 *
 * `values` is the submitted form echoed to the client.
 */
export interface FormResult {
  error: string | null;
  values: Record<string, string>;
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
 * Raises a new PO.
 *
 * A new PO is always a `draft` with every downstream date null. `draft` is the
 * state machine's entry edge.
 */
export async function createPurchaseOrder(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const values = echo(formData);

  const poNumber = text(formData, 'poNumber');
  if (!/^PO-\d{4}-\d{4}$/.test(poNumber)) {
    return { error: 'PO number looks like PO-2026-1042.', values };
  }
  if (getPurchaseOrder(poNumber)) {
    return { error: `${poNumber} is already on the book.`, values };
  }

  const commercial = readCommercial(formData);
  if ('error' in commercial) {
    return { error: commercial.error, values };
  }

  const lines = readNewLines(formData);
  if ('error' in lines) {
    return { error: lines.error, values };
  }

  addPurchaseOrder({
    poNumber,
    status: 'draft',
    ...commercial.fields,
    confirmedOn: null,
    shippedOn: null,
    etaOn: null,
    receivedOn: null,
    vessel: null,
    containerNumber: null,
    lines: lines.lines,
    exception: null,
  });

  revalidatePath('/');
  redirect(`/purchase-orders/${poNumber}`);
}

/**
 * Edits a PO in place, within the scope its status allows.
 *
 * The two scopes are disjoint from the status machine: nothing below assigns
 * `status`, `confirmedOn`, `shippedOn` or `receivedOn`.
 */
export async function editPurchaseOrder(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const values = echo(formData);

  const poNumber = text(formData, 'poNumber');
  const po = getPurchaseOrder(poNumber);
  if (!po) {
    return { error: `No purchase order ${poNumber}.`, values };
  }

  // Re-checked server side. The page may have been open while the PO moved.
  const scope = editScope(po);
  if (scope === 'none') {
    return { error: `${po.poNumber} is received. A closed PO is a record, not a draft.`, values };
  }

  let edited: PurchaseOrder = po;

  if (scope === 'full') {
    const commercial = readCommercial(formData);
    if ('error' in commercial) {
      return { error: commercial.error, values };
    }

    const lines = readEditedLines(formData, po.lines);
    if ('error' in lines) {
      return { error: lines.error, values };
    }

    edited = { ...edited, ...commercial.fields, lines: lines.lines };
  }

  const logistics = readLogistics(formData, edited);
  if ('error' in logistics) {
    return { error: logistics.error, values };
  }

  savePurchaseOrder({ ...edited, ...logistics.fields });

  revalidatePath('/');
  redirect(`/purchase-orders/${poNumber}`);
}

/**
 * Drops a draft off the book.
 *
 * Guarded the same way we guard transitions.
 */
export async function deletePurchaseOrder(
  _previous: TransitionResult,
  formData: FormData,
): Promise<TransitionResult> {
  const poNumber = String(formData.get('poNumber') ?? '');

  const po = getPurchaseOrder(poNumber);
  if (!po) {
    return { error: `No purchase order ${poNumber}.` };
  }

  const allowed = canDelete(po);
  if (!allowed.ok) {
    return { error: allowed.reason };
  }

  removePurchaseOrder(poNumber);

  revalidatePath('/');
  redirect('/');
}

/**
 * Restores the seed. This resets the server in memory store.
 * Playwright tests hook to make repeat local runs deterministic.
 */
export async function resetPurchaseOrders(): Promise<void> {
  resetStore();
  revalidatePath('/', 'layout');
}

/* -------------------------------------------------------------------------- */
/* Form reading. Every helper returns either its fields or a sentence to render. */
/* -------------------------------------------------------------------------- */

const MAX_TEXT = 80;

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim();
}

type Failed = { error: string };

/** Vendor, brand, lane and order date. Writable only while the PO is a draft. */
function readCommercial(
  formData: FormData,
):
  | {
      fields: Pick<
        PurchaseOrder,
        'vendor' | 'brand' | 'originPort' | 'destinationPort' | 'orderedOn'
      >;
    }
  | Failed {
  const labels = {
    vendor: 'Vendor',
    brand: 'Brand',
    originPort: 'Load port',
    destinationPort: 'Discharge port',
  } as const;

  const fields: Record<keyof typeof labels, string> = {
    vendor: '',
    brand: '',
    originPort: '',
    destinationPort: '',
  };

  for (const name of Object.keys(labels) as (keyof typeof labels)[]) {
    const value = text(formData, name);
    if (value.length === 0) return { error: `${labels[name]} is required.` };
    if (value.length > MAX_TEXT) return { error: `${labels[name]} is too long.` };
    fields[name] = value;
  }

  const orderedOn = text(formData, 'orderedOn');
  if (!isIsoDate(orderedOn)) {
    return { error: 'Order date is not a real date.' };
  }
  if (daysBetween(TODAY, orderedOn) > 0) {
    return { error: 'A PO cannot be raised in the future.' };
  }

  return { fields: { ...fields, orderedOn } };
}

/** The booking the carrier sends back. Every field is legitimately unknown. */
function readLogistics(
  formData: FormData,
  po: PurchaseOrder,
): { fields: Pick<PurchaseOrder, 'etaOn' | 'vessel' | 'containerNumber'> } | Failed {
  const rawEta = text(formData, 'etaOn');
  let etaOn: string | null = null;

  if (rawEta.length > 0) {
    if (!isIsoDate(rawEta)) return { error: 'ETA is not a real date.' };
    if (daysBetween(po.orderedOn, rawEta) <= 0) {
      return { error: 'ETA has to fall after the order date.' };
    }
    // A ship date the machine already wrote is the hard floor. Everything above
    // it, including a transit too short to be real, is left to `attentionFor`
    // to flag — a stale ETA is a booking problem to surface, not a typo to reject.
    if (po.shippedOn !== null && daysBetween(po.shippedOn, rawEta) < 0) {
      return { error: 'ETA cannot fall before the PO sailed.' };
    }
    etaOn = rawEta;
  }

  const vessel = text(formData, 'vessel');
  const containerNumber = text(formData, 'containerNumber');

  if (vessel.length > MAX_TEXT) return { error: 'Vessel name is too long.' };
  if (containerNumber.length > MAX_TEXT) return { error: 'Container number is too long.' };

  return {
    fields: {
      etaOn,
      vessel: vessel.length > 0 ? vessel : null,
      containerNumber: containerNumber.length > 0 ? containerNumber : null,
    },
  };
}

const NEW_LINE_SLOTS = 3;

/** The create form's line rows. Blank slots are skipped; one has to be filled. */
function readNewLines(formData: FormData): { lines: PurchaseOrderLine[] } | Failed {
  const lines: PurchaseOrderLine[] = [];

  for (let index = 0; index < NEW_LINE_SLOTS; index += 1) {
    const sku = text(formData, `line-${index}-sku`);
    const description = text(formData, `line-${index}-description`);
    const rawQuantity = text(formData, `line-${index}-quantity`);
    const rawCost = text(formData, `line-${index}-unitCostUsd`);

    if (!sku && !description && !rawQuantity && !rawCost) continue;

    if (!sku || !description) {
      return { error: `Line ${index + 1} needs both a SKU and a description.` };
    }
    if (sku.length > MAX_TEXT || description.length > MAX_TEXT) {
      return { error: `Line ${index + 1} is too long.` };
    }

    const amounts = readAmounts(rawQuantity, rawCost, index);
    if ('error' in amounts) return amounts;

    lines.push({ sku, description, ...amounts });
  }

  if (lines.length === 0) {
    return { error: 'A PO needs at least one line item.' };
  }

  return { lines };
}

/**
 * Quantities and costs on an existing PO.
 *
 * SKUs and descriptions are not re-read. Swapping the SKU on a line turns it
 * into a different order, which is a new PO rather than an edit.
 */
function readEditedLines(
  formData: FormData,
  existing: PurchaseOrderLine[],
): { lines: PurchaseOrderLine[] } | Failed {
  const lines: PurchaseOrderLine[] = [];

  for (const [index, line] of existing.entries()) {
    const amounts = readAmounts(
      text(formData, `line-${index}-quantity`),
      text(formData, `line-${index}-unitCostUsd`),
      index,
    );
    if ('error' in amounts) return amounts;

    lines.push({ ...line, ...amounts });
  }

  return { lines };
}

const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_COST = 100_000;

function readAmounts(
  rawQuantity: string,
  rawCost: string,
  index: number,
): { quantity: number; unitCostUsd: number } | Failed {
  const quantity = Number(rawQuantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return { error: `Line ${index + 1} needs a whole quantity of at least 1.` };
  }

  const unitCostUsd = Number(rawCost);
  if (!Number.isFinite(unitCostUsd) || unitCostUsd <= 0 || unitCostUsd > MAX_UNIT_COST) {
    return { error: `Line ${index + 1} needs a unit cost above zero.` };
  }

  return { quantity, unitCostUsd: Math.round(unitCostUsd * 100) / 100 };
}
