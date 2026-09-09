"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { startTimer, stopTimer, type TimerState } from "../time/actions";
import { formatClock } from "@/lib/calc";

type Props = {
  jobs: Array<{ id: string; name: string }>;
  running: { id: string; jobId: string; jobName: string; startedAt: string } | null;
  defaultJobId: string;
};

const initial: TimerState = {};

function elapsedSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export function Timer({ jobs, running, defaultJobId }: Props) {
  const [startState, startAction, startPending] = useActionState(startTimer, initial);
  const [stopState, stopAction, stopPending] = useActionState(stopTimer, initial);
  const [elapsed, setElapsed] = useState(() => (running ? elapsedSince(running.startedAt) : 0));

  const startedAt = running?.startedAt ?? null;
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(elapsedSince(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const error = startState.error ?? stopState.error;
  const pending = startPending || stopPending;

  return (
    <section className="card flex flex-col items-center gap-5 py-8 text-center">
      {running ? (
        <>
          <p className="text-sm text-stone-500">Tracking</p>
          <p className="max-w-full truncate text-lg font-semibold">{running.jobName}</p>
          <p className="font-mono text-6xl tabular-nums text-emerald-800" suppressHydrationWarning>
            {formatClock(elapsed)}
          </p>
          <form action={stopAction} className="w-full max-w-xs">
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-red-600 py-5 text-2xl font-bold tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              STOP
            </button>
          </form>
        </>
      ) : (
        <form action={startAction} className="flex w-full max-w-xs flex-col items-center gap-5">
          {jobs.length ? (
            <select
              name="job_id"
              aria-label="Job"
              defaultValue={defaultJobId}
              required
              className="input text-center text-base font-medium"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-stone-600">
              <Link href="/jobs/new" className="text-emerald-800 hover:underline">Create a job</Link> to start tracking.
            </p>
          )}
          <p className="font-mono text-6xl tabular-nums text-stone-300">0:00:00</p>
          <button
            type="submit"
            disabled={pending || jobs.length === 0}
            className="w-full rounded-2xl bg-emerald-700 py-5 text-2xl font-bold tracking-wide text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            START
          </button>
        </form>
      )}
      {error && <p className="error w-full max-w-xs">{error}</p>}
    </section>
  );
}
