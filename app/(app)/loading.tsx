export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-stone-200" />
        <div className="h-4 w-56 rounded bg-stone-200" />
      </div>
      <div className="card space-y-3">
        <div className="h-4 w-1/2 rounded bg-stone-200" />
        <div className="h-4 w-2/3 rounded bg-stone-200" />
        <div className="h-4 w-1/3 rounded bg-stone-200" />
      </div>
      <div className="card space-y-3">
        <div className="h-4 w-3/5 rounded bg-stone-200" />
        <div className="h-4 w-2/5 rounded bg-stone-200" />
      </div>
    </div>
  );
}
