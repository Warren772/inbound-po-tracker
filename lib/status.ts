/**
 * The status state machine for a purchase order.
 *
 * `draft -> confirmed -> in_transit -> received`, with `exception` reachable
 * from `confirmed` and `in_transit` and clearing back to the previous status.
 *
 */

import type {
  ExceptionCode,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@/data/purchase-orders';

export type TransitionKind = 'confirm' | 'ship' | 'receive' | 'flag' | 'resolve';

export const TRANSITION_KINDS: TransitionKind[] = [
  'confirm',
  'ship',
  'receive',
  'flag',
  'resolve',
];

export function isTransitionKind(value: string): value is TransitionKind {
  return (TRANSITION_KINDS as string[]).includes(value);
}

export const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_transit: 'In transit',
  received: 'Received',
  exception: 'Exception',
};

export const EXCEPTION_LABEL: Record<ExceptionCode, string> = {
  customs_hold: 'Customs hold',
  vendor_delay: 'Vendor delay',
  short_ship: 'Short ship',
  damage: 'Damage',
  documentation: 'Documentation',
};

export const EXCEPTION_CODES: ExceptionCode[] = [
  'customs_hold',
  'vendor_delay',
  'short_ship',
  'damage',
  'documentation',
];

export function isExceptionCode(value: string): value is ExceptionCode {
  return (EXCEPTION_CODES as string[]).includes(value);
}

export const TRANSITION_LABEL: Record<TransitionKind, string> = {
  confirm: 'Confirm',
  ship: 'Mark shipped',
  receive: 'Receive',
  flag: 'Flag exception',
  resolve: 'Clear exception',
};

export type Guard = { ok: true } | { ok: false; reason: string };

const OK: Guard = { ok: true };

/**
 * Whether `kind` is legal for `po` right now.
 */
export function guard(po: PurchaseOrder, kind: TransitionKind): Guard {
  switch (kind) {
    case 'confirm':
      return po.status === 'draft'
        ? OK
        : { ok: false, reason: `Only a draft can be confirmed. ${po.poNumber} is ${STATUS_LABEL[po.status].toLowerCase()}.` };

    case 'ship':
      return po.status === 'confirmed'
        ? OK
        : { ok: false, reason: `Only a confirmed PO can sail. ${po.poNumber} is ${STATUS_LABEL[po.status].toLowerCase()}.` };

    case 'receive':
      if (po.status !== 'in_transit') {
        return {
          ok: false,
          reason: `Receiving unlocks once the PO sails. ${po.poNumber} is ${STATUS_LABEL[po.status].toLowerCase()}.`,
        };
      }
      if (po.shippedOn === null) {
        return { ok: false, reason: 'No ship date on file, so there is nothing in transit to receive.' };
      }
      return OK;

    case 'flag':
      return po.status === 'confirmed' || po.status === 'in_transit'
        ? OK
        : { ok: false, reason: `An exception can only be raised against a confirmed or in-transit PO.` };

    case 'resolve':
      return po.status === 'exception' && po.exception !== null
        ? OK
        : { ok: false, reason: 'There is no open exception on this PO.' };
  }
}

export interface Move {
  kind: TransitionKind;
  label: string;
  /** What the PO becomes. Rendered next to the button so the move is not a guess. */
  to: string;
  guard: Guard;
}

/**
 * The applicable moves rendered for a PO's current status.
 */
export function movesFor(po: PurchaseOrder): Move[] {
  const move = (kind: TransitionKind, to: string): Move => ({
    kind,
    label: TRANSITION_LABEL[kind],
    to,
    guard: guard(po, kind),
  });

  switch (po.status) {
    case 'draft':
      return [move('confirm', 'Confirmed')];
    case 'confirmed':
      return [move('ship', 'In transit'), move('receive', 'Received'), move('flag', 'Exception')];
    case 'in_transit':
      return [move('receive', 'Received'), move('flag', 'Exception')];
    case 'exception':
      return [move('resolve', po.exception ? STATUS_LABEL[po.exception.raisedFrom] : 'Previous status')];
    case 'received':
      return [];
  }
}

/** The one move a row offers inline. Null when the PO needs the detail page or is closed. */
export function primaryMove(po: PurchaseOrder): Move | null {
  const legal = movesFor(po).filter((move) => move.guard.ok && move.kind !== 'flag');
  return legal[0] ?? null;
}

export interface TransitionInput {
  today: string;
  exceptionCode?: ExceptionCode;
  note?: string;
}

/**
 * Returns the moved record.
 */
export function applyTransition(
  po: PurchaseOrder,
  kind: TransitionKind,
  input: TransitionInput,
): PurchaseOrder {
  switch (kind) {
    case 'confirm':
      return { ...po, status: 'confirmed', confirmedOn: input.today };

    case 'ship':
      // Only the fact that it sailed is recorded.
      return { ...po, status: 'in_transit', shippedOn: input.today };

    case 'receive':
      return { ...po, status: 'received', receivedOn: input.today };

    case 'flag':
      return {
        ...po,
        status: 'exception',
        exception: {
          raisedFrom: po.status === 'in_transit' ? 'in_transit' : 'confirmed',
          raisedOn: input.today,
          code: input.exceptionCode ?? 'documentation',
          note: input.note ?? '',
        },
      };

    case 'resolve':
      return {
        ...po,
        status: po.exception ? po.exception.raisedFrom : 'confirmed',
        exception: null,
      };
  }
}
