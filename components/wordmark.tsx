import { LogoMark } from "./logo";

// Stacked (auth screens, big mark) or inline (app chrome, small mark).
export function Wordmark({ stacked = false }: { stacked?: boolean }) {
  if (stacked) {
    return (
      <div className="flex flex-col items-center text-ink-900">
        <LogoMark className="h-24 w-24" />
        <p className="mt-3 font-display text-3xl font-semibold tracking-tight">WorkWorth</p>
      </div>
    );
  }
  return (
    <span className="flex items-center gap-2 text-ink-900">
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="font-display text-xl font-semibold tracking-tight">WorkWorth</span>
    </span>
  );
}
