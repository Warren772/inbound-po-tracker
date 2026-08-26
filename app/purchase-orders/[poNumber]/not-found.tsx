import Link from 'next/link';

export default function PurchaseOrderNotFound() {
  return (
    <div className="rounded-lg bg-white px-5 py-12 text-center ring-1 ring-slate-200">
      <h1 className="page-title">No such purchase order</h1>
      <p className="mt-1 text-sm text-slate-600">
        That PO number is not on the book. It may have been mistyped.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        Back to all purchase orders
      </Link>
    </div>
  );
}
