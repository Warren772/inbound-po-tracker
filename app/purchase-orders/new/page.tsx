import Link from 'next/link';

import { TODAY } from '@/data/purchase-orders';

import { CreateForm } from './create-form';

/**
 * Raising a PO.
 *
 * A static segment, so it takes precedence over `[poNumber]` and there is no
 * PO on the book that this route can collide with.
 */
export default function NewPurchaseOrderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/" className="inline-block text-xs text-slate-600 hover:text-slate-900">
        &larr; All purchase orders
      </Link>

      <header className="rounded-lg bg-white px-5 py-4 ring-1 ring-slate-200">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Raise a purchase order</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-slate-600">
          A new PO is a draft. Confirmation, sailing and receipt are transitions, so this form has
          no status field and no ship or receive dates — the vendor confirms it, and the rest
          follows from there.
        </p>
      </header>

      <CreateForm today={TODAY} />
    </div>
  );
}
