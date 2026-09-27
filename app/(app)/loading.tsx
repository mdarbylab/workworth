export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-40 rounded bg-slate-200" />
          <span aria-hidden className="h-2 w-2 rounded-full bg-apple" />
        </div>
        <div className="h-4 w-56 rounded bg-slate-200" />
      </div>
      <div className="card space-y-3">
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-200" />
      </div>
      <div className="card space-y-3">
        <div className="h-4 w-3/5 rounded bg-slate-200" />
        <div className="h-4 w-2/5 rounded bg-slate-200" />
      </div>
    </div>
  );
}
