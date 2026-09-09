import type { Instrumentation } from "next";
import { trackException } from "@/lib/analytics/server";

// Server-side error monitoring: unhandled errors in server components, actions,
// and route handlers are reported to PostHog (no-op without a key).
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  trackException(error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
