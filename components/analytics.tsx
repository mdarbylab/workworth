"use client";

import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { analyticsEnabled, posthogHost, posthogKey, type EventName, type EventProps } from "@/lib/analytics/events";
import { getConsent, onConsentChange } from "@/lib/consent";

let initialized = false;

// The browser SDK sets a cookie (see lib/consent.ts), so it only starts once
// the visitor has accepted analytics — never on load, never on a decline.
function analyticsReady() {
  return analyticsEnabled && getConsent() === "granted";
}

function ensureInit() {
  if (initialized || !analyticsReady() || typeof window === "undefined") return;
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false, // we capture on route change below
    capture_pageleave: true,
    autocapture: false, // minimal data: only the §12 events and page views
    persistence: "localStorage+cookie",
    person_profiles: "identified_only",
  });
  initialized = true;
}

/** Fire a §12 event from the browser (e.g. a click). No-op without consent. */
export function trackClient(event: EventName, props?: EventProps) {
  if (!analyticsReady()) return;
  ensureInit();
  posthog.capture(event, props);
}

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!analyticsReady()) return;
    ensureInit();
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, search]);
  return null;
}

/** Mount once in the root layout, alongside <CookieBanner />. */
export function Analytics() {
  useEffect(() => {
    if (analyticsReady()) ensureInit();
    // A visitor who accepts mid-session should start being tracked
    // immediately, without waiting for their next navigation.
    return onConsentChange((value) => {
      if (value !== "granted") return;
      ensureInit();
      posthog.capture("$pageview", { $current_url: window.location.href });
    });
  }, []);

  if (!analyticsEnabled) return null; // no PostHog key configured at all
  return (
    <Suspense>
      <PageViews />
    </Suspense>
  );
}

/** Ties browser events to the signed-in user and their business (ids only). */
export function Identify({ userId, organizationId }: { userId: string; organizationId?: string | null }) {
  useEffect(() => {
    if (!analyticsReady()) return;
    ensureInit();
    posthog.identify(userId);
    if (organizationId) posthog.group("organization", organizationId);
  }, [userId, organizationId]);
  return null;
}

/** Fires an event when a screen is shown (e.g. report_viewed). */
export function TrackOnMount({ event, props }: { event: EventName; props?: EventProps }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    trackClient(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key]);
  return null;
}

/** Report a client-side error to PostHog (used by app/error.tsx). */
export function captureException(error: Error) {
  if (!analyticsReady()) return;
  ensureInit();
  posthog.captureException(error);
}

/** Clears identity on sign-out so the next person isn't linked to this one. */
export function resetAnalytics() {
  if (!analyticsEnabled || !initialized) return;
  posthog.reset();
}
