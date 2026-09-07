"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link:", text);
        }
      }}
      className="rounded-md border border-stone-300 bg-white px-2 py-1 font-medium text-stone-700 hover:bg-stone-100"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
