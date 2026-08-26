import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatusIndicator } from '@/components/status-indicator';
import { canDelete, editScope } from '@/lib/status';
import { getPurchaseOrder } from '@/lib/store';

import { DeleteForm } from './delete-form';
import { EditForm } from './edit-form';

/**
 * Editing a PO, within the scope its status allows.
 *
 * A received PO is not a 404, it exists, it is just closed.
 */
export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ poNumber: string }>;
}) {
  const { poNumber } = await params;
  const po = getPurchaseOrder(decodeURIComponent(poNumber));

  if (!po) notFound();

  const scope = editScope(po);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/purchase-orders/${po.poNumber}`}
        className="inline-block text-xs text-slate-600 hover:text-slate-900"
      >
        &larr; Back to {po.poNumber}
      </Link>

      <header className="rounded-lg bg-white px-5 py-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title numeric">
            Edit {po.poNumber}
          </h1>
          <StatusIndicator status={po.status} />
        </div>
        <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
          {scope === 'full'
            ? 'Nobody has committed to this draft yet, so the vendor, lane, order date and line amounts are still yours to change. The PO number and its SKUs are identity, and the status and its dates come from moving the PO.'
            : scope === 'logistics'
              ? 'The vendor has confirmed, so the commercial terms are fixed. The carrier’s booking is not: ETA, vessel and container land here as they come back.'
              : 'This PO is received. A closed PO is a record of what happened, not a draft, so there is nothing here to edit.'}
        </p>
      </header>

      {scope === 'none' ? null : <EditForm po={po} scope={scope} />}

      {canDelete(po).ok ? <DeleteForm poNumber={po.poNumber} /> : null}
    </div>
  );
}
