"use client";

import { trackClient } from "@/components/analytics";

/** The only upsell in the product (SPEC §5.6). Waitlist link, not a checkout. */
export function UpgradeLink({ href, seatLimit }: { href: string; seatLimit: number }) {
  const external = /^https?:/i.test(href);

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => trackClient("upgrade_clicked", { seat_limit: seatLimit })}
      className="font-medium underline"
    >
      Join the waitlist
    </a>
  );
}
