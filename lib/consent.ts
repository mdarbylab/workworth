// Analytics-cookie consent (GDPR/TTDSG — see the Cookies section of
// app/privacy/page.tsx). Stored client-side only; the choice itself is a
// strictly-necessary preference, not something that needs its own consent.
const KEY = "workworth-analytics-consent";

export type Consent = "granted" | "denied";
const CONSENT_EVENT = "workworth:consent";

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null; // private browsing or blocked storage: ask again
  }
}

export function setConsent(value: Consent) {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // Couldn't persist it — the banner will just reappear next visit.
  }
  window.dispatchEvent(new CustomEvent<Consent>(CONSENT_EVENT, { detail: value }));
}

/** Fires when the visitor makes or changes a consent choice this session. */
export function onConsentChange(handler: (value: Consent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<Consent>).detail);
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}

const REOPEN_EVENT = "workworth:consent-reopen";

/** Shows the cookie banner again so a visitor can change an earlier choice. */
export function reopenConsentBanner() {
  window.dispatchEvent(new Event(REOPEN_EVENT));
}

export function onConsentReopen(handler: () => void): () => void {
  window.addEventListener(REOPEN_EVENT, handler);
  return () => window.removeEventListener(REOPEN_EVENT, handler);
}
