"use client";

import { reopenConsentBanner } from "@/lib/consent";

export function CookiePreferencesLink() {
  return (
    <button
      type="button"
      onClick={reopenConsentBanner}
      className="font-medium text-ink-800 underline underline-offset-2"
    >
      change your cookie preferences
    </button>
  );
}
