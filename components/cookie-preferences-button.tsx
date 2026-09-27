"use client";

import { reopenConsentBanner } from "@/lib/consent";

export function CookiePreferencesButton() {
  return (
    <button type="button" onClick={reopenConsentBanner} className="text-sm text-ink-800 hover:underline">
      Manage cookie preferences
    </button>
  );
}
