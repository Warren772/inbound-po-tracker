/**
 * The coordinator application code.
 *
 */

import { TODAY, type PurchaseOrder } from '@/data/purchase-orders';
import { daysBetween, formatDate, formatDayOffset } from '@/lib/dates';
import { EXCEPTION_LABEL } from '@/lib/status';

export type AttentionLevel = 'critical' | 'warning';

export interface Attention {
  level: AttentionLevel;
  /**
   * The headline. It stands alone in the row's date cell with no countdown.
   */
  label: string;
  /** The one-line "why", for the detail banner. */
  detail: string;
}

/** Days from TODAY to the booked ETA. Negative once the ETA is in the past. */
export function daysToEta(po: PurchaseOrder): number | null {
  return po.etaOn === null ? null : daysBetween(TODAY, po.etaOn);
}

/** Days since the PO was raised. */
export function ageInDays(po: PurchaseOrder): number {
  return daysBetween(po.orderedOn, TODAY);
}

export function totalUnits(po: PurchaseOrder): number {
  return po.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function orderValueUsd(po: PurchaseOrder): number {
  return po.lines.reduce((sum, line) => sum + line.quantity * line.unitCostUsd, 0);
}

/** How many days a PO has been at sea, or null if it never sailed. */
export function daysAtSea(po: PurchaseOrder): number | null {
  if (po.shippedOn === null) return null;
  return daysBetween(po.shippedOn, po.receivedOn ?? TODAY);
}

const ARRIVING_WINDOW_DAYS = 7;
const STALE_DRAFT_DAYS = 14;
const UNSHIPPED_ETA_WINDOW_DAYS = 14;

/**
 * The single reason this PO should jump the queue, or null if it is fine.
 *
 */
export function attentionFor(po: PurchaseOrder): Attention | null {
  if (po.status === 'received') return null;

  if (po.status === 'exception' && po.exception) {
    return {
      level: 'critical',
      label: EXCEPTION_LABEL[po.exception.code],
      detail: `${EXCEPTION_LABEL[po.exception.code]} raised ${formatDate(po.exception.raisedOn)}, ${-daysBetween(TODAY, po.exception.raisedOn)}d open.`,
    };
  }

  const eta = daysToEta(po);

  if (po.status === 'in_transit' && eta !== null && eta < 0) {
    return {
      level: 'critical',
      label: `Overdue ${-eta}d`,
      detail: `ETA was ${formatDate(po.etaOn as string)} and the container has not been received.`,
    };
  }

  // Booked to arrive within a fortnight and still sitting at the origin. Neither
  // date reads as wrong on its own, which is exactly why it needs flagging.
  if (po.status === 'confirmed' && eta !== null && eta <= UNSHIPPED_ETA_WINDOW_DAYS) {
    return {
      level: 'critical',
      label: `Not sailed, ETA ${formatDayOffset(eta)}`,
      detail: `ETA ${formatDate(po.etaOn as string)} (${formatDayOffset(eta)}) with no ship date on file. Sea transit alone is 30-40 days.`,
    };
  }

  if (po.status === 'in_transit' && eta !== null && eta <= ARRIVING_WINDOW_DAYS) {
    return {
      level: 'warning',
      label: `Arriving ${formatDayOffset(eta)}`,
      detail: `Docks ${formatDate(po.etaOn as string)}. Book the drayage and warn the DC.`,
    };
  }

  if (po.status === 'draft' && ageInDays(po) > STALE_DRAFT_DAYS) {
    return {
      level: 'warning',
      label: `Unconfirmed ${ageInDays(po)}d`,
      detail: `Raised ${formatDate(po.orderedOn)} and the vendor has still not confirmed. Nothing downstream can be booked.`,
    };
  }

  return null;
}

export interface Milestone {
  /** What the date means for this status. */
  label: string;
  date: string | null;
  /** The countdown, when one exists and is worth reading. */
  offset: string | null;
}

/**
 * The one date a row should show.
 */
export function milestoneFor(po: PurchaseOrder): Milestone {
  switch (po.status) {
    case 'draft':
      return { label: 'Ordered', date: po.orderedOn, offset: formatDayOffset(-ageInDays(po)) };

    case 'confirmed':
      return po.etaOn
        ? { label: 'ETA', date: po.etaOn, offset: formatDayOffset(daysToEta(po) as number) }
        : { label: 'Confirmed', date: po.confirmedOn, offset: null };

    case 'in_transit':
      return po.etaOn
        ? { label: 'ETA', date: po.etaOn, offset: formatDayOffset(daysToEta(po) as number) }
        : { label: 'Sailed', date: po.shippedOn, offset: 'ETA not booked' };

    case 'exception':
      return po.exception
        ? { label: 'Raised', date: po.exception.raisedOn, offset: null }
        : { label: 'Ordered', date: po.orderedOn, offset: null };

    case 'received':
      return { label: 'Received', date: po.receivedOn, offset: null };
  }
}

export type ViewKey = 'attention' | 'arriving' | 'transit' | 'open' | 'received' | 'all';

export const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'attention', label: 'Needs attention', hint: 'Exceptions, overdue and stalled' },
  { key: 'arriving', label: 'Arriving', hint: `Docking within ${ARRIVING_WINDOW_DAYS} days` },
  { key: 'transit', label: 'At sea', hint: 'Sailed, not yet received' },
  { key: 'open', label: 'Pre-departure', hint: 'Draft and confirmed' },
  { key: 'received', label: 'Received', hint: 'Closed, no moves left' },
  { key: 'all', label: 'All POs', hint: 'Everything on the book' },
];

export function isViewKey(value: string): value is ViewKey {
  return VIEWS.some((view) => view.key === value);
}

export function matchesView(po: PurchaseOrder, view: ViewKey): boolean {
  switch (view) {
    case 'attention':
      return attentionFor(po) !== null;
    case 'arriving': {
      const eta = daysToEta(po);
      return po.status === 'in_transit' && eta !== null && eta <= ARRIVING_WINDOW_DAYS;
    }
    case 'transit':
      return po.status === 'in_transit';
    case 'open':
      return po.status === 'draft' || po.status === 'confirmed';
    case 'received':
      return po.status === 'received';
    case 'all':
      return true;
  }
}

const ATTENTION_RANK: Record<AttentionLevel, number> = { critical: 0, warning: 1 };

/**
 * Ranked by urgency first, then soonest date.
 */
export function byUrgency(a: PurchaseOrder, b: PurchaseOrder): number {
  const attentionA = attentionFor(a);
  const attentionB = attentionFor(b);
  const rankA = attentionA ? ATTENTION_RANK[attentionA.level] : 2;
  const rankB = attentionB ? ATTENTION_RANK[attentionB.level] : 2;
  if (rankA !== rankB) return rankA - rankB;

  if (a.status === 'received' && b.status !== 'received') return 1;
  if (b.status === 'received' && a.status !== 'received') return -1;

  const etaA = daysToEta(a);
  const etaB = daysToEta(b);
  if (etaA !== null && etaB !== null && etaA !== etaB) return etaA - etaB;
  if (etaA !== null && etaB === null) return -1;
  if (etaA === null && etaB !== null) return 1;

  return a.orderedOn.localeCompare(b.orderedOn);
}
