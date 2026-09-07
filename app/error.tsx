"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-stone-600">
          Your data is safe. Try again, or head back to Today.
        </p>
        {error.digest && <p className="text-xs text-stone-400">Reference: {error.digest}</p>}
        <div className="flex gap-3">
          <Link href="/today" className="btn-secondary">Today</Link>
          <button type="button" onClick={reset} className="btn-primary">Try again</button>
        </div>
      </div>
    </main>
  );
}
