import type { Metadata } from 'next';
import Link from 'next/link';

import { TODAY } from '@/data/purchase-orders';
import { formatDate } from '@/lib/dates';
import { resetPurchaseOrders } from '@/app/actions';

import './globals.css';

export const metadata: Metadata = {
  title: 'Inbound PO Tracker',
  description: 'Inbound purchase orders and shipments for the Savannah DC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                Inbound PO Tracker
              </span>
              <span className="hidden text-xs text-slate-500 sm:inline">Home textiles &middot; US East</span>
            </Link>

            <div className="ml-auto flex items-center gap-4">
              {/* The clock is fixed, so it is stated rather than implied. Every
                  countdown on every page is measured from this date. */}
              <p className="numeric text-xs text-slate-500">
                Today <span className="font-medium text-slate-700">{formatDate(TODAY)}</span>
              </p>
              <form action={resetPurchaseOrders}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  Reset demo data
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
