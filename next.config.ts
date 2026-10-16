import type { NextConfig } from "next";

// Baseline security headers (SPEC §11). CSP is left to a later hardening pass
// once the analytics/host list is settled.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Keep `next dev` from appending its agent-rules block to CLAUDE.md.
  agentRules: false,
  experimental: {
    // Receipt uploads (SPEC §5.4) go through the expense server actions. The
    // default 1 MB would refuse most phone photos; 5 MB covers the 4 MB
    // receipt cap plus the form's other fields (lib/receipts.ts).
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
