import { after } from "next/server";
import { analyticsEnabled, posthogHost, posthogKey, type EventName, type EventProps } from "./events";

type Target = { userId: string; organizationId?: string | null };

async function send(event: string, target: Target, props: Record<string, unknown> = {}) {
  try {
    await fetch(`${posthogHost}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: posthogKey,
        event,
        distinct_id: target.userId,
        timestamp: new Date().toISOString(),
        properties: {
          ...props,
          $lib: "workworth-server",
          ...(target.organizationId ? { $groups: { organization: target.organizationId } } : {}),
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Analytics must never break a request.
  }
}

/**
 * Record a product event from a server action or route handler. Runs after the
 * response is sent so it never adds latency; no-op without a PostHog key.
 */
export function track(event: EventName, target: Target, props?: EventProps) {
  if (!analyticsEnabled) return;
  after(() => send(event, target, props));
}

/** Report a server-side exception (used by instrumentation.ts). */
export function trackException(error: unknown, context: EventProps = {}) {
  if (!analyticsEnabled) return;
  const err = error instanceof Error ? error : new Error(String(error));
  after(() =>
    send("$exception", { userId: "server" }, {
      ...context,
      $exception_list: [{ type: err.name, value: err.message, stacktrace: { type: "raw", frames: [] } }],
      $exception_message: err.message,
      $exception_type: err.name,
    }),
  );
}
