"use client";

/**
 * Beta feedback link (SPEC §14, sprint 7). Opens the user's mail client with a
 * prefilled subject; hidden when no support address is configured.
 */
export function FeedbackLink({ email, className = "" }: { email: string; className?: string }) {
  const href = `mailto:${email}?subject=${encodeURIComponent("WorkWorth feedback")}&body=${encodeURIComponent(
    "What happened (or what would help):\n\n\n— Sent from WorkWorth",
  )}`;

  return (
    <a href={href} className={className}>
      Send feedback
    </a>
  );
}
