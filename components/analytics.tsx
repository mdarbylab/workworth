"use client";

import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { analyticsEnabled, posthogHost, posthogKey, type EventName, type EventProps } from "@/lib/analytics/events";

let initialized = false;

function ensureInit() {
  if (initialized || !analyticsEnabled || typeof window === "undefined") return;
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

/** Fire a §12 event from the browser (e.g. a click). No-op without a key. */
export function trackClient(event: EventName, props?: EventProps) {
  if (!analyticsEnabled) return;
  ensureInit();
  posthog.capture(event, props);
}

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    if (!analyticsEnabled) return;
    ensureInit();
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, search]);
  return null;
}

/** Mount once in the root layout. */
export function Analytics() {
  useEffect(() => {
    ensureInit();
  }, []);
  if (!analyticsEnabled) return null;
  return (
    <Suspense>
      <PageViews />
    </Suspense>
  );
}

/** Ties browser events to the signed-in user and their business (ids only). */
export function Identify({ userId, organizationId }: { userId: string; organizationId?: string | null }) {
  useEffect(() => {
    if (!analyticsEnabled) return;
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
  if (!analyticsEnabled) return;
  ensureInit();
  posthog.captureException(error);
}

/** Clears identity on sign-out so the next person isn't linked to this one. */
export function resetAnalytics() {
  if (!analyticsEnabled || !initialized) return;
  posthog.reset();
}
