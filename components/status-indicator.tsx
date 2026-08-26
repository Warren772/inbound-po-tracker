import type { PurchaseOrderStatus } from '@/data/purchase-orders';
import { STATUS_LABEL } from '@/lib/status';

/**
 * Status as a marker.
 *
 * A small color marker against plain text keeps the vertical
 * rhythm of the column readable.
 *
 */
const MARKER: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-slate-400',
  confirmed: 'bg-sky-500',
  in_transit: 'bg-indigo-500',
  received: 'bg-emerald-500',
  exception: 'bg-rose-500',
};

export function StatusIndicator({ status }: { status: PurchaseOrderStatus }) {
  return (
    <span
      data-testid="status"
      data-status={status}
      className="inline-flex items-center gap-2 whitespace-nowrap text-slate-800"
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${MARKER[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
