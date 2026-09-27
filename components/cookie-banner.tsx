"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { analyticsEnabled } from "@/lib/analytics/events";
import { getConsent, onConsentReopen, setConsent } from "@/lib/consent";

/** Bottom bar asking for analytics-cookie consent. Renders nothing until a
 * PostHog key exists and no choice has been made yet (or reopened from
 * Settings / the privacy policy). See components/analytics.tsx for what
 * "accept" actually enables. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!analyticsEnabled) return;
    // Only knowable once mounted in the browser — localStorage isn't
    // available during server rendering, and guessing would risk a
    // hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(getConsent() === null);
    return onConsentReopen(() => setVisible(true));
  }, []);

  if (!visible) return null;

  function choose(value: "granted" | "denied") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] shadow-[0_-4px_16px_rgba(23,29,26,.08)]">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We&apos;d like to use privacy-friendly analytics (account id only,
          no ads) to see how WorkWorth is used.{" "}
          <Link href="/privacy" className="font-medium text-ink-800 hover:underline">
            Read the privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="btn-secondary w-auto px-4 py-2 text-sm"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="btn-primary w-auto px-4 py-2 text-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
