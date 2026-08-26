'use client';

import { useEffect } from 'react';

/** Client because React error boundaries hold state and catch during render. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server strips the message in production and leaves a digest.
  }, [error]);

  return (
    <div className="rounded-lg bg-white px-5 py-12 text-center ring-1 ring-slate-200">
      <h1 className="page-title">Something went wrong</h1>
      <p className="mx-auto mt-1 max-w-[60ch] text-sm text-slate-600">
        This view failed to render. Nothing was saved, so no purchase order changed.
      </p>
      {error.digest ? (
        <p className="numeric mt-2 text-xs text-slate-500">Reference {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  );
}
